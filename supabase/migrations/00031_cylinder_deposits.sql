-- =========================================================================
-- 00031_cylinder_deposits.sql
-- Security Deposit Configuration Table for LPG Cylinders
-- =========================================================================

-- 1. Create Cylinder Deposits Table
CREATE TABLE IF NOT EXISTS public.cylinder_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    deposit_amount NUMERIC(10,2) NOT NULL CHECK (deposit_amount >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by TEXT,
    updated_by TEXT
);

-- 2. Create Indexes for High Performance Queries
CREATE INDEX IF NOT EXISTS idx_cylinder_deposits_product_id ON public.cylinder_deposits(product_id);
CREATE INDEX IF NOT EXISTS idx_cylinder_deposits_is_active ON public.cylinder_deposits(is_active);

-- 3. Enable Row-Level Security
ALTER TABLE public.cylinder_deposits ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- A. Public & Authenticated users can read active deposits
DROP POLICY IF EXISTS "Public can view active cylinder deposits" ON public.cylinder_deposits;
CREATE POLICY "Public can view active cylinder deposits"
  ON public.cylinder_deposits FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- B. Admins & Managers have full read access to all deposits
DROP POLICY IF EXISTS "Staff can view all cylinder deposits" ON public.cylinder_deposits;
CREATE POLICY "Staff can view all cylinder deposits"
  ON public.cylinder_deposits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'manager')
    )
  );

-- C. Staff can insert, update, and delete deposits
DROP POLICY IF EXISTS "Staff can manage cylinder deposits" ON public.cylinder_deposits;
CREATE POLICY "Staff can manage cylinder deposits"
  ON public.cylinder_deposits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'manager')
    )
  );
