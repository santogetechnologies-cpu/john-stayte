-- ====================================================================
-- JOHN STAYTE SERVICES - PRODUCTION HARDENING & APPLICATIONS MIGRATION
-- Migration: 00067_production_hardening_and_applications.sql
-- ====================================================================

-- 1. DEDICATED GAS CUSTOMER APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.gas_customer_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  date_of_birth DATE,
  street_address TEXT NOT NULL,
  city TEXT NOT NULL,
  postcode TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  billing_address TEXT,
  preferred_contact_method TEXT DEFAULT 'email',
  usage_type TEXT NOT NULL CHECK (usage_type IN ('DOMESTIC', 'COMMERCIAL', 'BULK', 'AUTOGAS')),
  business_name TEXT,
  business_type TEXT,
  business_address TEXT,
  business_contact TEXT,
  existing_cylinder_status TEXT,
  cylinder_type TEXT,
  cylinder_size TEXT,
  order_requirement TEXT,
  declaration_accepted BOOLEAN NOT NULL DEFAULT TRUE,
  signature_data TEXT NOT NULL,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('NOT_COMPLETED', 'SUBMITTED', 'APPROVED', 'REJECTED')),
  admin_notes TEXT,
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast customer queries
CREATE INDEX IF NOT EXISTS idx_gas_customer_apps_customer ON public.gas_customer_applications(customer_id);
CREATE INDEX IF NOT EXISTS idx_gas_customer_apps_status ON public.gas_customer_applications(status);

-- Enable RLS
ALTER TABLE public.gas_customer_applications ENABLE ROW LEVEL SECURITY;

-- Applications RLS Policies
DROP POLICY IF EXISTS "Customers can view own applications" ON public.gas_customer_applications;
CREATE POLICY "Customers can view own applications"
  ON public.gas_customer_applications FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_admin_or_manager());

DROP POLICY IF EXISTS "Customers can insert own applications" ON public.gas_customer_applications;
CREATE POLICY "Customers can insert own applications"
  ON public.gas_customer_applications FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid() OR public.is_admin_or_manager());

DROP POLICY IF EXISTS "Customers can update own application before approval" ON public.gas_customer_applications;
CREATE POLICY "Customers can update own application before approval"
  ON public.gas_customer_applications FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_admin_or_manager())
  WITH CHECK (customer_id = auth.uid() OR public.is_admin_or_manager());

DROP POLICY IF EXISTS "Staff can delete applications" ON public.gas_customer_applications;
CREATE POLICY "Staff can delete applications"
  ON public.gas_customer_applications FOR DELETE
  TO authenticated
  USING (public.is_admin_or_manager());

-- 2. HARDEN ORDERS INSERT POLICY (ELIMINATE customer_id IS NULL VULNERABILITY)
DROP POLICY IF EXISTS "Customers can insert own orders" ON public.orders;
CREATE POLICY "Customers can insert own orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = customer_id AND customer_id IS NOT NULL) OR 
    public.is_admin_or_manager()
  );

-- 3. HARDEN ORDER_ITEMS INSERT POLICY
DROP POLICY IF EXISTS "Users can insert order items" ON public.order_items;
CREATE POLICY "Users can insert order items"
  ON public.order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_items.order_id
      AND (customer_id = auth.uid() OR public.is_admin_or_manager())
    ) OR public.is_admin_or_manager()
  );

-- 4. HARDEN PROFILES ROLE RESTRICTION
-- Prevent customers from elevating their own role during self-update
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin_or_manager())
  WITH CHECK (
    public.is_admin_or_manager() OR 
    (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
  );
