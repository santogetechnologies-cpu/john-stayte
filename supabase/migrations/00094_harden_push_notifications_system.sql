-- ====================================================================
-- MIGRATION: 00094_harden_push_notifications_system.sql
-- Forward-Only Production Hardening for Push Notification System
-- Device Token Registration, Concurrency Protection, Table Grants & RLS
-- ====================================================================

-- 1. Ensure user_device_tokens table & indices exist (non-destructive)
CREATE TABLE IF NOT EXISTS public.user_device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  role TEXT NOT NULL CHECK (role IN ('customer', 'admin', 'manager', 'delivery_agent')),
  installation_id TEXT,
  device_info JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all required columns exist on user_device_tokens even if pre-created by legacy draft
ALTER TABLE public.user_device_tokens ADD COLUMN IF NOT EXISTS installation_id TEXT;
ALTER TABLE public.user_device_tokens ADD COLUMN IF NOT EXISTS device_info JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.user_device_tokens ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.user_device_tokens ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.user_device_tokens ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_user_device_tokens_user_id ON public.user_device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_device_tokens_role ON public.user_device_tokens(role);
CREATE INDEX IF NOT EXISTS idx_user_device_tokens_active ON public.user_device_tokens(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_device_tokens_user_active ON public.user_device_tokens(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_device_tokens_installation ON public.user_device_tokens(installation_id);

-- Enable RLS and verify policies (Principle of Least Privilege)
ALTER TABLE public.user_device_tokens ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view only their own device tokens
DROP POLICY IF EXISTS "Users can view own device tokens" ON public.user_device_tokens;
CREATE POLICY "Users can view own device tokens"
  ON public.user_device_tokens FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow authenticated users to delete their own device tokens on logout/cleanup
DROP POLICY IF EXISTS "Users can delete own device tokens" ON public.user_device_tokens;
CREATE POLICY "Users can delete own device tokens"
  ON public.user_device_tokens FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- HARDENING: Drop direct INSERT and UPDATE policies for authenticated users.
-- Direct table mutation would allow an authenticated customer to bypass register_device_token
-- and insert/update a row with role = 'admin' or role = 'delivery_agent' via PostgREST.
-- All token registrations and state mutations must flow through public.register_device_token(...)
-- or public.deactivate_device_token(...) or trusted server functions using service_role.
DROP POLICY IF EXISTS "Users can insert own device tokens" ON public.user_device_tokens;
DROP POLICY IF EXISTS "Users can update own device tokens" ON public.user_device_tokens;

-- HARDENING: Drop staff view policy on raw user_device_tokens.
-- Staff members do not require direct read access to raw customer FCM tokens, installation IDs,
-- or device hardware metadata. Notification dispatch runs server-side with service_role.
DROP POLICY IF EXISTS "Staff can view device tokens" ON public.user_device_tokens;

-- 2. Ensure notification_dispatch_logs table & indices exist (non-destructive)
CREATE TABLE IF NOT EXISTS public.notification_dispatch_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  recipient_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_role TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'skipped', 'no_tokens')),
  tokens_attempted INTEGER DEFAULT 0,
  tokens_succeeded INTEGER DEFAULT 0,
  tokens_failed INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- Ensure all required columns exist on notification_dispatch_logs even if pre-created by legacy draft
ALTER TABLE public.notification_dispatch_logs ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.notification_dispatch_logs ADD COLUMN IF NOT EXISTS tokens_attempted INTEGER DEFAULT 0;
ALTER TABLE public.notification_dispatch_logs ADD COLUMN IF NOT EXISTS tokens_succeeded INTEGER DEFAULT 0;
ALTER TABLE public.notification_dispatch_logs ADD COLUMN IF NOT EXISTS tokens_failed INTEGER DEFAULT 0;
ALTER TABLE public.notification_dispatch_logs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.notification_dispatch_logs ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notif_dispatch_logs_user ON public.notification_dispatch_logs(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notif_dispatch_logs_event ON public.notification_dispatch_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_notif_dispatch_logs_idempotency ON public.notification_dispatch_logs(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_notif_dispatch_logs_created ON public.notification_dispatch_logs(created_at DESC);

-- Enable RLS on dispatch logs (idempotent)
ALTER TABLE public.notification_dispatch_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notification logs" ON public.notification_dispatch_logs;
CREATE POLICY "Users can view own notification logs"
  ON public.notification_dispatch_logs FOR SELECT
  TO authenticated
  USING (recipient_user_id = auth.uid());

DROP POLICY IF EXISTS "Staff can view all notification logs" ON public.notification_dispatch_logs;
CREATE POLICY "Staff can view all notification logs"
  ON public.notification_dispatch_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager')
    )
  );

