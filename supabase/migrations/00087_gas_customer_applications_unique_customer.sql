-- ====================================================================
-- JOHN STAYTE SERVICES - GAS CUSTOMER APPLICATIONS UNIQUE CONSTRAINT
-- Migration: 00087_gas_customer_applications_unique_customer.sql
-- ====================================================================

-- 1. Deduplicate any existing duplicate records safely before applying constraint
-- In case multiple applications exist for a customer, keep the most recently updated one.
DELETE FROM public.gas_customer_applications a
USING public.gas_customer_applications b
WHERE a.customer_id = b.customer_id
  AND a.id <> b.id
  AND a.updated_at < b.updated_at;

-- 2. Drop redundant non-unique index if present
DROP INDEX IF EXISTS public.idx_gas_customer_apps_customer;

-- 3. Add UNIQUE constraint on customer_id so ON CONFLICT (customer_id) works in PostgREST
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'gas_customer_applications_customer_id_key'
      AND conrelid = 'public.gas_customer_applications'::regclass
  ) THEN
    ALTER TABLE public.gas_customer_applications
      ADD CONSTRAINT gas_customer_applications_customer_id_key UNIQUE (customer_id);
  END IF;
END $$;

-- 4. Enhance trigger to allow service_role key operations alongside admin/manager & authenticated users
CREATE OR REPLACE FUNCTION public.enforce_gas_application_verified_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_is_verified BOOLEAN := FALSE;
  v_user_id UUID;
  v_clean_email TEXT;
BEGIN
  -- Service role bypass for backend/system automated tasks
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  v_user_id := auth.uid();
  v_clean_email := LOWER(TRIM(NEW.email));

  -- Admins and Managers can insert/manage applications
  IF v_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = v_user_id
    AND profiles.role IN ('admin', 'manager')
  ) THEN
    RETURN NEW;
  END IF;

  -- Verify authenticated ownership
  IF v_user_id IS NULL OR NEW.customer_id != v_user_id THEN
    RAISE EXCEPTION 'Customer ID must match authenticated user.';
  END IF;

  -- Check if submitted email matches verified record in email_verifications for this user
  SELECT EXISTS (
    SELECT 1 FROM public.email_verifications
    WHERE user_id = v_user_id
    AND LOWER(email) = v_clean_email
    AND verified_at IS NOT NULL
    AND expires_at > NOW()
  ) INTO v_is_verified;

  -- Also allow if the user's primary auth email is confirmed and matches
  IF NOT v_is_verified THEN
    SELECT EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = v_user_id
      AND LOWER(email) = v_clean_email
      AND (email_confirmed_at IS NOT NULL OR confirmed_at IS NOT NULL)
    ) INTO v_is_verified;
  END IF;

  IF NOT v_is_verified THEN
    RAISE EXCEPTION 'Email verification required: The submitted email % has not been verified with a valid OTP code.', NEW.email;
  END IF;

  RETURN NEW;
END;
$$;
