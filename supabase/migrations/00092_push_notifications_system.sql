-- ====================================================================
-- MIGRATION: 00092_push_notifications_system.sql
-- Production Push Notification System: Device Tokens & Dispatch Logs
-- Supporting Android & iOS Native Push via FCM / APNs
-- ====================================================================

-- 1. USER DEVICE TOKENS TABLE
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

-- Indexes for lightning-fast token lookups
CREATE INDEX IF NOT EXISTS idx_user_device_tokens_user_id ON public.user_device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_device_tokens_role ON public.user_device_tokens(role);
CREATE INDEX IF NOT EXISTS idx_user_device_tokens_active ON public.user_device_tokens(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_device_tokens_user_active ON public.user_device_tokens(user_id, is_active);

-- Enable Row Level Security
ALTER TABLE public.user_device_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_device_tokens
DROP POLICY IF EXISTS "Users can view own device tokens" ON public.user_device_tokens;
CREATE POLICY "Users can view own device tokens"
  ON public.user_device_tokens FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own device tokens" ON public.user_device_tokens;
CREATE POLICY "Users can insert own device tokens"
  ON public.user_device_tokens FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own device tokens" ON public.user_device_tokens;
CREATE POLICY "Users can update own device tokens"
  ON public.user_device_tokens FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own device tokens" ON public.user_device_tokens;
CREATE POLICY "Users can delete own device tokens"
  ON public.user_device_tokens FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Staff can view device tokens" ON public.user_device_tokens;
CREATE POLICY "Staff can view device tokens"
  ON public.user_device_tokens FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager')
    )
  );

-- 2. NOTIFICATION DISPATCH LOGS TABLE
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

CREATE INDEX IF NOT EXISTS idx_notif_dispatch_logs_user ON public.notification_dispatch_logs(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notif_dispatch_logs_event ON public.notification_dispatch_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_notif_dispatch_logs_idempotency ON public.notification_dispatch_logs(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_notif_dispatch_logs_created ON public.notification_dispatch_logs(created_at DESC);

-- Enable RLS on dispatch logs
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

-- 3. SECURITY DEFINER FUNCTIONS (Prevents client-side role manipulation)

-- Register or update device token for currently authenticated user
CREATE OR REPLACE FUNCTION public.register_device_token(
  p_token TEXT,
  p_platform TEXT,
  p_installation_id TEXT DEFAULT NULL,
  p_device_info JSONB DEFAULT '{}'::jsonb
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
  v_result JSONB;
BEGIN
  -- Authenticate caller
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate platform
  IF p_platform NOT IN ('android', 'ios', 'web') THEN
    RAISE EXCEPTION 'Invalid platform. Must be android, ios, or web.';
  END IF;

  -- Resolve authoritative role and email from profiles table (NEVER TRUST CLIENT INPUT)
  SELECT role, email INTO v_role, v_email FROM public.profiles WHERE id = v_user_id;
  IF v_role IS NULL THEN
    v_role := 'customer';
  END IF;

  -- Check if user is an active delivery agent
  IF EXISTS (
    SELECT 1 FROM public.delivery_agents da
    WHERE da.id = v_user_id OR (v_email IS NOT NULL AND lower(da.email) = lower(v_email))
  ) THEN
    v_role := 'delivery_agent';
  END IF;

  -- Upsert device token: reassigns token if device changed users, updates installation & timestamp
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
    p_token,
    p_platform,
    v_role,
    p_installation_id,
    p_device_info,
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (token) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    platform = EXCLUDED.platform,
    role = EXCLUDED.role,
    installation_id = COALESCE(EXCLUDED.installation_id, public.user_device_tokens.installation_id),
    device_info = COALESCE(EXCLUDED.device_info, public.user_device_tokens.device_info),
    is_active = TRUE,
    last_used_at = NOW(),
    updated_at = NOW();

  SELECT json_build_object(
    'success', TRUE,
    'user_id', v_user_id,
    'role', v_role,
    'platform', p_platform
  )::jsonb INTO v_result;

  RETURN v_result;
END;
$$;

-- Deactivate a device token on logout or account switch
CREATE OR REPLACE FUNCTION public.deactivate_device_token(
  p_token TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.user_device_tokens
  SET is_active = FALSE, updated_at = NOW()
  WHERE token = p_token AND user_id = v_user_id;

  RETURN FOUND;
END;
$$;

-- Revoke all permissions from public, grant to authenticated only
REVOKE ALL ON FUNCTION public.register_device_token(TEXT, TEXT, TEXT, JSONB) FROM public;
GRANT EXECUTE ON FUNCTION public.register_device_token(TEXT, TEXT, TEXT, JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.deactivate_device_token(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.deactivate_device_token(TEXT) TO authenticated;
