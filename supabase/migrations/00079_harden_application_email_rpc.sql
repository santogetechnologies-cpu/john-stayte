-- ====================================================================
-- JOHN STAYTE SERVICES - HARDEN APPLICATION EMAIL OTP RPC & TRIGGER
-- Migration: 00079_harden_application_email_rpc.sql
-- ====================================================================

-- 1. Secure RPC to record verified application email
-- Hardened: Ensures caller actually authenticated and confirmed this email in auth.users OR is admin/manager
CREATE OR REPLACE FUNCTION public.record_verified_application_email(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_clean_email TEXT;
  v_is_confirmed BOOLEAN := FALSE;
BEGIN
  -- 1. Check authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- 2. Validate input email format
  v_clean_email := LOWER(TRIM(p_email));
  IF v_clean_email IS NULL OR v_clean_email = '' OR POSITION('@' IN v_clean_email) = 0 THEN
    RAISE EXCEPTION 'Invalid email address.';
  END IF;

  -- 3. Authorization & Verification Proof Check:
  -- Admins and Managers can manage applications operational
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user_id AND role IN ('admin', 'manager')
  ) THEN
    v_is_confirmed := TRUE;
  ELSE
    -- Authenticated client MUST have legitimately completed Supabase Auth email OTP verification
    -- We verify that the caller's auth.users account matches the email and is confirmed
    SELECT EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = v_user_id
      AND LOWER(email) = v_clean_email
      AND (email_confirmed_at IS NOT NULL OR confirmed_at IS NOT NULL)
    ) INTO v_is_confirmed;
  END IF;

  -- 4. Reject unverified / mismatched arbitrary email attempts
  IF NOT v_is_confirmed THEN
    RAISE EXCEPTION 'Unauthorized: Email % has not been verified via Supabase Auth OTP verification.', p_email;
  END IF;

  -- 5. Insert verified record for this authenticated user
  INSERT INTO public.email_verifications (
    user_id,
    email,
    verified_at,
    expires_at,
    attempts,
    max_attempts,
    metadata
  )
  VALUES (
    v_user_id,
    v_clean_email,
    NOW(),
    NOW() + INTERVAL '2 hours',
    1,
    5,
    jsonb_build_object(
      'verified_by', 'supabase_auth_otp',
      'session_user', v_user_id,
      'verified_at', NOW()
    )
  );

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_verified_application_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_verified_application_email(TEXT) TO service_role;

-- 2. Hardened Database Trigger on gas_customer_applications
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
  v_user_id := auth.uid();
  v_clean_email := LOWER(TRIM(NEW.email));

  -- Admins and Managers can insert/manage applications operational
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

DROP TRIGGER IF EXISTS trg_enforce_gas_app_verified_email ON public.gas_customer_applications;
CREATE TRIGGER trg_enforce_gas_app_verified_email
  BEFORE INSERT OR UPDATE ON public.gas_customer_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_gas_application_verified_email();
