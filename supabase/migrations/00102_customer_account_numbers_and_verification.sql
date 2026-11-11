-- ====================================================================
-- JOHN STAYTE SERVICES - CUSTOMER ACCOUNT NUMBER MANAGEMENT & VERIFICATION
-- Migration: 00102_customer_account_numbers_and_verification.sql
-- ====================================================================

-- 1. ADD / SYNC ACCOUNT NUMBER COLUMNS ACROSS RELEVANT TABLES
-- Profiles: Customer code was added in 00098. Add account_number alias and uniqueness.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_number TEXT;

-- Gas Applications: Add account_number, is_existing_customer, and account_lookup_requested
ALTER TABLE public.gas_customer_applications
  ADD COLUMN IF NOT EXISTS account_number TEXT,
  ADD COLUMN IF NOT EXISTS is_existing_customer BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS account_lookup_requested BOOLEAN DEFAULT FALSE;

-- Orders: Add customer_account_number
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_account_number TEXT;

-- 2. CREATE UNIQUE CASE-INSENSITIVE INDEXES FOR ACCOUNT NUMBERS
-- Guarantees permanent uniqueness per customer across the system.
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_customer_code_unique
  ON public.profiles (LOWER(TRIM(customer_code)))
  WHERE customer_code IS NOT NULL AND customer_code <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_account_number_unique
  ON public.profiles (LOWER(TRIM(account_number)))
  WHERE account_number IS NOT NULL AND account_number <> '';

CREATE INDEX IF NOT EXISTS idx_orders_customer_account_number
  ON public.orders (customer_account_number)
  WHERE customer_account_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gas_apps_customer_code
  ON public.gas_customer_applications (customer_code)
  WHERE customer_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gas_apps_account_number
  ON public.gas_customer_applications (account_number)
  WHERE account_number IS NOT NULL;

-- 3. BIDIRECTIONAL SYNC TRIGGER: RELIABLE SYNCHRONIZATION OF customer_code AND account_number
CREATE OR REPLACE FUNCTION public.sync_profile_account_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_norm_code TEXT;
  v_norm_acc TEXT;
  v_code_changed BOOLEAN;
  v_acc_changed BOOLEAN;
BEGIN
  -- 1. On INSERT
  IF TG_OP = 'INSERT' THEN
    v_norm_code := NULLIF(UPPER(TRIM(NEW.customer_code)), '');
    v_norm_acc := NULLIF(UPPER(TRIM(NEW.account_number)), '');

    IF v_norm_code IS NOT NULL AND v_norm_acc IS NOT NULL THEN
      IF v_norm_code <> v_norm_acc THEN
        RAISE EXCEPTION 'Conflicting identifiers on insert: customer_code (%) does not match account_number (%)', v_norm_code, v_norm_acc;
      END IF;
      NEW.customer_code := v_norm_code;
      NEW.account_number := v_norm_acc;
    ELSIF v_norm_code IS NOT NULL THEN
      NEW.customer_code := v_norm_code;
      NEW.account_number := v_norm_code;
    ELSIF v_norm_acc IS NOT NULL THEN
      NEW.customer_code := v_norm_acc;
      NEW.account_number := v_norm_acc;
    ELSE
      NEW.customer_code := NULL;
      NEW.account_number := NULL;
    END IF;

    RETURN NEW;
  END IF;

  -- 2. On UPDATE
  IF TG_OP = 'UPDATE' THEN
    v_norm_code := NULLIF(UPPER(TRIM(NEW.customer_code)), '');
    v_norm_acc := NULLIF(UPPER(TRIM(NEW.account_number)), '');

    v_code_changed := (NEW.customer_code IS DISTINCT FROM OLD.customer_code);
    v_acc_changed := (NEW.account_number IS DISTINCT FROM OLD.account_number);

    -- If neither changed, preserve existing values
    IF NOT v_code_changed AND NOT v_acc_changed THEN
      RETURN NEW;
    END IF;

    -- If both were explicitly changed in this UPDATE statement
    IF v_code_changed AND v_acc_changed THEN
      IF v_norm_code IS NOT NULL AND v_norm_acc IS NOT NULL THEN
        IF v_norm_code <> v_norm_acc THEN
          RAISE EXCEPTION 'Conflicting identifiers in update: customer_code (%) does not match account_number (%)', v_norm_code, v_norm_acc;
        END IF;
        NEW.customer_code := v_norm_code;
        NEW.account_number := v_norm_acc;
      ELSIF v_norm_code IS NULL AND v_norm_acc IS NULL THEN
        NEW.customer_code := NULL;
        NEW.account_number := NULL;
      ELSE
        RAISE EXCEPTION 'Conflicting identifiers in update: one field was cleared while the other was populated';
      END IF;
      RETURN NEW;
    END IF;

    -- If only customer_code changed: synchronize account_number
    IF v_code_changed AND NOT v_acc_changed THEN
      IF v_norm_code IS NOT NULL THEN
        NEW.customer_code := v_norm_code;
        NEW.account_number := v_norm_code;
      ELSE
        NEW.customer_code := NULL;
        NEW.account_number := NULL;
      END IF;
      RETURN NEW;
    END IF;

    -- If only account_number changed: synchronize customer_code (never revert to OLD customer_code)
    IF v_acc_changed AND NOT v_code_changed THEN
      IF v_norm_acc IS NOT NULL THEN
        NEW.account_number := v_norm_acc;
        NEW.customer_code := v_norm_acc;
      ELSE
        NEW.account_number := NULL;
        NEW.customer_code := NULL;
      END IF;
      RETURN NEW;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_account_number ON public.profiles;
