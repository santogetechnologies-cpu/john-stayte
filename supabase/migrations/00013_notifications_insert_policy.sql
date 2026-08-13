-- ====================================================================
-- MIGRATION: 00013_notifications_insert_policy.sql
-- Add INSERT policy for customer_notifications
-- ====================================================================

DROP POLICY IF EXISTS "Users can insert their notifications" ON public.customer_notifications;
CREATE POLICY "Users can insert their notifications"
  ON public.customer_notifications FOR INSERT
  WITH CHECK (user_id = auth.uid() OR public.is_admin_or_manager());
