-- ====================================================================
-- MIGRATION: 00004_order_history_rls.sql
-- Enable RLS policies for order_status_history
-- ====================================================================

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view order history for accessible orders" ON public.order_status_history;
CREATE POLICY "Users can view order history for accessible orders"
  ON public.order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_status_history.order_id
      AND (customer_id = auth.uid() OR public.is_admin_or_manager())
    )
  );

DROP POLICY IF EXISTS "Users can insert order history for accessible orders" ON public.order_status_history;
CREATE POLICY "Users can insert order history for accessible orders"
  ON public.order_status_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_status_history.order_id
      AND (customer_id = auth.uid() OR customer_id IS NULL OR public.is_admin_or_manager())
    )
  );
