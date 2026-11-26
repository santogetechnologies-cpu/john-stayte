-- ====================================================================
-- JOHN STAYTE SERVICES - PERSIST PRICING_BAND_ID IN APPLICATION APPROVAL
-- Migration: 00105_persist_pricing_band_id_in_approval.sql
-- Forward-only migration (held for user approval before production apply):
--   Adds optional p_pricing_band_id TEXT parameter to
--   public.approve_gas_customer_application so pricing_band_id is
--   atomically persisted on both gas_customer_applications and profiles.
-- ====================================================================

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
  UUID,
  TEXT,
  TEXT
);

CREATE OR REPLACE FUNCTION public.approve_gas_customer_application(
  p_application_id UUID,
  p_pricing_band TEXT DEFAULT 'Standard Domestic',
  p_discount_percentage NUMERIC DEFAULT 0,
  p_credit_account_approved BOOLEAN DEFAULT FALSE,
  p_credit_limit NUMERIC DEFAULT 0,
  p_admin_notes TEXT DEFAULT NULL,
  p_reviewed_by UUID DEFAULT NULL,
  p_customer_code TEXT DEFAULT NULL,
  p_pricing_band_id TEXT DEFAULT NULL
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
  v_assigned_code TEXT;
  v_resolved_band_id TEXT;
BEGIN
  -- Step 1: Strict Authentication & Authorization Check
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: caller must be an authenticated user';
  END IF;

  IF NOT public.is_admin_or_manager() THEN
    RAISE EXCEPTION 'Unauthorized: Only Managers and Admins can approve gas applications';
  END IF;

  -- Step 2: Resolve and verify reviewer identity against authenticated caller
  IF p_reviewed_by IS NOT NULL AND p_reviewed_by <> v_caller_id THEN
    RAISE EXCEPTION 'Unauthorized: reviewer ID must match authenticated user';
  END IF;
  v_reviewer_id := v_caller_id;

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

  -- Step 4: Resolve customer code / account number
  v_assigned_code := NULLIF(UPPER(TRIM(COALESCE(
    p_customer_code,
    v_app.customer_code,
    v_app.account_number,
    (SELECT customer_code FROM public.profiles WHERE id = v_app.customer_id)
  ))), '');

  IF v_assigned_code IS NULL THEN
    v_assigned_code := public.generate_customer_account_number(v_app.full_name);
  END IF;

  IF v_assigned_code IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id <> v_app.customer_id
        AND (LOWER(TRIM(customer_code)) = LOWER(v_assigned_code) OR LOWER(TRIM(account_number)) = LOWER(v_assigned_code))
    ) THEN
      RAISE EXCEPTION 'Account number % is already assigned to another customer profile', v_assigned_code;
    END IF;
  END IF;

  -- Step 5: Resolve pricing_band_id (explicit parameter or lookup in gas_pricing_bands)
  v_resolved_band_id := NULLIF(TRIM(COALESCE(p_pricing_band_id, '')), '');
  IF v_resolved_band_id IS NULL AND p_pricing_band IS NOT NULL THEN
    SELECT id INTO v_resolved_band_id
    FROM public.gas_pricing_bands
    WHERE is_active = TRUE
      AND (
        LOWER(id) = LOWER(TRIM(p_pricing_band))
        OR LOWER(customer_category) = LOWER(TRIM(p_pricing_band))
        OR LOWER(band_number) = LOWER(TRIM(p_pricing_band))
      )
    ORDER BY CASE WHEN location_code = 'WESTON' THEN 0 ELSE 1 END
    LIMIT 1;
  END IF;

  -- Step 6: Duplicate Approval Idempotency Protection
  IF v_app.status = 'APPROVED'
     AND v_app.pricing_band IS NOT DISTINCT FROM p_pricing_band
     AND v_app.pricing_band_id IS NOT DISTINCT FROM COALESCE(v_resolved_band_id, v_app.pricing_band_id)
     AND v_app.discount_percentage IS NOT DISTINCT FROM p_discount_percentage
     AND v_app.credit_account_approved IS NOT DISTINCT FROM p_credit_account_approved
     AND v_app.credit_limit IS NOT DISTINCT FROM p_credit_limit
     AND v_app.customer_code IS NOT DISTINCT FROM v_assigned_code THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', 'APPROVED',
      'already_approved', true,
      'application_id', v_app.id,
      'customer_id', v_app.customer_id,
      'application_reference', v_app.application_reference,
      'pricing_band', v_app.pricing_band,
      'pricing_band_id', v_app.pricing_band_id,
      'discount_percentage', v_app.discount_percentage,
      'credit_account_approved', v_app.credit_account_approved,
      'credit_limit', v_app.credit_limit,
      'account_number', v_assigned_code
    );
  END IF;

  -- Step 7: Append to Decision History
  v_history := COALESCE(v_app.decision_history, '[]'::jsonb);
  v_history_entry := jsonb_build_object(
    'action', 'APPROVE',
    'status', 'APPROVED',
    'pricing_band', p_pricing_band,
    'pricing_band_id', v_resolved_band_id,
    'discount_percentage', p_discount_percentage,
    'credit_account_approved', p_credit_account_approved,
    'credit_limit', p_credit_limit,
    'account_number', v_assigned_code,
    'notes', COALESCE(p_admin_notes, 'Application approved by manager.'),
    'reviewed_by', v_reviewer_name,
    'reviewer_id', v_reviewer_id,
    'timestamp', v_now
  );
  v_history := v_history || jsonb_build_array(v_history_entry);

  -- Step 8: Update gas_customer_applications
  UPDATE public.gas_customer_applications
  SET
    status = 'APPROVED',
    pricing_band = p_pricing_band,
    pricing_band_id = COALESCE(v_resolved_band_id, pricing_band_id),
    discount_percentage = p_discount_percentage,
    credit_account_approved = p_credit_account_approved,
    credit_limit = p_credit_limit,
    customer_code = v_assigned_code,
    account_number = v_assigned_code,
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    reviewed_by = v_reviewer_id,
    reviewed_at = v_now,
    decision_history = v_history,
    updated_at = v_now
  WHERE id = p_application_id;

  -- Step 9: Atomically activate customer profile
  UPDATE public.profiles
  SET
    status = 'active',
    account_approved = TRUE,
    application_status = 'APPROVED',
    pricing_band = p_pricing_band,
    pricing_band_id = COALESCE(v_resolved_band_id, pricing_band_id),
    discount_percentage = p_discount_percentage,
    credit_account_approved = p_credit_account_approved,
    credit_limit = p_credit_limit,
    customer_code = v_assigned_code,
    account_number = v_assigned_code,
    updated_at = v_now
  WHERE id = v_app.customer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer profile not found for customer ID: %', v_app.customer_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'APPROVED',
    'already_approved', false,
    'application_id', v_app.id,
    'customer_id', v_app.customer_id,
    'application_reference', v_app.application_reference,
    'pricing_band', p_pricing_band,
    'pricing_band_id', v_resolved_band_id,
    'discount_percentage', p_discount_percentage,
    'credit_account_approved', p_credit_account_approved,
    'credit_limit', p_credit_limit,
    'account_number', v_assigned_code
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_gas_customer_application(UUID, TEXT, NUMERIC, BOOLEAN, NUMERIC, TEXT, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_gas_customer_application(UUID, TEXT, NUMERIC, BOOLEAN, NUMERIC, TEXT, UUID, TEXT, TEXT) TO authenticated;
