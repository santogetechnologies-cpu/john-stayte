-- ====================================================================
-- JOHN STAYTE SERVICES - EMAIL VERIFICATION & DELIVERY OTP HARDENING
-- Migration: 00104_harden_email_verification_and_delivery_otp.sql
-- Forward-only migration:
--   1. Index on public.email_verifications(LOWER(email), created_at DESC)
--      for serverless-safe OTP lookup & rate limiting.
--   2. Harden public.record_verified_checkout_email(p_email) to require
--      authenticated caller ownership / confirmed auth email.
--   3. Enforce mandatory delivery_assignments.otp_verified = TRUE before
--      marking delivery_assignments or orders as 'Delivered' across all
--      non-admin/manager operational roles (driver, delivery_agent, branch_staff).
-- ====================================================================

-- 1. Persistent Email Verification Lookup Index
CREATE INDEX IF NOT EXISTS idx_email_verifications_lower_email_created
  ON public.email_verifications (LOWER(email), created_at DESC);

-- 2. Harden record_verified_checkout_email(p_email)
CREATE OR REPLACE FUNCTION public.record_verified_checkout_email(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_clean_email TEXT;
  v_is_confirmed BOOLEAN := FALSE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  v_clean_email := LOWER(TRIM(p_email));
  IF v_clean_email IS NULL OR v_clean_email = '' OR POSITION('@' IN v_clean_email) = 0 THEN
    RAISE EXCEPTION 'Invalid email address.';
  END IF;

  IF auth.role() = 'service_role' OR public.is_admin_or_manager() THEN
    v_is_confirmed := TRUE;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = v_user_id
        AND LOWER(email) = v_clean_email
        AND (email_confirmed_at IS NOT NULL OR confirmed_at IS NOT NULL)
    ) INTO v_is_confirmed;
  END IF;

  IF NOT v_is_confirmed THEN
    RAISE EXCEPTION 'Unauthorized: Email % has not been verified via OTP.', p_email;
  END IF;

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
      'verified_by', 'checkout_otp',
      'session_user', v_user_id,
      'verified_at', NOW()
    )
  );

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.record_verified_checkout_email(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_verified_checkout_email(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_verified_checkout_email(TEXT) TO authenticated, service_role;

-- 3. Enforce OTP Verification Before Delivery Completion on delivery_assignments
-- Covers delivery_agent, driver, and branch_staff equally (admins/managers & service_role exempted).
CREATE OR REPLACE FUNCTION public.enforce_delivery_otp_before_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.is_admin_or_manager() THEN
    RETURN NEW;
  END IF;

  IF OLD.otp_verified = TRUE AND COALESCE(NEW.otp_verified, FALSE) = FALSE THEN
    RAISE EXCEPTION 'Unauthorized: customer OTP verification cannot be revoked once verified.'
      USING ERRCODE = 'P0001';
  END IF;

  IF NEW.status = 'Delivered' AND OLD.status IS DISTINCT FROM 'Delivered' THEN
    IF COALESCE(NEW.otp_verified, FALSE) = FALSE THEN
      RAISE EXCEPTION 'Unauthorized: customer OTP verification is mandatory before marking delivery as Delivered.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_delivery_otp_before_completion ON public.delivery_assignments;
CREATE TRIGGER trg_enforce_delivery_otp_before_completion
  BEFORE UPDATE ON public.delivery_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_delivery_otp_before_completion();

-- 4. Enforce OTP Verification Before Order Status Transitions to 'Delivered'
CREATE OR REPLACE FUNCTION public.enforce_order_otp_before_delivered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.is_admin_or_manager() THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'Delivered' AND OLD.status IS DISTINCT FROM 'Delivered' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.delivery_assignments da
      WHERE da.order_id = NEW.id
        AND da.otp_verified = TRUE
    ) THEN
      RAISE EXCEPTION 'Unauthorized: customer OTP verification is mandatory before marking order as Delivered.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_order_otp_before_delivered ON public.orders;
CREATE TRIGGER trg_enforce_order_otp_before_delivered
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_otp_before_delivered();
