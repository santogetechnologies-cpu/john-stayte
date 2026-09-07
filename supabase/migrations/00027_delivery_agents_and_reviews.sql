-- ====================================================================
-- MIGRATION: 00027_delivery_agents_and_reviews.sql
-- Delivery Agents Management & Enhanced Post-Delivery Reviews System
-- ====================================================================

-- 1. DELIVERY AGENTS TABLE
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

-- Enable RLS on delivery_agents
ALTER TABLE public.delivery_agents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view delivery agents" ON public.delivery_agents;
CREATE POLICY "Anyone can view delivery agents"
  ON public.delivery_agents FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Staff can manage delivery agents" ON public.delivery_agents;
CREATE POLICY "Staff can manage delivery agents"
  ON public.delivery_agents FOR ALL
  TO authenticated
  USING (public.is_admin_or_manager());

-- 2. ENHANCE REVIEWS TABLE WITH DELIVERY & QUALITY RATINGS
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS product_quality_rating INTEGER DEFAULT 5;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS delivery_agent_rating INTEGER DEFAULT 5;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS delivery_agent_id UUID REFERENCES public.delivery_agents(id) ON DELETE SET NULL;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS delivery_agent_name TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved';
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Enhance delivery_assignments with agent_id
ALTER TABLE public.delivery_assignments ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES public.delivery_agents(id) ON DELETE SET NULL;
ALTER TABLE public.delivery_assignments ADD COLUMN IF NOT EXISTS agent_code TEXT;

-- 3. ENABLE REALTIME ON DELIVERY_AGENTS & REVIEWS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'delivery_agents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_agents;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'reviews'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 4. SEED INITIAL DELIVERY AGENTS IF NONE EXIST
INSERT INTO public.delivery_agents (agent_code, full_name, email, phone, address, delivery_zone, vehicle_type, vehicle_plate, status, rating, total_deliveries, completed_deliveries, active_deliveries)
VALUES
  ('JSS-DRV-01', 'Dave Miller', 'dave.miller@stayte.co.uk', '01452 741235', 'Whitminster Depot, Gloucestershire', 'Gloucester & Stroud', 'LPG Specialized Van', 'GL72 JSS', 'Active', 4.95, 48, 46, 2),
  ('JSS-DRV-02', 'Sarah Jenkins', 'sarah.jenkins@stayte.co.uk', '01452 741236', 'Cheltenham Hub, Gloucestershire', 'Cheltenham & Tewkesbury', 'Commercial Cylinder Truck', 'GL73 JST', 'Active', 4.88, 36, 35, 1),
  ('JSS-DRV-03', 'Mark Evans', 'mark.evans@stayte.co.uk', '01452 741237', 'Cirencester Station, Gloucestershire', 'Cotswolds & Cirencester', 'LPG Express Van', 'GL71 JSS', 'Active', 5.00, 29, 29, 0),
  ('JSS-DRV-04', 'Liam O''Connor', 'liam.oconnor@stayte.co.uk', '01452 741238', 'Forest of Dean Depot, Gloucestershire', 'Forest of Dean & West', 'Heavy LPG Cylinder Rig', 'GL74 JSF', 'Active', 4.80, 22, 22, 0)
ON CONFLICT (agent_code) DO NOTHING;
