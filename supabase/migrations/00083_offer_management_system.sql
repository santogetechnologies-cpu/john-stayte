-- ====================================================================
-- JOHN STAYTE SERVICES - OFFER MANAGEMENT SYSTEM
-- Migration: 00083_offer_management_system.sql
-- ====================================================================

-- 1. ADDITIVE EXTENSION TO public.offers
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS badge TEXT DEFAULT 'Special Offer',
  ADD COLUMN IF NOT EXISTS code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS offer_category TEXT NOT NULL DEFAULT 'product_based' CHECK (offer_category IN ('product_based', 'customer_target_based')),
  ADD COLUMN IF NOT EXISTS discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  ADD COLUMN IF NOT EXISTS max_discount_cap NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS min_order_subtotal NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'scheduled', 'active', 'expired', 'disabled')),
  ADD COLUMN IF NOT EXISTS total_usage_limit INT,
  ADD COLUMN IF NOT EXISTS total_times_used INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS per_customer_limit INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS target_scope TEXT NOT NULL DEFAULT 'all_products' CHECK (target_scope IN ('all_products', 'category', 'specific_products')),
  ADD COLUMN IF NOT EXISTS target_category_slugs TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_product_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_customer_rule TEXT NOT NULL DEFAULT 'all_customers' CHECK (target_customer_rule IN ('all_customers', 'new_customer', 'first_order', 'min_cart_spend', 'lifetime_spend', 'period_spend', 'order_count_milestone', 'consecutive_loyalty', 'referral', 'custom_rule_builder')),
  ADD COLUMN IF NOT EXISTS spend_threshold_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spend_period_days INT DEFAULT 30,
  ADD COLUMN IF NOT EXISTS order_count_target INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS consecutive_days_window INT DEFAULT 30,
  ADD COLUMN IF NOT EXISTS eligibility_conditions JSONB DEFAULT '{"operator": "AND", "rules": []}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_publicly_listed BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_promotional_banner BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS banner_placement TEXT DEFAULT 'top_header',
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS cta_link TEXT DEFAULT '/order-gas',
  ADD COLUMN IF NOT EXISTS cta_text TEXT DEFAULT 'Apply & Shop Now',
  ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_offers_code ON public.offers(code);
CREATE INDEX IF NOT EXISTS idx_offers_status_category ON public.offers(status, offer_category);