CREATE TRIGGER trg_sync_profile_account_number
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_account_number();

-- 4. HARDEN PROFILE TRIGGER: UNCONDITIONALLY PREVENT CUSTOMERS FROM SELF-ASSIGNING OR TAMPERING WITH ACCOUNT NUMBERS
-- Replaces protect_profile_approval_fields to include complete customer_code / account_number protection
CREATE OR REPLACE FUNCTION public.protect_profile_approval_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- If executed by an authorized manager or administrator, allow changes
  IF public.is_admin_or_manager() THEN
    RETURN NEW;
  END IF;

  -- Disallow regular customers from altering role
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Unauthorized: cannot modify role';
  END IF;

  -- Disallow regular customers from altering account approval
  IF NEW.account_approved IS DISTINCT FROM OLD.account_approved THEN
    RAISE EXCEPTION 'Unauthorized: customers cannot self-modify account_approved status';
  END IF;

  -- Disallow regular customers from altering pricing band
  IF NEW.pricing_band IS DISTINCT FROM OLD.pricing_band THEN
    RAISE EXCEPTION 'Unauthorized: customers cannot self-modify pricing_band';
  END IF;

  -- Disallow regular customers from altering discount percentage
  IF NEW.discount_percentage IS DISTINCT FROM OLD.discount_percentage THEN
    RAISE EXCEPTION 'Unauthorized: customers cannot self-modify discount_percentage';
  END IF;

  -- Disallow regular customers from altering credit status
  IF NEW.credit_account_approved IS DISTINCT FROM OLD.credit_account_approved THEN
    RAISE EXCEPTION 'Unauthorized: customers cannot self-modify credit_account_approved';
  END IF;

  -- Disallow regular customers from altering credit limit
  IF NEW.credit_limit IS DISTINCT FROM OLD.credit_limit THEN
    RAISE EXCEPTION 'Unauthorized: customers cannot self-modify credit_limit';
  END IF;

  -- Disallow regular customers from altering application status
  IF NEW.application_status IS DISTINCT FROM OLD.application_status THEN
    RAISE EXCEPTION 'Unauthorized: customers cannot self-modify application_status';
  END IF;

  -- Disallow regular customers from assigning or modifying customer account numbers
  -- Applies unconditionally, including when OLD.customer_code or OLD.account_number is NULL
  IF NEW.customer_code IS DISTINCT FROM OLD.customer_code THEN
    RAISE EXCEPTION 'Unauthorized: customers cannot assign or modify customer code';
  END IF;

  IF NEW.account_number IS DISTINCT FROM OLD.account_number THEN
    RAISE EXCEPTION 'Unauthorized: customers cannot assign or modify account number';
  END IF;

  RETURN NEW;
