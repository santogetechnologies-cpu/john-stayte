-- ====================================================================
-- JOHN STAYTE SERVICES - CHECKOUT EMAIL VERIFICATION
-- Migration: 00072_checkout_email_verification.sql
-- ====================================================================

-- 1. Helper function to verify if an email is verified for checkout/application
CREATE OR REPLACE FUNCTION public.is_email_verified(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_clean_email TEXT;
  v_verified BOOLEAN := FALSE;
BEGIN
  v_user_id := auth.uid();
  v_clean_email := LOWER(TRIM(p_email));
  
  IF v_clean_email IS NULL OR v_clean_email = '' THEN
    RETURN FALSE;
  END IF;

  -- 1. Check email_verifications table for recent valid verification
  IF v_user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.email_verifications
      WHERE user_id = v_user_id
      AND LOWER(email) = v_clean_email
      AND verified_at IS NOT NULL
      AND expires_at > NOW()
    ) INTO v_verified;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.email_verifications
      WHERE LOWER(email) = v_clean_email
      AND verified_at IS NOT NULL
      AND expires_at > NOW()
    ) INTO v_verified;
  END IF;

  -- 2. Check auth.users if primary confirmed email
  IF NOT v_verified AND v_user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = v_user_id
      AND LOWER(email) = v_clean_email
      AND (email_confirmed_at IS NOT NULL OR confirmed_at IS NOT NULL)
    ) INTO v_verified;
  END IF;

  RETURN v_verified;
END;
$$;

-- 2. Secure function to record verified checkout email
CREATE OR REPLACE FUNCTION public.record_verified_checkout_email(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_clean_email TEXT;
BEGIN
  v_user_id := auth.uid();
  v_clean_email := LOWER(TRIM(p_email));
  
  IF v_clean_email IS NULL OR v_clean_email = '' OR POSITION('@' IN v_clean_email) = 0 THEN
    RAISE EXCEPTION 'Invalid email address.';
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
    jsonb_build_object('verified_by', 'checkout_otp', 'session_user', v_user_id)
  );

  RETURN TRUE;
END;
$$;