-- 2. CREATE TABLE public.offer_redemptions
CREATE TABLE IF NOT EXISTS public.offer_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_email TEXT NOT NULL,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    order_subtotal_before_discount NUMERIC(10,2) NOT NULL DEFAULT 0,
    applied_code TEXT,
    redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offer_redemptions_customer ON public.offer_redemptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_offer_redemptions_offer ON public.offer_redemptions(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_redemptions_order ON public.offer_redemptions(order_id);

-- 3. CREATE TABLE public.customer_referrals
CREATE TABLE IF NOT EXISTS public.customer_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referral_code TEXT UNIQUE NOT NULL,
    referred_email TEXT,
    referred_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
    reward_offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.customer_referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.customer_referrals(referrer_id);

-- 4. EXTEND public.orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS offer_code TEXT;

-- 5. TRIGGER FOR AUTOMATIC USAGE REVERSION ON ORDER ROLLBACK/DELETE
CREATE OR REPLACE FUNCTION public.revert_offer_redemption_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.offers
  SET total_times_used = GREATEST(0, COALESCE(total_times_used, 1) - 1),
      updated_at = NOW()
  WHERE id = OLD.offer_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_revert_offer_usage_on_delete ON public.offer_redemptions;
CREATE TRIGGER trg_revert_offer_usage_on_delete
  AFTER DELETE ON public.offer_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION public.revert_offer_redemption_usage();

-- 6. AUTHORITATIVE ATOMIC VALIDATION & REDEMPTION RPC
CREATE OR REPLACE FUNCTION public.validate_and_redeem_offer(
  p_offer_id UUID,
  p_code TEXT,
  p_user_id UUID,
  p_email TEXT,
  p_cart_items JSONB,
  p_subtotal NUMERIC,
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_offer RECORD;
  v_verified_discount NUMERIC(10,2) := 0;
  v_past_orders_count INT := 0;
  v_past_orders_spend NUMERIC(10,2) := 0;
  v_period_orders_spend NUMERIC(10,2) := 0;
  v_customer_redemptions_count INT := 0;
  v_item JSONB;
  v_qualifying_subtotal NUMERIC(10,2) := 0;
  v_item_price NUMERIC(10,2);
  v_item_qty INT;
  v_prod RECORD;
  v_is_referral_valid BOOLEAN := FALSE;
BEGIN
  -- A. Pessimistic Concurrency Row Lock
  IF p_offer_id IS NOT NULL THEN
    SELECT * INTO v_offer FROM public.offers WHERE id = p_offer_id FOR UPDATE;
  ELSIF p_code IS NOT NULL AND TRIM(p_code) <> '' THEN
    SELECT * INTO v_offer FROM public.offers WHERE LOWER(TRIM(code)) = LOWER(TRIM(p_code)) FOR UPDATE;
  ELSE
    RETURN jsonb_build_object('is_valid', false, 'discount_amount', 0, 'message', 'No offer specified.');
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('is_valid', false, 'discount_amount', 0, 'message', 'Offer not found.');
  END IF;

  -- B. Validate Status & Date Window
  IF v_offer.status <> 'active' OR v_offer.is_active = FALSE THEN
    RETURN jsonb_build_object('is_valid', false, 'discount_amount', 0, 'message', 'This offer is not active.');
  END IF;

  IF (v_offer.starts_at IS NOT NULL AND v_offer.starts_at > NOW()) OR 
     (v_offer.ends_at IS NOT NULL AND v_offer.ends_at < NOW()) OR
     (v_offer.valid_until IS NOT NULL AND v_offer.valid_until < NOW()) THEN
    RETURN jsonb_build_object('is_valid', false, 'discount_amount', 0, 'message', 'This offer has expired.');
  END IF;

  -- C. Validate Minimum Cart Subtotal
  IF v_offer.min_order_subtotal > 0 AND p_subtotal < v_offer.min_order_subtotal THEN
    RETURN jsonb_build_object('is_valid', false, 'discount_amount', 0, 'message', 'Minimum order subtotal not met.');
  END IF;

  -- D. Validate Global Usage Limit
  IF v_offer.total_usage_limit IS NOT NULL AND v_offer.total_times_used >= v_offer.total_usage_limit THEN
    RETURN jsonb_build_object('is_valid', false, 'discount_amount', 0, 'message', 'This offer has reached its maximum total usage limit.');
  END IF;

  -- E. Validate Per-Customer Usage Limit
  IF p_user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_customer_redemptions_count
    FROM public.offer_redemptions
    WHERE offer_id = v_offer.id AND customer_id = p_user_id;
  ELSE
    SELECT COUNT(*) INTO v_customer_redemptions_count
    FROM public.offer_redemptions
    WHERE offer_id = v_offer.id AND LOWER(customer_email) = LOWER(TRIM(p_email));
  END IF;

  IF v_offer.per_customer_limit IS NOT NULL AND v_customer_redemptions_count >= v_offer.per_customer_limit THEN
    RETURN jsonb_build_object('is_valid', false, 'discount_amount', 0, 'message', 'You have already reached the maximum usage limit for this offer.');
  END IF;

  -- F. Validate Customer Eligibility Rules
  IF v_offer.offer_category = 'customer_target_based' THEN
    IF p_user_id IS NOT NULL THEN
      SELECT COUNT(*), COALESCE(SUM(total), 0)
      INTO v_past_orders_count, v_past_orders_spend
      FROM public.orders
      WHERE customer_id = p_user_id AND status <> 'Cancelled';
      
      IF v_offer.target_customer_rule = 'period_spend' THEN
        SELECT COALESCE(SUM(total), 0)
        INTO v_period_orders_spend
        FROM public.orders
        WHERE customer_id = p_user_id 
          AND status <> 'Cancelled'
          AND created_at >= (NOW() - (v_offer.spend_period_days || ' days')::INTERVAL);
      END IF;
    ELSE
      SELECT COUNT(*), COALESCE(SUM(total), 0)
      INTO v_past_orders_count, v_past_orders_spend
      FROM public.orders
      WHERE LOWER(customer_email) = LOWER(TRIM(p_email)) AND status <> 'Cancelled';

      IF v_offer.target_customer_rule = 'period_spend' THEN
        SELECT COALESCE(SUM(total), 0)
        INTO v_period_orders_spend
        FROM public.orders
        WHERE LOWER(customer_email) = LOWER(TRIM(p_email))
          AND status <> 'Cancelled'
          AND created_at >= (NOW() - (v_offer.spend_period_days || ' days')::INTERVAL);
      END IF;
    END IF;

    IF v_offer.target_customer_rule IN ('new_customer', 'first_order') AND v_past_orders_count > 0 THEN
      RETURN jsonb_build_object('is_valid', false, 'discount_amount', 0, 'message', 'This offer is only valid for first-time customers.');
    END IF;

    IF v_offer.target_customer_rule = 'lifetime_spend' AND v_past_orders_spend < v_offer.spend_threshold_amount THEN
      RETURN jsonb_build_object('is_valid', false, 'discount_amount', 0, 'message', 'Lifetime spending requirement not met.');
    END IF;

    IF v_offer.target_customer_rule = 'period_spend' AND v_period_orders_spend < v_offer.spend_threshold_amount THEN
      RETURN jsonb_build_object('is_valid', false, 'discount_amount', 0, 'message', 'Periodic spending requirement not met.');
    END IF;

    IF v_offer.target_customer_rule = 'order_count_milestone' AND (v_past_orders_count + 1) < v_offer.order_count_target THEN
      RETURN jsonb_build_object('is_valid', false, 'discount_amount', 0, 'message', 'Order count milestone not reached.');
    END IF;

    IF v_offer.target_customer_rule = 'referral' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.customer_referrals
        WHERE LOWER(referral_code) = LOWER(TRIM(p_code))
        AND status = 'pending'
      ) INTO v_is_referral_valid;

      IF NOT v_is_referral_valid THEN
        RETURN jsonb_build_object('is_valid', false, 'discount_amount', 0, 'message', 'Referral code is invalid or already used.');
      END IF;
    END IF;
  END IF;

  -- G. Calculate Verified Discount from Qualifying Items
  IF v_offer.target_scope = 'all_products' THEN
    v_qualifying_subtotal := p_subtotal;
  ELSE
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart_items)
    LOOP
      v_item_price := (v_item->>'unit_price')::NUMERIC;
      v_item_qty := (v_item->>'quantity')::INT;
      
      IF v_offer.target_scope = 'category' THEN
        SELECT * INTO v_prod FROM public.products WHERE id = (v_item->>'product_id')::UUID;
        IF v_prod.category_slug = ANY(v_offer.target_category_slugs) THEN
          v_qualifying_subtotal := v_qualifying_subtotal + (v_item_price * v_item_qty);
        END IF;
      ELSIF v_offer.target_scope = 'specific_products' THEN
        IF (v_item->>'product_id')::UUID = ANY(v_offer.target_product_ids) THEN
          v_qualifying_subtotal := v_qualifying_subtotal + (v_item_price * v_item_qty);
        END IF;
      END IF;
    END LOOP;
  END IF;

  IF v_qualifying_subtotal <= 0 THEN
    RETURN jsonb_build_object('is_valid', false, 'discount_amount', 0, 'message', 'Cart contains no qualifying items for this offer.');
  END IF;

  IF v_offer.discount_type = 'percentage' THEN
    v_verified_discount := (v_qualifying_subtotal * (v_offer.discount_value / 100.0));
    IF v_offer.max_discount_cap IS NOT NULL AND v_offer.max_discount_cap > 0 THEN
      v_verified_discount := LEAST(v_verified_discount, v_offer.max_discount_cap);
    END IF;
  ELSIF v_offer.discount_type = 'fixed' THEN
    v_verified_discount := LEAST(v_offer.discount_value, v_qualifying_subtotal);
  END IF;

  -- H. Atomically Insert Redemption Record & Increment Counter
  IF p_order_id IS NOT NULL THEN
    INSERT INTO public.offer_redemptions (
      offer_id,
      order_id,
      customer_id,
      customer_email,
      discount_amount,
      order_subtotal_before_discount,
      applied_code
    )
    VALUES (
      v_offer.id,
      p_order_id,
      p_user_id,
      p_email,
      v_verified_discount,
      p_subtotal,
      COALESCE(p_code, v_offer.code)
    );

    UPDATE public.offers
    SET total_times_used = COALESCE(total_times_used, 0) + 1,
        updated_at = NOW()
    WHERE id = v_offer.id;

    -- If referral offer, mark referral code as completed
    IF v_offer.target_customer_rule = 'referral' AND p_code IS NOT NULL THEN
      UPDATE public.customer_referrals
      SET status = 'completed',
          referred_email = p_email,
          referred_order_id = p_order_id
      WHERE LOWER(referral_code) = LOWER(TRIM(p_code));
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'is_valid', true,
    'discount_amount', v_verified_discount,
    'offer_id', v_offer.id,
    'offer_code', COALESCE(p_code, v_offer.code),
    'message', 'Offer validated and redeemed successfully.'
  );
