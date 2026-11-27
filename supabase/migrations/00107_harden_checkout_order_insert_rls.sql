-- ====================================================================
-- JOHN STAYTE SERVICES - HARDEN CHECKOUT ORDER INSERT RLS
-- Migration: 00107_harden_checkout_order_insert_rls.sql
-- Forward-only migration (held for user approval before production apply):
--   Removes direct customer INSERT permissions on public.orders and
--   public.order_items so customers can only create orders through the
--   authoritative server-side createCheckoutOrderServerFn (service_role).
--   Admin and Manager INSERT/management policies remain intact.
-- ====================================================================

DROP POLICY IF EXISTS "Customers can insert own orders" ON public.orders;
CREATE POLICY "Admins and Managers can insert orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "Users can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can insert order items for own orders" ON public.order_items;
CREATE POLICY "Admins and Managers can insert order items"
  ON public.order_items FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_manager());