END;
$$;

-- 5. CONCURRENCY-SAFE DATABASE-SIDE ACCOUNT NUMBER GENERATION FUNCTION
CREATE OR REPLACE FUNCTION public.generate_customer_account_number(
  p_full_name TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_first TEXT;
  v_last TEXT;
  v_prefix TEXT;
  v_clean_name TEXT;
  v_seq INTEGER := 1;
  v_candidate TEXT;
  v_collision BOOLEAN;
  v_lock_key BIGINT;
BEGIN
  -- Authorization check: Caller MUST be an authorized Manager or Admin
  IF NOT public.is_admin_or_manager() THEN
    RAISE EXCEPTION 'Unauthorized: Only Managers and Admins can generate customer account numbers';
  END IF;

  v_clean_name := TRIM(regexp_replace(COALESCE(p_full_name, 'CUSTOMER'), '[^a-zA-Z\s]', '', 'g'));
  IF v_clean_name = '' THEN
    v_clean_name := 'CUSTOMER';
  END IF;

  -- Derive prefix matching John Stayte client invoice formats (e.g. Louise Taylor -> LTAY, Brett Norman -> BNOR)
  IF position(' ' in v_clean_name) > 0 THEN
    v_first := split_part(v_clean_name, ' ', 1);
    v_last := split_part(v_clean_name, ' ', array_length(string_to_array(v_clean_name, ' '), 1));
    v_prefix := UPPER(SUBSTRING(v_first FROM 1 FOR 1) || SUBSTRING(v_last FROM 1 FOR 3));
  ELSE
    v_prefix := UPPER(SUBSTRING(v_clean_name FROM 1 FOR 4));
  END IF;

  -- Ensure prefix is at least 4 characters
  WHILE length(v_prefix) < 4 LOOP
    v_prefix := v_prefix || 'X';
  END LOOP;

  -- Concurrency control: acquire advisory transaction lock based on prefix hash
  -- Serializes generation for the same prefix, preventing race conditions between concurrent approvals
  v_lock_key := ('x' || substr(md5('account_number_prefix_' || v_prefix), 1, 8))::bit(32)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Allocate next available sequence
  v_seq := 1;
  LOOP
    v_candidate := v_prefix || LPAD(v_seq::TEXT, 2, '0');

    -- Check if candidate exists in profiles or applications
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE LOWER(TRIM(customer_code)) = LOWER(v_candidate)
         OR LOWER(TRIM(account_number)) = LOWER(v_candidate)
      UNION ALL
      SELECT 1 FROM public.gas_customer_applications
      WHERE LOWER(TRIM(customer_code)) = LOWER(v_candidate)
         OR LOWER(TRIM(account_number)) = LOWER(v_candidate)
    ) INTO v_collision;

    IF NOT v_collision THEN
      EXIT;
    END IF;

    v_seq := v_seq + 1;
    IF v_seq > 99 THEN
      v_candidate := v_prefix || v_seq::TEXT;
      SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE LOWER(TRIM(customer_code)) = LOWER(v_candidate)
           OR LOWER(TRIM(account_number)) = LOWER(v_candidate)
        UNION ALL
        SELECT 1 FROM public.gas_customer_applications
        WHERE LOWER(TRIM(customer_code)) = LOWER(v_candidate)
           OR LOWER(TRIM(account_number)) = LOWER(v_candidate)
      ) INTO v_collision;

      IF NOT v_collision THEN
        EXIT;
      END IF;
    END IF;
  END LOOP;

  RETURN v_candidate;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_customer_account_number(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_customer_account_number(TEXT) TO authenticated;

-- 6. EXPLICITLY DROP OBSOLETE APPROVAL FUNCTION SIGNATURES TO PREVENT AMBIGUOUS OVERLOADS
DROP FUNCTION IF EXISTS public.approve_gas_customer_application(
  UUID,
  TEXT,
  NUMERIC,
  BOOLEAN,
  NUMERIC,
  TEXT,
  UUID
);

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
  UUID,
  TEXT
);

