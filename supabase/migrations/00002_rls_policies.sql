-- ====================================================================
-- JOHN STAYTE SERVICES - ROW LEVEL SECURITY (RLS) POLICIES
-- Migration: 00002_rls_policies.sql
-- ====================================================================

-- ENABLE RLS ON ALL TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- HELPER FUNCTIONS FOR ROLE CHECKS
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 1. PROFILES POLICIES
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin_or_manager());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin_or_manager());

-- 2. PUBLIC READ TABLES (products, categories, stations, product_images)
CREATE POLICY "Anyone can view categories"
  ON public.categories FOR SELECT USING (true);

CREATE POLICY "Anyone can view products"
  ON public.products FOR SELECT USING (true);

CREATE POLICY "Anyone can view product_images"
  ON public.product_images FOR SELECT USING (true);

CREATE POLICY "Anyone can view stations"
  ON public.stations FOR SELECT USING (true);

-- Admin & Manager management of catalog
CREATE POLICY "Staff can manage categories"
  ON public.categories FOR ALL USING (public.is_admin_or_manager());

CREATE POLICY "Staff can manage products"
  ON public.products FOR ALL USING (public.is_admin_or_manager());

CREATE POLICY "Staff can manage product_images"
  ON public.product_images FOR ALL USING (public.is_admin_or_manager());

CREATE POLICY "Staff can manage stations"
  ON public.stations FOR ALL USING (public.is_admin_or_manager());

-- 3. ADDRESSES POLICIES
CREATE POLICY "Users can view own addresses"
  ON public.addresses FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin_or_manager());

CREATE POLICY "Users can insert own addresses"
  ON public.addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own addresses"
  ON public.addresses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own addresses"
  ON public.addresses FOR DELETE
  USING (auth.uid() = user_id);

-- 4. ORDERS & ORDER ITEMS POLICIES
CREATE POLICY "Customers can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = customer_id OR public.is_admin_or_manager());

CREATE POLICY "Customers can insert own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = customer_id OR customer_id IS NULL);

CREATE POLICY "Staff can update orders"
  ON public.orders FOR UPDATE
  USING (public.is_admin_or_manager());

CREATE POLICY "Users can view order items for accessible orders"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_items.order_id
      AND (customer_id = auth.uid() OR public.is_admin_or_manager())
    )
  );

CREATE POLICY "Users can insert order items for own orders"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_items.order_id
      AND (customer_id = auth.uid() OR customer_id IS NULL)
    )
  );

-- 5. WISHLISTS & WISHLIST ITEMS POLICIES
CREATE POLICY "Users can manage own wishlists"
  ON public.wishlists FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own wishlist items"
  ON public.wishlist_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.wishlists
      WHERE id = wishlist_items.wishlist_id
      AND user_id = auth.uid()
    )
  );

-- 6. NOTIFICATIONS POLICIES
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin_or_manager());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- 7. SUPPORT TICKETS POLICIES
CREATE POLICY "Customers can view own support tickets"
  ON public.support_tickets FOR SELECT
  USING (auth.uid() = customer_id OR public.is_admin_or_manager());

CREATE POLICY "Customers can create support tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() = customer_id OR customer_id IS NULL);

CREATE POLICY "Staff can update support tickets"
  ON public.support_tickets FOR UPDATE
  USING (public.is_admin_or_manager());

CREATE POLICY "Accessible support messages"
  ON public.support_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE id = support_messages.ticket_id
      AND (customer_id = auth.uid() OR public.is_admin_or_manager())
    )
  );

CREATE POLICY "Create support messages"
  ON public.support_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE id = support_messages.ticket_id
      AND (customer_id = auth.uid() OR public.is_admin_or_manager())
    )
  );

-- 8. INVENTORY, DELIVERY, AUDIT LOGS (Staff only)
CREATE POLICY "Staff inventory access"
  ON public.inventory FOR ALL
  USING (public.is_admin_or_manager());

CREATE POLICY "Staff delivery assignments access"
  ON public.delivery_assignments FOR ALL
  USING (public.is_admin_or_manager());

CREATE POLICY "Staff audit logs access"
  ON public.audit_logs FOR ALL
  USING (public.is_admin_or_manager());

CREATE POLICY "Staff invoices access"
  ON public.invoices FOR ALL
  USING (public.is_admin_or_manager() OR EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = invoices.order_id AND customer_id = auth.uid()
  ));
