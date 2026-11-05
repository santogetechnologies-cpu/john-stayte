-- Migration: 00097_fix_application_reviewer_uuid.sql
-- Description: Fix reviewer UUID parameter and variable typing in approve_gas_customer_application RPC.
-- Resolves runtime PostgreSQL error: column "reviewed_by" is of type uuid but expression is of type text.

BEGIN;

-- 1. Explicitly drop legacy function signatures (RESTRICT, does not cascade)
DROP FUNCTION IF EXISTS public.approve_gas_customer_application(
  UUID,
  TEXT,
  NUMERIC,
  BOOLEAN,
  NUMERIC,
  TEXT,
  TEXT
);

DROP FUNCTION IF EXISTS public.approve_gas_customer_application(
  UUID,
  TEXT,
  NUMERIC,
  BOOLEAN,
  NUMERIC,
  TEXT,
  UUID
);

-- 2. Create the hardened approve_gas_customer_application RPC with UUID reviewer typing
CREATE OR REPLACE FUNCTION public.approve_gas_customer_application(
  p_application_id UUID,
  p_pricing_band TEXT DEFAULT 'Standard Domestic',
  p_discount_percentage NUMERIC DEFAULT 0,
  p_credit_account_approved BOOLEAN DEFAULT FALSE,
  p_credit_limit NUMERIC DEFAULT 0,
  p_admin_notes TEXT DEFAULT NULL,
  p_reviewed_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_reviewer_id UUID;
  v_reviewer_name TEXT;
  v_app RECORD;
  v_history JSONB;
  v_history_entry JSONB;
  v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
  -- Step 1: Strict Authentication & Authorization Check
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: caller must be an authenticated user';
  END IF;

  IF NOT public.is_admin_or_manager() THEN
    RAISE EXCEPTION 'Unauthorized: Only Managers and Admins can approve gas applications';
  END IF;

  -- Step 2: Resolve and verify reviewer identity against caller
  -- auth.uid() is the sole trusted identity source.
  -- If p_reviewed_by is supplied, it MUST match auth.uid() to prevent reviewer impersonation.
  IF p_reviewed_by IS NOT NULL AND p_reviewed_by <> v_caller_id THEN
    RAISE EXCEPTION 'Unauthorized: reviewer ID must match authenticated user';
  END IF;
  v_reviewer_id := v_caller_id;

  -- Resolve reviewer display name for human-readable audit trail
  SELECT COALESCE(full_name, email, 'Administrator') INTO v_reviewer_name
  FROM public.profiles
  WHERE id = v_reviewer_id;

  IF v_reviewer_name IS NULL THEN
    v_reviewer_name := 'Administrator';
  END IF;

  -- Step 3: Fetch and lock the application row (prevents concurrent race conditions)
  SELECT * INTO v_app
  FROM public.gas_customer_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found with ID: %', p_application_id;
  END IF;

  -- Step 4: Duplicate Approval Idempotency Protection
  -- If already APPROVED with identical pricing/credit settings, return current state safely
  IF v_app.status = 'APPROVED'
     AND v_app.pricing_band IS NOT DISTINCT FROM p_pricing_band
     AND v_app.discount_percentage IS NOT DISTINCT FROM p_discount_percentage
     AND v_app.credit_account_approved IS NOT DISTINCT FROM p_credit_account_approved
     AND v_app.credit_limit IS NOT DISTINCT FROM p_credit_limit THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', 'APPROVED',
      'already_approved', true,
      'application_id', v_app.id,
      'customer_id', v_app.customer_id,
      'application_reference', v_app.application_reference,
      'pricing_band', v_app.pricing_band,
      'discount_percentage', v_app.discount_percentage,
      'credit_account_approved', v_app.credit_account_approved,
      'credit_limit', v_app.credit_limit
    );
  END IF;

  -- Step 5: Append to Decision History preserving past audits
  v_history := COALESCE(v_app.decision_history, '[]'::jsonb);
  v_history_entry := jsonb_build_object(
    'action', 'APPROVE',
    'status', 'APPROVED',
    'pricing_band', p_pricing_band,
    'discount_percentage', p_discount_percentage,
    'credit_account_approved', p_credit_account_approved,
    'credit_limit', p_credit_limit,
    'notes', COALESCE(p_admin_notes, 'Application approved by manager.'),
    'reviewed_by', v_reviewer_name,
    'reviewer_id', v_reviewer_id,
    'timestamp', v_now
  );
  v_history := v_history || jsonb_build_array(v_history_entry);

  -- Step 6: Update gas_customer_applications
  -- Both column reviewed_by and variable v_reviewer_id are typed as UUID
  UPDATE public.gas_customer_applications
  SET
    status = 'APPROVED',
    pricing_band = p_pricing_band,
    discount_percentage = p_discount_percentage,
    credit_account_approved = p_credit_account_approved,
    credit_limit = p_credit_limit,
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    reviewed_by = v_reviewer_id,
    reviewed_at = v_now,
    decision_history = v_history,
    updated_at = v_now
  WHERE id = p_application_id;

  -- Step 7: Atomically activate customer profile
  UPDATE public.profiles
  SET
    status = 'active',
    account_approved = TRUE,
    application_status = 'APPROVED',
    pricing_band = p_pricing_band,
    discount_percentage = p_discount_percentage,
    credit_account_approved = p_credit_account_approved,
    credit_limit = p_credit_limit,
    updated_at = v_now
  WHERE id = v_app.customer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer profile not found for customer ID: %', v_app.customer_id;
  END IF;

  -- Step 8: Return full approval details
  RETURN jsonb_build_object(
    'success', true,
    'status', 'APPROVED',
    'already_approved', false,
    'application_id', v_app.id,
    'customer_id', v_app.customer_id,
    'application_reference', v_app.application_reference,
    'pricing_band', p_pricing_band,
    'discount_percentage', p_discount_percentage,
    'credit_account_approved', p_credit_account_approved,
    'credit_limit', p_credit_limit
  );
END;
$$;

-- 3. Hardened Permission ACLs: Revoke public/anon access and grant strictly to authenticated
REVOKE EXECUTE ON FUNCTION public.approve_gas_customer_application(
  UUID,
  TEXT,
  NUMERIC,
  BOOLEAN,
  NUMERIC,
  TEXT,
  UUID
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.approve_gas_customer_application(
  UUID,
  TEXT,
  NUMERIC,
  BOOLEAN,
  NUMERIC,
  TEXT,
  UUID
) FROM anon;

GRANT EXECUTE ON FUNCTION public.approve_gas_customer_application(
  UUID,
  TEXT,
  NUMERIC,
  BOOLEAN,
  NUMERIC,
  TEXT,
  UUID
) TO authenticated;

-- 4. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