-- 7. CREATE HARDENED ATOMIC APPROVAL RPC WITH UUID REVIEWER TYPING AND ACCOUNT NUMBER ASSIGNMENT
CREATE OR REPLACE FUNCTION public.approve_gas_customer_application(
  p_application_id UUID,
  p_pricing_band TEXT DEFAULT 'Standard Domestic',
  p_discount_percentage NUMERIC DEFAULT 0,
  p_credit_account_approved BOOLEAN DEFAULT FALSE,
  p_credit_limit NUMERIC DEFAULT 0,
  p_admin_notes TEXT DEFAULT NULL,
  p_reviewed_by UUID DEFAULT NULL,
  p_customer_code TEXT DEFAULT NULL
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

  -- Step 4: Resolve customer code / account number
  -- Priority 1: Manager explicitly provided code
  -- Priority 2: Existing code recorded on application
  -- Priority 3: Existing code recorded on customer profile
  -- Priority 4: Genuinely new customer auto-generated via concurrency-safe sequence
  v_assigned_code := NULLIF(UPPER(TRIM(COALESCE(
    p_customer_code,
    v_app.customer_code,
    v_app.account_number,
    (SELECT customer_code FROM public.profiles WHERE id = v_app.customer_id)
  ))), '');

  IF v_assigned_code IS NULL THEN
    v_assigned_code := public.generate_customer_account_number(v_app.full_name);
  END IF;

  -- Verify uniqueness against other customer profiles
  IF v_assigned_code IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id <> v_app.customer_id
        AND (LOWER(TRIM(customer_code)) = LOWER(v_assigned_code) OR LOWER(TRIM(account_number)) = LOWER(v_assigned_code))
    ) THEN
      RAISE EXCEPTION 'Account number % is already assigned to another customer profile', v_assigned_code;
    END IF;
  END IF;

  -- Step 5: Duplicate Approval Idempotency Protection
  -- If already APPROVED with identical pricing/credit settings and assigned code, return current state safely
  IF v_app.status = 'APPROVED'
     AND v_app.pricing_band IS NOT DISTINCT FROM p_pricing_band
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
      'discount_percentage', v_app.discount_percentage,
      'credit_account_approved', v_app.credit_account_approved,
      'credit_limit', v_app.credit_limit,
      'account_number', v_assigned_code
    );
  END IF;

  -- Step 6: Append to Decision History preserving past audits
  v_history := COALESCE(v_app.decision_history, '[]'::jsonb);
  v_history_entry := jsonb_build_object(
    'action', 'APPROVE',
    'status', 'APPROVED',
    'pricing_band', p_pricing_band,
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

  -- Step 7: Update gas_customer_applications
  -- Both column reviewed_by and variable v_reviewer_id are typed as UUID
  UPDATE public.gas_customer_applications
  SET
    status = 'APPROVED',
    pricing_band = p_pricing_band,
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

  -- Step 8: Atomically activate customer profile
  UPDATE public.profiles
  SET
    status = 'active',
    account_approved = TRUE,
    application_status = 'APPROVED',
    pricing_band = p_pricing_band,
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

  -- Step 9: Return full approval details
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
    'credit_limit', p_credit_limit,
    'account_number', v_assigned_code
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_gas_customer_application(UUID, TEXT, NUMERIC, BOOLEAN, NUMERIC, TEXT, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_gas_customer_application(UUID, TEXT, NUMERIC, BOOLEAN, NUMERIC, TEXT, UUID, TEXT) TO authenticated;
