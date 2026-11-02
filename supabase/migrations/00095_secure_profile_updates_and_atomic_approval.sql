-- ====================================================================
-- JOHN STAYTE SERVICES - PHASE 1 HARDENING & ATOMIC WORKFLOW
-- Migration: 00095_secure_profile_updates_and_atomic_approval.sql
-- ====================================================================

-- 1. HARDEN PROFILES: PREVENT CUSTOMERS FROM SELF-APPROVING OR ASSIGNING PRICING/CREDIT
-- Create a strict before-update trigger function that guarantees customers cannot alter
-- approval-related columns even if they construct direct API requests.
CREATE OR REPLACE FUNCTION public.protect_profile_approval_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- If executed by an authorized manager or administrator, allow changes
  IF public.is_admin_or_manager() THEN
    RETURN NEW;
  END IF;

  -- Disallow regular customers from altering restricted fields
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_approval_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_approval_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_approval_fields();

-- 2. HARDEN PROFILES RLS UPDATE POLICY
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin_or_manager())
  WITH CHECK (
    public.is_admin_or_manager() OR (
      auth.uid() = id
      AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
      AND account_approved = (SELECT COALESCE(p.account_approved, FALSE) FROM public.profiles p WHERE p.id = auth.uid())
      AND pricing_band IS NOT DISTINCT FROM (SELECT p.pricing_band FROM public.profiles p WHERE p.id = auth.uid())
      AND discount_percentage IS NOT DISTINCT FROM (SELECT p.discount_percentage FROM public.profiles p WHERE p.id = auth.uid())
      AND credit_account_approved IS NOT DISTINCT FROM (SELECT p.credit_account_approved FROM public.profiles p WHERE p.id = auth.uid())
      AND credit_limit IS NOT DISTINCT FROM (SELECT p.credit_limit FROM public.profiles p WHERE p.id = auth.uid())
      AND application_status IS NOT DISTINCT FROM (SELECT p.application_status FROM public.profiles p WHERE p.id = auth.uid())
    )
  );

-- 3. HARDEN GAS CUSTOMER APPLICATIONS: PREVENT CUSTOMERS FROM INJECTING APPROVAL OR DISCOUNTS
CREATE OR REPLACE FUNCTION public.protect_application_approval_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF public.is_admin_or_manager() THEN
    RETURN NEW;
  END IF;

  -- Customers cannot self-approve or assign discounts/credit on the application record
  IF NEW.status = 'APPROVED' THEN
    RAISE EXCEPTION 'Unauthorized: customers cannot self-approve applications';
  END IF;

  IF NEW.pricing_band IS DISTINCT FROM OLD.pricing_band THEN
    RAISE EXCEPTION 'Unauthorized: customers cannot set pricing_band';
  END IF;

  IF NEW.discount_percentage IS DISTINCT FROM OLD.discount_percentage THEN
    RAISE EXCEPTION 'Unauthorized: customers cannot set discount_percentage';
  END IF;

  IF NEW.credit_account_approved IS DISTINCT FROM OLD.credit_account_approved THEN
    RAISE EXCEPTION 'Unauthorized: customers cannot set credit_account_approved';
  END IF;

  IF NEW.credit_limit IS DISTINCT FROM OLD.credit_limit THEN
    RAISE EXCEPTION 'Unauthorized: customers cannot set credit_limit';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_application_approval_fields ON public.gas_customer_applications;
CREATE TRIGGER trg_protect_application_approval_fields
  BEFORE UPDATE ON public.gas_customer_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_application_approval_fields();

-- 4. ATOMIC MANAGER APPROVAL TRANSACTION (RPC)
-- Securely executes all application approval and customer profile activation steps in a single atomic transaction.
-- If any part fails (missing profile, invalid constraint, etc.), PostgreSQL automatically rolls back the entire transaction.
CREATE OR REPLACE FUNCTION public.approve_gas_customer_application(
  p_application_id UUID,
  p_pricing_band TEXT DEFAULT 'Standard Domestic',
  p_discount_percentage NUMERIC DEFAULT 0,
  p_credit_account_approved BOOLEAN DEFAULT FALSE,
  p_credit_limit NUMERIC DEFAULT 0,
  p_admin_notes TEXT DEFAULT NULL,
  p_reviewed_by TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_app RECORD;
  v_history JSONB;
  v_history_entry JSONB;
  v_now TIMESTAMPTZ := clock_timestamp();
  v_reviewer TEXT;
BEGIN
  -- Step 1: Authorization Check: Caller MUST be an authorized Manager or Admin
  v_caller_id := auth.uid();
  IF NOT public.is_admin_or_manager() THEN
    RAISE EXCEPTION 'Unauthorized: Only Managers and Admins can approve gas applications';
  END IF;

  -- Step 2: Fetch and lock the application row (prevents concurrent race conditions)
  SELECT * INTO v_app
  FROM public.gas_customer_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found with ID: %', p_application_id;
  END IF;

  -- Step 3: Duplicate Approval Idempotency Protection
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

  -- Step 4: Resolve Reviewer Identity
  v_reviewer := COALESCE(
    p_reviewed_by,
    (SELECT email FROM public.profiles WHERE id = v_caller_id),
    'Manager'
  );

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
    'reviewed_by', v_reviewer,
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
    reviewed_by = v_reviewer,
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

GRANT EXECUTE ON FUNCTION public.approve_gas_customer_application TO authenticated;

-- 5. Record migration in schema_migrations
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('00095', 'secure_profile_updates_and_atomic_approval')
ON CONFLICT (version) DO NOTHING;


