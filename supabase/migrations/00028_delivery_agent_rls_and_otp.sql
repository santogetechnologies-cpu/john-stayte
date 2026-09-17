-- ====================================================================
-- MIGRATION: 00028_delivery_agent_rls_and_otp.sql
-- Dedicated OTP Columns, Verification Hardening & Strict Delivery Agent RLS
-- ====================================================================

-- 1. PREREQUISITES: DELIVERY AGENTS TABLE & AGENT COLUMNS ON DELIVERY_ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.delivery_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  address TEXT,
  delivery_zone TEXT DEFAULT 'Gloucestershire Central',
  vehicle_type TEXT DEFAULT 'LPG Delivery Van',
  vehicle_plate TEXT NOT NULL,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'On Delivery', 'Busy')),
  rating NUMERIC(3,2) DEFAULT 5.00,
  total_deliveries INTEGER DEFAULT 0,
  completed_deliveries INTEGER DEFAULT 0,
  active_deliveries INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.delivery_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view delivery agents" ON public.delivery_agents;
CREATE POLICY "Anyone can view delivery agents"
  ON public.delivery_agents FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Staff can manage delivery agents" ON public.delivery_agents;
CREATE POLICY "Staff can manage delivery agents"
  ON public.delivery_agents FOR ALL
  TO authenticated
  USING (public.is_admin_or_manager());

-- 2. ADD AGENT, OTP & VERIFICATION COLUMNS TO DELIVERY_ASSIGNMENTS
ALTER TABLE public.delivery_assignments 
  ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES public.delivery_agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agent_code TEXT,
  ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6),
  ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS otp_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS otp_max_attempts INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS otp_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS otp_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_signature TEXT,
  ADD COLUMN IF NOT EXISTS empty_cylinder_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cylinder_condition TEXT;

-- 2. RESTRUCTURE RLS POLICIES ON DELIVERY_ASSIGNMENTS
ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff delivery assignments access" ON public.delivery_assignments;
DROP POLICY IF EXISTS "Customers can view delivery_assignments for own orders" ON public.delivery_assignments;
DROP POLICY IF EXISTS "Customers can view own delivery assignments" ON public.delivery_assignments;
DROP POLICY IF EXISTS "Staff can manage all delivery assignments" ON public.delivery_assignments;
DROP POLICY IF EXISTS "Delivery agents can view assigned deliveries" ON public.delivery_assignments;
DROP POLICY IF EXISTS "Delivery agents can update assigned deliveries" ON public.delivery_assignments;

-- A. Staff (Admin & Manager) can manage ALL delivery assignments
CREATE POLICY "Staff can manage all delivery assignments"
  ON public.delivery_assignments FOR ALL
  TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

-- B. Customers can view delivery assignments for their OWN orders
CREATE POLICY "Customers can view own delivery assignments"
  ON public.delivery_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = delivery_assignments.order_id
      AND orders.customer_id = auth.uid()
    )
  );

-- C. Delivery Agents can view ONLY deliveries assigned to their user/agent ID
CREATE POLICY "Delivery agents can view assigned deliveries"
  ON public.delivery_assignments FOR SELECT
  TO authenticated
  USING (
    agent_id = auth.uid() OR
    driver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.delivery_agents
      WHERE delivery_agents.id = delivery_assignments.agent_id
      AND delivery_agents.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- D. Delivery Agents can update ONLY their assigned deliveries
CREATE POLICY "Delivery agents can update assigned deliveries"
  ON public.delivery_assignments FOR UPDATE
  TO authenticated
  USING (
    agent_id = auth.uid() OR
    driver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.delivery_agents
      WHERE delivery_agents.id = delivery_assignments.agent_id
      AND delivery_agents.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    agent_id = auth.uid() OR
    driver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.delivery_agents
      WHERE delivery_agents.id = delivery_assignments.agent_id
      AND delivery_agents.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- 3. ENSURE DELIVERY AGENTS CAN VIEW THEIR ASSIGNED ORDERS UNDER RLS
DROP POLICY IF EXISTS "Delivery agents can view assigned orders" ON public.orders;
CREATE POLICY "Delivery agents can view assigned orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.delivery_assignments
      WHERE delivery_assignments.order_id = orders.id
      AND (
        delivery_assignments.agent_id = auth.uid() OR
        delivery_assignments.driver_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.delivery_agents
          WHERE delivery_agents.id = delivery_assignments.agent_id
          AND delivery_agents.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
      )
    )
  );
