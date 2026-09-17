-- ====================================================================
-- JOHN STAYTE SERVICES - GAS CUSTOMER APPLICATION EMAIL VERIFICATIONS
-- Migration: 00068_application_email_verifications.sql
-- ====================================================================

-- 1. Create table for tracking application email verifications
CREATE TABLE IF NOT EXISTS public.email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  verification_token TEXT,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 minutes'),
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by user_id and email
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_email ON public.email_verifications(user_id, email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email_verified ON public.email_verifications(email, verified_at);

-- 2. Enable RLS
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Customers can ONLY view their own verification status (NO direct INSERT or UPDATE allowed)
DROP POLICY IF EXISTS "email_verif_user_select" ON public.email_verifications;
CREATE POLICY "email_verif_user_select"
  ON public.email_verifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Explicitly DROP any permissive user insert/update policies to prevent forged records
DROP POLICY IF EXISTS "email_verif_user_insert" ON public.email_verifications;
DROP POLICY IF EXISTS "email_verif_user_update" ON public.email_verifications;

-- Admin and Manager full management
DROP POLICY IF EXISTS "email_verif_admin_manager_all" ON public.email_verifications;
CREATE POLICY "email_verif_admin_manager_all"
  ON public.email_verifications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- 4. Secure RPC to record verified email state (callable only by authenticated user)
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
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  v_clean_email := LOWER(TRIM(p_email));
  IF v_clean_email IS NULL OR v_clean_email = '' OR POSITION('@' IN v_clean_email) = 0 THEN
    RAISE EXCEPTION 'Invalid email address.';
  END IF;

  -- Verify caller is admin/manager OR confirmed auth.users owner of p_email
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user_id AND role IN ('admin', 'manager')
  ) THEN
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
    RAISE EXCEPTION 'Unauthorized: Email % has not been verified via Supabase Auth OTP verification.', p_email;
  END IF;

  -- Insert or update verified record for this authenticated user
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

-- 5. Database Trigger on gas_customer_applications to enforce verified email matching
CREATE OR REPLACE FUNCTION public.enforce_gas_application_verified_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_is_verified BOOLEAN;
BEGIN
  -- Admins and Managers can insert/manage applications operational
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  ) THEN
    RETURN NEW;
  END IF;

  -- Verify authenticated ownership
  IF NEW.customer_id != auth.uid() THEN
    RAISE EXCEPTION 'Customer ID must match authenticated user.';
  END IF;

  -- Check if submitted email matches verified record or confirmed auth user
  SELECT EXISTS (
    SELECT 1 FROM public.email_verifications
    WHERE user_id = auth.uid()
    AND LOWER(email) = LOWER(TRIM(NEW.email))
    AND verified_at IS NOT NULL
    AND expires_at > NOW()
  ) INTO v_is_verified;

  -- Also allow if the user's primary auth email is confirmed and matches
  IF NOT v_is_verified THEN
    SELECT EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND LOWER(email) = LOWER(TRIM(NEW.email))
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

