-- ====================================================================
-- MIGRATION: 00018_support_tickets_full_rls.sql
-- Ensure full RLS SELECT, INSERT, UPDATE, DELETE policies for support_tickets
-- ====================================================================

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- 1. SELECT POLICY: Customer can view ONLY their own requests. Staff can view all.
DROP POLICY IF EXISTS "Customers can view own support tickets" ON public.support_tickets;
CREATE POLICY "Customers can view own support tickets"
  ON public.support_tickets FOR SELECT
  USING (auth.uid() = customer_id OR public.is_admin_or_manager());

-- 2. INSERT POLICY: Customer can insert ONLY for their own auth.uid(). Staff can insert for any.
DROP POLICY IF EXISTS "Customers can create support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Customers can create own support requests" ON public.support_tickets;
CREATE POLICY "Customers can create own support requests"
  ON public.support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id OR public.is_admin_or_manager());

-- 3. DELETE POLICY: Customer can delete own requests. Staff can delete any.
DROP POLICY IF EXISTS "Customers and staff can delete support tickets" ON public.support_tickets;
CREATE POLICY "Customers and staff can delete support tickets"
  ON public.support_tickets FOR DELETE
  USING (auth.uid() = customer_id OR public.is_admin_or_manager());
