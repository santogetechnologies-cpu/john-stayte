-- ====================================================================
-- MIGRATION: 00019_notifications_schema_enhancement.sql
-- Ensure notifications table columns, RLS policies & Realtime publication
-- ====================================================================

-- 1. Add missing columns to public.notifications if not present
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'is_read'
  ) THEN 
    ALTER TABLE public.notifications ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'category'
  ) THEN 
    ALTER TABLE public.notifications ADD COLUMN category TEXT DEFAULT 'Support';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'link'
  ) THEN 
    ALTER TABLE public.notifications ADD COLUMN link TEXT;
  END IF;
END $$;

-- 2. Enable RLS on public.notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop old restrictive policies if any
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;

-- Create policies for notifications
CREATE POLICY "Users and staff can view notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin_or_manager() OR user_id IS NULL);

CREATE POLICY "Anyone can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users and staff can update notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin_or_manager() OR user_id IS NULL);

-- 3. Enable Realtime on support_tickets and notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'support_tickets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
