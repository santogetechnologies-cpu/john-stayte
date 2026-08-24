-- ====================================================================
-- MIGRATION: 00020_fix_notifications_rls.sql
-- Fix notifications table RLS policies to allow authenticated users to insert notifications
-- ====================================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop previous restrictive insert policy
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

-- Create permissive INSERT policy for authenticated users
CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create SELECT policy: User can view their own notifications OR staff can view all
DROP POLICY IF EXISTS "Users and staff can view notifications" ON public.notifications;
CREATE POLICY "Users and staff can view notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin_or_manager() OR user_id IS NULL);

-- Create UPDATE policy: User can update their own notifications OR staff can update all
DROP POLICY IF EXISTS "Users and staff can update notifications" ON public.notifications;
CREATE POLICY "Users and staff can update notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin_or_manager() OR user_id IS NULL);
