-- ====================================================================
-- MIGRATION: 00029_fix_rls_recursion.sql
-- Fix Infinite Recursion via Direct Customer Column & Acyclic Policies
-- ====================================================================

-- 1. ADD customer_id TO delivery_assignments TO ELIMINATE RECURSIVE SUBQUERIES
ALTER TABLE public.delivery_assignments 
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill customer_id on existing delivery_assignments from orders
UPDATE public.delivery_assignments da
SET customer_id = o.customer_id
FROM public.orders o
WHERE da.order_id = o.id AND da.customer_id IS NULL;

-- Automatic trigger to populate customer_id on new delivery_assignments
CREATE OR REPLACE FUNCTION public.sync_delivery_assignment_customer()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_id IS NULL AND NEW.order_id IS NOT NULL THEN
    SELECT customer_id INTO NEW.customer_id FROM public.orders WHERE id = NEW.order_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_delivery_assignment_customer ON public.delivery_assignments;
CREATE TRIGGER trg_sync_delivery_assignment_customer
  BEFORE INSERT OR UPDATE ON public.delivery_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_delivery_assignment_customer();

-- 2. HARDEN is_admin_or_manager FUNCTION TO PREVENT PROFILE RECURSION
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  );
$$;

-- 3. PROFILES POLICIES (Direct & Non-recursive)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin_or_manager());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin_or_manager());

-- 4. DELIVERY_ASSIGNMENTS POLICIES (NO QUERIES TO ORDERS -> NO RECURSION)
DROP POLICY IF EXISTS "Customers can view delivery_assignments for own orders" ON public.delivery_assignments;
DROP POLICY IF EXISTS "Customers can view own delivery assignments" ON public.delivery_assignments;
DROP POLICY IF EXISTS "Staff delivery assignments access" ON public.delivery_assignments;
DROP POLICY IF EXISTS "Staff can manage all delivery assignments" ON public.delivery_assignments;
DROP POLICY IF EXISTS "Delivery agents can view assigned deliveries" ON public.delivery_assignments;
DROP POLICY IF EXISTS "Delivery agents can update assigned deliveries" ON public.delivery_assignments;

CREATE POLICY "Staff can manage all delivery assignments"
  ON public.delivery_assignments FOR ALL
  TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "Customers can view own delivery assignments"
  ON public.delivery_assignments FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Delivery agents can view assigned deliveries"
  ON public.delivery_assignments FOR SELECT
  TO authenticated
  USING (
    agent_id = auth.uid() OR
    driver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.delivery_agents ag
      WHERE ag.id = delivery_assignments.agent_id
      AND ag.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Delivery agents can update assigned deliveries"
  ON public.delivery_assignments FOR UPDATE
  TO authenticated
  USING (
    agent_id = auth.uid() OR
    driver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.delivery_agents ag
      WHERE ag.id = delivery_assignments.agent_id
      AND ag.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    agent_id = auth.uid() OR
    driver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.delivery_agents ag
      WHERE ag.id = delivery_assignments.agent_id
      AND ag.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- 5. ORDERS POLICIES
DROP POLICY IF EXISTS "Customers can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can update orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can manage all orders" ON public.orders;
DROP POLICY IF EXISTS "Delivery agents can view assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Allow customers to read own orders" ON public.orders;
DROP POLICY IF EXISTS "Allow authenticated insert to orders" ON public.orders;

CREATE POLICY "Customers can view own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    customer_id = auth.uid() OR 
    public.is_admin_or_manager()
  );

CREATE POLICY "Delivery agents can view assigned orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.delivery_assignments da
      WHERE da.order_id = orders.id
      AND (
        da.agent_id = auth.uid() OR
        da.driver_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.delivery_agents ag
          WHERE ag.id = da.agent_id
          AND ag.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
      )
    )
  );

CREATE POLICY "Customers can insert own orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id = auth.uid() OR customer_id IS NULL
  );

CREATE POLICY "Staff can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_manager());

CREATE POLICY "Staff can manage all orders"
  ON public.orders FOR ALL
  TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

-- 6. ORDER_ITEMS POLICIES
DROP POLICY IF EXISTS "Users can view order items for accessible orders" ON public.order_items;
DROP POLICY IF EXISTS "Users can insert order items for own orders" ON public.order_items;

CREATE POLICY "Users can view order items for accessible orders"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
      AND (o.customer_id = auth.uid() OR public.is_admin_or_manager())
    ) OR
    EXISTS (
      SELECT 1 FROM public.delivery_assignments da
      WHERE da.order_id = order_items.order_id
      AND (da.agent_id = auth.uid() OR da.driver_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert order items for own orders"
  ON public.order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
      AND (o.customer_id = auth.uid() OR o.customer_id IS NULL OR public.is_admin_or_manager())
    )
  );