END;
$$;

-- 7. PREVIEW RPC (Read-only for instant cart preview without taking locks or writing redemptions)
CREATE OR REPLACE FUNCTION public.evaluate_offer_preview(
  p_offer_id UUID,
  p_code TEXT,
  p_user_id UUID,
  p_email TEXT,
  p_cart_items JSONB,
  p_subtotal NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN public.validate_and_redeem_offer(
    p_offer_id,
    p_code,
    p_user_id,
    p_email,
    p_cart_items,
    p_subtotal,
    NULL -- Passing NULL order_id evaluates everything without mutating redemptions
  );
END;
$$;

-- 8. ROW LEVEL SECURITY POLICIES
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_referrals ENABLE ROW LEVEL SECURITY;

-- Offers RLS
DROP POLICY IF EXISTS "Public can view active offers" ON public.offers;
CREATE POLICY "Public can view active offers"
  ON public.offers FOR SELECT
  USING (
    (status = 'active' OR is_active = TRUE) 
    AND (starts_at IS NULL OR starts_at <= NOW()) 
    AND (ends_at IS NULL OR ends_at >= NOW()) 
    AND (valid_until IS NULL OR valid_until >= NOW())
    OR public.is_admin_or_manager()
  );

DROP POLICY IF EXISTS "Staff can manage all offers" ON public.offers;
CREATE POLICY "Staff can manage all offers"
  ON public.offers FOR ALL
  TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

-- Offer Redemptions RLS
DROP POLICY IF EXISTS "Customers can view own redemptions" ON public.offer_redemptions;
CREATE POLICY "Customers can view own redemptions"
  ON public.offer_redemptions FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_admin_or_manager());

DROP POLICY IF EXISTS "Staff can view all redemptions" ON public.offer_redemptions;
CREATE POLICY "Staff can view all redemptions"
  ON public.offer_redemptions FOR SELECT
  TO authenticated
  USING (public.is_admin_or_manager());

-- Customer Referrals RLS
DROP POLICY IF EXISTS "Users can view own referrals" ON public.customer_referrals;
CREATE POLICY "Users can view own referrals"
  ON public.customer_referrals FOR SELECT
  TO authenticated
  USING (referrer_id = auth.uid() OR public.is_admin_or_manager());

DROP POLICY IF EXISTS "Users can generate referrals" ON public.customer_referrals;
CREATE POLICY "Users can generate referrals"
  ON public.customer_referrals FOR INSERT
  TO authenticated
  WITH CHECK (referrer_id = auth.uid());
