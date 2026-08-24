-- ====================================================================
-- MIGRATION: 00016_support_tickets_insert_policy.sql
-- Ensure strict RLS INSERT policy for customer support requests
-- ====================================================================

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Drop old insert policy if exists and create strict policy
DROP POLICY IF EXISTS "Customers can create support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Customers can create own support requests" ON public.support_tickets;

CREATE POLICY "Customers can create own support requests"
  ON public.support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id OR public.is_admin_or_manager());
