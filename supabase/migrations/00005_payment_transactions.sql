-- ====================================================================
-- MIGRATION: 00005_payment_transactions.sql
-- Production Payment Schema for Stripe Integration
-- ====================================================================

-- 1. Create Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  payment_provider TEXT DEFAULT 'stripe',
  payment_intent_id TEXT UNIQUE,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded')),
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'GBP',
  receipt_email TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add payment_status column to orders if not exists
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'payment_status'
  ) THEN 
    ALTER TABLE public.orders ADD COLUMN payment_status TEXT DEFAULT 'unpaid';
  END IF;
END $$;

-- 3. Enable RLS on Payments Table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for Payments
DROP POLICY IF EXISTS "Customers can view own payments" ON public.payments;
CREATE POLICY "Customers can view own payments"
  ON public.payments FOR SELECT
  USING (
    customer_id = auth.uid() 
    OR public.is_admin_or_manager()
    OR EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = payments.order_id
      AND customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff can manage all payments" ON public.payments;
CREATE POLICY "Staff can manage all payments"
  ON public.payments FOR ALL
  USING (public.is_admin_or_manager());
