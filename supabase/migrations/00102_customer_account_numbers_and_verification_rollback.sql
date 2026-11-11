-- ====================================================================
-- ROLLBACK MIGRATION FOR 00102: CUSTOMER ACCOUNT NUMBER MANAGEMENT
-- Migration: 00102_customer_account_numbers_and_verification_rollback.sql
-- ====================================================================

-- 1. DROP GENERATE CUSTOMER ACCOUNT NUMBER FUNCTION
DROP FUNCTION IF EXISTS public.generate_customer_account_number(TEXT);

-- 2. EXPLICITLY DROP 00102 APPROVAL FUNCTION AND RESTORE 00097 SIGNATURE
DROP FUNCTION IF EXISTS public.approve_gas_customer_application(
  UUID,
  TEXT,
  NUMERIC,
  BOOLEAN,
  NUMERIC,
  TEXT,
  UUID,
  TEXT
);

DROP FUNCTION IF EXISTS public.approve_gas_customer_application(
  UUID,
  TEXT,
  NUMERIC,
  BOOLEAN,
  NUMERIC,
  TEXT,
  TEXT,
  TEXT
);

-- RESTORE approve_gas_customer_application TO 00097 SIGNATURE (UUID REVIEWER TYPING)
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

  -- Step 3: Fetch and lock the application row
  SELECT * INTO v_app
  FROM public.gas_customer_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found with ID: %', p_application_id;
  END IF;

  -- Step 4: Duplicate Approval Idempotency Protection
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

  -- Step 5: Append to Decision History
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

REVOKE ALL ON FUNCTION public.approve_gas_customer_application(UUID, TEXT, NUMERIC, BOOLEAN, NUMERIC, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_gas_customer_application(UUID, TEXT, NUMERIC, BOOLEAN, NUMERIC, TEXT, UUID) TO authenticated;

-- 3. RESTORE protect_profile_approval_fields TO 00095 DEFINITION
CREATE OR REPLACE FUNCTION public.protect_profile_approval_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.is_admin_or_manager() THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Unauthorized: cannot modify role';
  END IF;

  IF NEW.account_approved IS DISTINCT FROM OLD.account_approved THEN
    RAISE EXCEPTION 'Unauthorized: customers cannot self-modify account_approved status';
  END IF;

  IF NEW.pricing_band IS DISTINCT FROM OLD.pricing_band THEN
    RAISE EXCEPTION 'Unauthorized: customers cannot self-modify pricing_band';
  END IF;

  IF NEW.discount_percentage IS DISTINCT FROM OLD.discount_percentage THEN
    RAISE EXCEPTION 'Unauthorized: customers cannot self-modify discount_percentage';
  END IF;

  IF NEW.credit_account_approved IS DISTINCT FROM OLD.credit_account_approved THEN
    RAISE EXCEPTION 'Unauthorized: customers cannot self-modify credit_account_approved';
  END IF;

  IF NEW.credit_limit IS DISTINCT FROM OLD.credit_limit THEN
    RAISE EXCEPTION 'Unauthorized: customers cannot self-modify credit_limit';
  END IF;

  IF NEW.application_status IS DISTINCT FROM OLD.application_status THEN
    RAISE EXCEPTION 'Unauthorized: customers cannot self-modify application_status';
  END IF;

  RETURN NEW;
END;
$$;

-- 4. DROP TRIGGER AND SYNC FUNCTION
DROP TRIGGER IF EXISTS trg_sync_profile_account_number ON public.profiles;
DROP FUNCTION IF EXISTS public.sync_profile_account_number();

-- 5. DROP INDEXES
DROP INDEX IF EXISTS public.idx_profiles_customer_code_unique;
DROP INDEX IF EXISTS public.idx_profiles_account_number_unique;
DROP INDEX IF EXISTS public.idx_profiles_account_number;
DROP INDEX IF EXISTS public.idx_orders_customer_account_number;
DROP INDEX IF EXISTS public.idx_gas_apps_customer_code;
DROP INDEX IF EXISTS public.idx_gas_apps_account_number;

-- 6. DROP ADDED COLUMNS (PRESERVING customer_code FROM 00098)
ALTER TABLE public.orders DROP COLUMN IF EXISTS customer_account_number;
ALTER TABLE public.gas_customer_applications
  DROP COLUMN IF EXISTS account_number,
  DROP COLUMN IF EXISTS is_existing_customer,
  DROP COLUMN IF EXISTS account_lookup_requested;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS account_number;