-- Explicitly revoke direct table mutation privileges from clients (Defense in Depth).
-- This ensures authenticated and anon callers cannot directly INSERT, UPDATE, or DELETE
-- tables outside the designated SECURITY DEFINER RPCs and service_role server functions.
REVOKE INSERT, UPDATE ON TABLE public.user_device_tokens FROM authenticated, anon, public;
GRANT SELECT, DELETE ON TABLE public.user_device_tokens TO authenticated;
REVOKE ALL ON TABLE public.user_device_tokens FROM anon;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.notification_dispatch_logs FROM authenticated, anon, public;
GRANT SELECT ON TABLE public.notification_dispatch_logs TO authenticated;
REVOKE ALL ON TABLE public.notification_dispatch_logs FROM anon;

-- 3. Cleanly drop legacy function signatures to prevent overload ambiguity
DROP FUNCTION IF EXISTS public.register_device_token(TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.register_device_token(TEXT, TEXT, TEXT, JSONB, UUID);
DROP FUNCTION IF EXISTS public.deactivate_device_token(TEXT);
DROP FUNCTION IF EXISTS public.deactivate_device_token(TEXT, UUID);

-- 4. Hardened register_device_token Function
CREATE OR REPLACE FUNCTION public.register_device_token(
  p_token TEXT,
  p_platform TEXT,
  p_installation_id TEXT DEFAULT NULL,
  p_device_info JSONB DEFAULT '{}'::jsonb,
  p_caller_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_role TEXT;
  v_email TEXT;
  v_sanitized_token TEXT;
  v_sanitized_platform TEXT;
  v_sanitized_installation_id TEXT;
  v_sanitized_device_info JSONB;
  v_existing_user_id UUID;
  v_existing_is_active BOOLEAN;
  v_existing_installation_id TEXT;
  v_attempt INT;
  v_result JSONB;
BEGIN
  -- A. Resolve Authoritative User Identity
  -- If called by backend via service_role, accept verified p_caller_user_id.
  -- If called directly via PostgREST/authenticated client, strictly enforce auth.uid().
  IF auth.role() = 'service_role' THEN
    v_user_id := COALESCE(p_caller_user_id, auth.uid());
  ELSE
    v_user_id := auth.uid();
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user profile exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- B. Strict Input Validation
  v_sanitized_token := trim(p_token);
  IF v_sanitized_token IS NULL OR v_sanitized_token = '' THEN
    RAISE EXCEPTION 'Device token must not be empty';
  END IF;
  IF length(v_sanitized_token) > 4096 THEN
    RAISE EXCEPTION 'Device token exceeds maximum permissible length';
  END IF;

  v_sanitized_platform := lower(trim(p_platform));
  IF v_sanitized_platform NOT IN ('android', 'ios', 'web') THEN
    RAISE EXCEPTION 'Invalid platform. Must be android, ios, or web.';
  END IF;

  IF p_installation_id IS NOT NULL THEN
    v_sanitized_installation_id := trim(p_installation_id);
    IF length(v_sanitized_installation_id) > 255 THEN
      v_sanitized_installation_id := substr(v_sanitized_installation_id, 1, 255);
    END IF;
    IF v_sanitized_installation_id = '' THEN
      v_sanitized_installation_id := NULL;
    END IF;
  ELSE
    v_sanitized_installation_id := NULL;
  END IF;

  IF p_device_info IS NULL OR jsonb_typeof(p_device_info) != 'object' THEN
    v_sanitized_device_info := '{}'::jsonb;
  ELSE
    v_sanitized_device_info := p_device_info;
  END IF;

  -- C. Authoritative Role Resolution (Client inputs are NEVER trusted for role)
  SELECT role, email INTO v_role, v_email FROM public.profiles WHERE id = v_user_id;
  IF v_role IS NULL OR v_role NOT IN ('customer', 'admin', 'manager') THEN
    v_role := 'customer';
  END IF;

  -- Check delivery_agents table: Driver must be explicitly active ('Active', 'On Delivery', 'Busy')
  -- Reject NULL, 'Inactive', 'Suspended', or unlisted statuses
  IF EXISTS (
    SELECT 1 FROM public.delivery_agents da
    WHERE (da.id = v_user_id OR (v_email IS NOT NULL AND lower(da.email) = lower(v_email)))
      AND da.status IN ('Active', 'On Delivery', 'Busy')
  ) THEN
    v_role := 'delivery_agent';
  END IF;

  -- D. Transaction-Safe Token Registration & Ownership Protection
  -- Prevents concurrent registration race conditions when the token does not exist yet.
  -- 1. Attempt to lock existing row with FOR UPDATE.
  -- 2. If row exists: perform strict ownership and account-switching checks, then safely UPDATE.
  -- 3. If row does not exist: attempt INSERT. If a concurrent transaction inserted the token
  --    between our check and insert, catch unique_violation and loop back to step 1 to acquire
  --    the row lock and enforce ownership validation against the newly committed row.
  FOR v_attempt IN 1..3 LOOP
    SELECT user_id, is_active, installation_id
    INTO v_existing_user_id, v_existing_is_active, v_existing_installation_id
    FROM public.user_device_tokens
    WHERE token = v_sanitized_token
    FOR UPDATE;

    IF FOUND THEN
      -- Row exists and is exclusively locked by this transaction
      IF v_existing_user_id != v_user_id THEN
        -- Reassignment to a different user is permitted ONLY when:
        -- 1. The previous session on this device logged out (is_active = FALSE)
        -- OR
        -- 2. The physical installation ID matches (shared device / account switch on same installation)
        IF v_existing_is_active = TRUE AND (
          v_existing_installation_id IS NULL OR
          v_sanitized_installation_id IS NULL OR
          v_existing_installation_id != v_sanitized_installation_id
        ) THEN
          RAISE EXCEPTION 'Device token is currently registered to another active user session';
        END IF;
      END IF;

      -- Safely update the locked row
      UPDATE public.user_device_tokens
      SET
        user_id = v_user_id,
        platform = v_sanitized_platform,
        role = v_role,
        installation_id = COALESCE(v_sanitized_installation_id, public.user_device_tokens.installation_id),
        device_info = COALESCE(v_sanitized_device_info, public.user_device_tokens.device_info),
        is_active = TRUE,
        last_used_at = NOW(),
        updated_at = NOW()
      WHERE token = v_sanitized_token;

      EXIT; -- Successfully updated existing token row
    ELSE
      -- Row does not exist yet: attempt insert
      BEGIN
        INSERT INTO public.user_device_tokens (
          user_id,
          token,
          platform,
          role,
          installation_id,
          device_info,
          is_active,
          last_used_at,
          updated_at
        )
        VALUES (
          v_user_id,
          v_sanitized_token,
          v_sanitized_platform,
          v_role,
          v_sanitized_installation_id,
          v_sanitized_device_info,
          TRUE,
          NOW(),
          NOW()
        );
        EXIT; -- Successfully inserted new token row
      EXCEPTION WHEN unique_violation THEN
        -- Concurrent transaction inserted the same token simultaneously.
        -- Loop back: next iteration will find the row and acquire FOR UPDATE lock,
        -- enforcing ownership validation against the concurrent transaction's row.
        NULL;
      END;
    END IF;
  END LOOP;

  -- Guard against loop exhaustion under extreme concurrency
  IF NOT EXISTS (SELECT 1 FROM public.user_device_tokens WHERE token = v_sanitized_token AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Could not complete token registration due to concurrent transaction conflict';
  END IF;

  SELECT json_build_object(
    'success', TRUE,
    'user_id', v_user_id,
    'role', v_role,
    'platform', v_sanitized_platform
  )::jsonb INTO v_result;

  RETURN v_result;
END;
$$;

-- 5. Hardened deactivate_device_token Function
CREATE OR REPLACE FUNCTION public.deactivate_device_token(
  p_token TEXT,
  p_caller_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_sanitized_token TEXT;
BEGIN
  IF auth.role() = 'service_role' THEN
    v_user_id := COALESCE(p_caller_user_id, auth.uid());
  ELSE
    v_user_id := auth.uid();
  END IF;

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  v_sanitized_token := trim(p_token);
  IF v_sanitized_token IS NULL OR v_sanitized_token = '' THEN
    RETURN FALSE;
  END IF;

  UPDATE public.user_device_tokens
  SET is_active = FALSE, updated_at = NOW()
  WHERE token = v_sanitized_token AND user_id = v_user_id;

  RETURN FOUND;
END;
$$;

-- 6. Privileged Execution Grants (Restricted to authenticated & service_role)
REVOKE ALL ON FUNCTION public.register_device_token(TEXT, TEXT, TEXT, JSONB, UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.register_device_token(TEXT, TEXT, TEXT, JSONB, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.deactivate_device_token(TEXT, UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.deactivate_device_token(TEXT, UUID) TO authenticated, service_role;
