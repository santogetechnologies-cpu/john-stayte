-- Allow customers to view delivery assignments for their own orders
DROP POLICY IF EXISTS "Customers can view delivery_assignments for own orders" ON public.delivery_assignments;
CREATE POLICY "Customers can view delivery_assignments for own orders"
  ON public.delivery_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = delivery_assignments.order_id
      AND orders.customer_id = auth.uid()
    )
  );
