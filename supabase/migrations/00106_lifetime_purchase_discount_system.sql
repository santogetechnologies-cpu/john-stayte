-- ====================================================================
-- JOHN STAYTE SERVICES - CUSTOMER LIFETIME PURCHASE-BASED DISCOUNT SYSTEM
-- Migration: 00106_lifetime_purchase_discount_system.sql
-- Forward-only migration (held for user approval before production apply):
--   1. public.lifetime_discount_config (programme active/inactive toggle)
--   2. public.lifetime_discount_tiers (5 initial spend-based tiers)
--   3. public.customer_lifetime_eligibility (cached per-customer spend & tier)
--   4. SECURITY DEFINER recalculation & query RPCs + orders trigger
--   Preserves all 66 existing pricing bands, 157 branch prices,
--   special customer pricing, and existing customer assignments.
-- ====================================================================

-- 1. Programme Configuration Table (Single-Row)
CREATE TABLE IF NOT EXISTS public.lifetime_discount_config (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.lifetime_discount_config (id, is_enabled)
VALUES (TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.lifetime_discount_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read lifetime discount config" ON public.lifetime_discount_config;
CREATE POLICY "Authenticated users can read lifetime discount config"
  ON public.lifetime_discount_config FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Admins and Managers can manage lifetime discount config" ON public.lifetime_discount_config;
DROP POLICY IF EXISTS "Admins can manage lifetime discount config" ON public.lifetime_discount_config;
CREATE POLICY "Admins can manage lifetime discount config"
  ON public.lifetime_discount_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- 2. Discount Tiers Table
CREATE TABLE IF NOT EXISTS public.lifetime_discount_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name TEXT NOT NULL,
  min_spend NUMERIC(12,2) NOT NULL CHECK (min_spend >= 0),
  max_spend NUMERIC(12,2) NULL CHECK (max_spend IS NULL OR max_spend >= min_spend),
  discount_percentage NUMERIC(5,2) NOT NULL CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifetime_discount_tiers_active_spend
  ON public.lifetime_discount_tiers (is_active, min_spend ASC);

-- Seed initial 5 business tiers idempotently
INSERT INTO public.lifetime_discount_tiers (id, tier_name, min_spend, max_spend, discount_percentage, is_active, display_order)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'Standard Starter', 0.00, 499.99, 0.00, TRUE, 1),
  ('10000000-0000-4000-8000-000000000002', 'Bronze Loyalty (10%)', 500.00, 999.99, 10.00, TRUE, 2),
  ('10000000-0000-4000-8000-000000000003', 'Silver Loyalty (17.5%)', 1000.00, 2499.99, 17.50, TRUE, 3),
  ('10000000-0000-4000-8000-000000000004', 'Gold Loyalty (20%)', 2500.00, 4999.99, 20.00, TRUE, 4),
  ('10000000-0000-4000-8000-000000000005', 'Platinum Loyalty (25%)', 5000.00, NULL, 25.00, TRUE, 5)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.lifetime_discount_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read lifetime discount tiers" ON public.lifetime_discount_tiers;
CREATE POLICY "Authenticated users can read lifetime discount tiers"
  ON public.lifetime_discount_tiers FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Admins and Managers can manage lifetime discount tiers" ON public.lifetime_discount_tiers;
DROP POLICY IF EXISTS "Admins can manage lifetime discount tiers" ON public.lifetime_discount_tiers;
CREATE POLICY "Admins can manage lifetime discount tiers"
  ON public.lifetime_discount_tiers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- 3. Customer Lifetime Eligibility Cache Table (non-intrusive to profiles)
CREATE TABLE IF NOT EXISTS public.customer_lifetime_eligibility (
  customer_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  eligible_spend NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  eligible_order_count INTEGER NOT NULL DEFAULT 0,
  current_tier_id UUID REFERENCES public.lifetime_discount_tiers(id) ON DELETE SET NULL,
  current_tier_name TEXT,
  discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  recalculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.customer_lifetime_eligibility ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can read own lifetime eligibility" ON public.customer_lifetime_eligibility;
CREATE POLICY "Customers can read own lifetime eligibility"
  ON public.customer_lifetime_eligibility FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_admin_or_manager());

DROP POLICY IF EXISTS "Admins and Managers can manage lifetime eligibility" ON public.customer_lifetime_eligibility;
DROP POLICY IF EXISTS "Admins can manage lifetime eligibility" ON public.customer_lifetime_eligibility;
CREATE POLICY "Admins can manage lifetime eligibility"
  ON public.customer_lifetime_eligibility FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- 4. Authoritative Lifetime Spend & Tier Recalculation Function
-- Counts only unique, completed/paid orders; excludes Cancelled, Failed, Refunded.
CREATE OR REPLACE FUNCTION public.recalculate_customer_lifetime_eligibility(p_customer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_spend NUMERIC(12,2) := 0.00;
  v_count INTEGER := 0;
  v_tier RECORD;
  v_enabled BOOLEAN := TRUE;
BEGIN
  IF p_customer_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'customer_id is required');
  END IF;

  SELECT COALESCE(is_enabled, TRUE) INTO v_enabled
  FROM public.lifetime_discount_config
  WHERE id = TRUE;

  -- Sum distinct eligible orders for this customer
  SELECT
    COALESCE(SUM(COALESCE(o.total, 0)), 0.00),
    COUNT(DISTINCT o.id)
  INTO v_spend, v_count
  FROM public.orders o
  WHERE o.customer_id = p_customer_id
    AND COALESCE(LOWER(o.status), '') NOT IN ('cancelled', 'canceled', 'failed', 'refunded')
    AND COALESCE(LOWER(o.payment_status), '') NOT IN ('failed', 'cancelled', 'canceled', 'refunded')
    AND (
      LOWER(COALESCE(o.status, '')) = 'delivered'
      OR LOWER(COALESCE(o.payment_status, '')) = 'paid'
    );

  -- Match highest active tier whose min_spend <= v_spend
  SELECT id, tier_name, discount_percentage
  INTO v_tier
  FROM public.lifetime_discount_tiers
  WHERE is_active = TRUE
    AND min_spend <= v_spend
    AND (max_spend IS NULL OR v_spend <= max_spend)
  ORDER BY min_spend DESC, discount_percentage DESC
  LIMIT 1;

  -- Fallback if spend exceeds a tier with max_spend gap: pick highest tier with min_spend <= v_spend
  IF v_tier.id IS NULL THEN
    SELECT id, tier_name, discount_percentage
    INTO v_tier
    FROM public.lifetime_discount_tiers
    WHERE is_active = TRUE
      AND min_spend <= v_spend
    ORDER BY min_spend DESC, discount_percentage DESC
    LIMIT 1;
  END IF;

  INSERT INTO public.customer_lifetime_eligibility (
    customer_id,
    eligible_spend,
    eligible_order_count,
    current_tier_id,
    current_tier_name,
    discount_percentage,
    recalculated_at
  )
  VALUES (
    p_customer_id,
    v_spend,
    v_count,
    v_tier.id,
    COALESCE(v_tier.tier_name, 'Standard Starter'),
    CASE WHEN v_enabled THEN COALESCE(v_tier.discount_percentage, 0.00) ELSE 0.00 END,
    NOW()
  )
  ON CONFLICT (customer_id) DO UPDATE SET
    eligible_spend = EXCLUDED.eligible_spend,
    eligible_order_count = EXCLUDED.eligible_order_count,
    current_tier_id = EXCLUDED.current_tier_id,
    current_tier_name = EXCLUDED.current_tier_name,
    discount_percentage = EXCLUDED.discount_percentage,
    recalculated_at = NOW();

  RETURN jsonb_build_object(
    'ok', true,
    'customer_id', p_customer_id,
    'eligible_spend', v_spend,
    'eligible_order_count', v_count,
    'tier_id', v_tier.id,
    'tier_name', COALESCE(v_tier.tier_name, 'Standard Starter'),
    'discount_percentage', CASE WHEN v_enabled THEN COALESCE(v_tier.discount_percentage, 0.00) ELSE 0.00 END,
    'programme_enabled', v_enabled
  );
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_customer_lifetime_eligibility(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_customer_lifetime_eligibility(UUID) TO service_role;

-- 5. Automatic Trigger on public.orders to Recalculate Customer Eligibility
CREATE OR REPLACE FUNCTION public.trg_fn_recalc_customer_lifetime_eligibility()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    PERFORM public.recalculate_customer_lifetime_eligibility(NEW.customer_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_customer_lifetime_eligibility ON public.orders;
CREATE TRIGGER trg_recalc_customer_lifetime_eligibility
  AFTER INSERT OR UPDATE OF status, payment_status, total ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_recalc_customer_lifetime_eligibility();

-- 6. Authenticated RPC to Fetch Customer's Own Lifetime Discount & Next Tier Progress
CREATE OR REPLACE FUNCTION public.get_customer_lifetime_discount(p_customer_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target_id UUID;
  v_recalc JSONB;
  v_spend NUMERIC(12,2);
  v_next_tier RECORD;
BEGIN
  v_target_id := COALESCE(p_customer_id, auth.uid());
  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_target_id <> auth.uid() AND NOT public.is_admin_or_manager() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_recalc := public.recalculate_customer_lifetime_eligibility(v_target_id);
  v_spend := COALESCE((v_recalc->>'eligible_spend')::NUMERIC, 0.00);

  SELECT id, tier_name, min_spend, discount_percentage
  INTO v_next_tier
  FROM public.lifetime_discount_tiers
  WHERE is_active = TRUE
    AND min_spend > v_spend
  ORDER BY min_spend ASC
  LIMIT 1;

  RETURN v_recalc || jsonb_build_object(
    'next_tier_id', v_next_tier.id,
    'next_tier_name', v_next_tier.tier_name,
    'next_tier_min_spend', v_next_tier.min_spend,
    'next_tier_discount_percentage', v_next_tier.discount_percentage,
    'remaining_to_next_tier', CASE WHEN v_next_tier.min_spend IS NOT NULL THEN GREATEST(0, v_next_tier.min_spend - v_spend) ELSE 0 END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_customer_lifetime_discount(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_customer_lifetime_discount(UUID) TO authenticated, service_role;
