-- ====================================================================
-- MIGRATION: 00030_fix_auth_jwt_email_and_policies.sql
-- Fix 'permission denied for table users' using auth.jwt() ->> 'email'
-- ====================================================================

-- 1. RECREATE DELIVERY_ASSIGNMENTS POLICIES USING auth.jwt() ->> 'email'
DROP POLICY IF EXISTS "Delivery agents can view assigned deliveries" ON public.delivery_assignments;
DROP POLICY IF EXISTS "Delivery agents can update assigned deliveries" ON public.delivery_assignments;

CREATE POLICY "Delivery agents can view assigned deliveries"
  ON public.delivery_assignments FOR SELECT
  TO authenticated
  USING (
    agent_id = auth.uid() OR
    driver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.delivery_agents ag
      WHERE ag.id = delivery_assignments.agent_id
      AND ag.email = (auth.jwt() ->> 'email')
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
      AND ag.email = (auth.jwt() ->> 'email')
    )
  )
  WITH CHECK (
    agent_id = auth.uid() OR
    driver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.delivery_agents ag
      WHERE ag.id = delivery_assignments.agent_id
      AND ag.email = (auth.jwt() ->> 'email')
    )
  );

-- 2. RECREATE ORDERS POLICY USING auth.jwt() ->> 'email'
DROP POLICY IF EXISTS "Delivery agents can view assigned orders" ON public.orders;

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
          AND ag.email = (auth.jwt() ->> 'email')
        )
      )
    )
  );
