-- ====================================================================
-- MIGRATION: 00011_customer_portal_full.sql
-- Complete Customer Portal Database Tables (Addresses, Notifications, Profiles)
-- ====================================================================

-- 1. Ensure phone and notification_prefs exist in public.profiles
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone'
  ) THEN 
    ALTER TABLE public.profiles ADD COLUMN phone TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'notification_prefs'
  ) THEN 
    ALTER TABLE public.profiles ADD COLUMN notification_prefs JSONB DEFAULT '{"email": true, "sms": true, "promotions": false}'::jsonb;
  END IF;
END $$;

-- 2. Customer Delivery Addresses Table
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Home',
  name TEXT NOT NULL,
  street TEXT NOT NULL,
  city TEXT DEFAULT 'Gloucestershire',
  postcode TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on customer_addresses
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own addresses" ON public.customer_addresses;
CREATE POLICY "Users can view their own addresses"
  ON public.customer_addresses FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own addresses" ON public.customer_addresses;
CREATE POLICY "Users can insert their own addresses"
  ON public.customer_addresses FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own addresses" ON public.customer_addresses;
CREATE POLICY "Users can update their own addresses"
  ON public.customer_addresses FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own addresses" ON public.customer_addresses;
CREATE POLICY "Users can delete their own addresses"
  ON public.customer_addresses FOR DELETE
  USING (user_id = auth.uid());

-- 3. Customer Notifications Table
CREATE TABLE IF NOT EXISTS public.customer_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on customer_notifications
ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their notifications" ON public.customer_notifications;
CREATE POLICY "Users can view their notifications"
  ON public.customer_notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their notifications" ON public.customer_notifications;
CREATE POLICY "Users can update their notifications"
  ON public.customer_notifications FOR UPDATE
  USING (user_id = auth.uid());
