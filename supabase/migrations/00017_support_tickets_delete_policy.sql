-- ====================================================================
-- MIGRATION: 00017_support_tickets_delete_policy.sql
-- Allow admin and manager staff to delete support tickets
-- ====================================================================

DROP POLICY IF EXISTS "Staff can delete support tickets" ON public.support_tickets;

CREATE POLICY "Staff can delete support tickets"
  ON public.support_tickets FOR DELETE
  USING (public.is_admin_or_manager());
