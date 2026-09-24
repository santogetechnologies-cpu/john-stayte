-- ====================================================================
-- JOHN STAYTE SERVICES - OFFER MANAGEMENT SYSTEM ENHANCEMENT
-- Migration: 00084_offer_condition_engine_and_loyalty.sql
-- Completes:
-- 1. Consecutive / Loyalty targeting logic
-- 2. Custom AND / OR nested JSONB condition evaluator
-- 3. Specific product & category deep cart evaluation
-- ====================================================================

-- 1. RECURSIVE CONDITION NODE EVALUATOR FUNCTION
CREATE OR REPLACE FUNCTION public.evaluate_offer_condition_node(
  p_node JSONB,
  p_user_id UUID,
  p_email TEXT,
  p_cart_items JSONB,
  p_subtotal NUMERIC,
  p_depth INT DEFAULT 0
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_op TEXT;
  v_conditions JSONB;
  v_child JSONB;
  v_child_result BOOLEAN;
  v_cond_type TEXT;
  v_val NUMERIC;
  v_days INT;
  v_past_orders_count INT := 0;
  v_past_orders_spend NUMERIC(10,2) := 0;
  v_period_orders_spend NUMERIC(10,2) := 0;
  v_has_recent_order BOOLEAN := FALSE;
  v_item JSONB;
  v_prod RECORD;
  v_target_cat TEXT;
  v_target_prod_id TEXT;
  v_has_matching_item BOOLEAN := FALSE;
  v_is_referral_valid BOOLEAN := FALSE;
BEGIN
  -- Depth guard to prevent infinite recursion / stack abuse
  IF p_depth > 5 THEN
    RETURN FALSE;
  END IF;

  -- Null or empty node passes safely
  IF p_node IS NULL OR p_node = 'null'::jsonb OR p_node = '{}'::jsonb THEN
    RETURN TRUE;
  END IF;

  -- Check if node is a Group with an Operator ("AND" / "OR")
  IF p_node ? 'operator' THEN
    v_op := UPPER(TRIM(p_node->>'operator'));
    v_conditions := COALESCE(p_node->'conditions', p_node->'rules');

    IF v_conditions IS NULL OR jsonb_typeof(v_conditions) <> 'array' OR jsonb_array_length(v_conditions) = 0 THEN
      RETURN TRUE;
    END IF;

    IF v_op = 'OR' THEN
      FOR v_child IN SELECT * FROM jsonb_array_elements(v_conditions)
      LOOP
        v_child_result := public.evaluate_offer_condition_node(v_child, p_user_id, p_email, p_cart_items, p_subtotal, p_depth + 1);
        IF v_child_result = TRUE THEN
          RETURN TRUE;
        END IF;
      END LOOP;
      RETURN FALSE; -- None of the OR conditions passed
    ELSE -- Default to AND
      FOR v_child IN SELECT * FROM jsonb_array_elements(v_conditions)
      LOOP
        v_child_result := public.evaluate_offer_condition_node(v_child, p_user_id, p_email, p_cart_items, p_subtotal, p_depth + 1);
        IF v_child_result = FALSE THEN
          RETURN FALSE; -- At least one AND condition failed
        END IF;
      END LOOP;
      RETURN TRUE; -- All AND conditions passed
    END IF;
  END IF;

  -- Otherwise, node is a Leaf Condition with a "type"
  IF p_node ? 'type' THEN
    v_cond_type := LOWER(TRIM(p_node->>'type'));

    -- 1. Cart Subtotal Condition
    IF v_cond_type = 'min_cart_subtotal' THEN
      v_val := COALESCE((p_node->>'value')::NUMERIC, 0);
      RETURN p_subtotal >= v_val;
    END IF;

    -- Load Customer History for Customer Conditions
    IF p_user_id IS NOT NULL THEN
      SELECT COUNT(*), COALESCE(SUM(total), 0)
      INTO v_past_orders_count, v_past_orders_spend
      FROM public.orders
      WHERE customer_id = p_user_id AND status <> 'Cancelled';
    ELSE
      SELECT COUNT(*), COALESCE(SUM(total), 0)
      INTO v_past_orders_count, v_past_orders_spend
      FROM public.orders
      WHERE LOWER(customer_email) = LOWER(TRIM(p_email)) AND status <> 'Cancelled';
    END IF;

    -- 2. New Customer / First Order
    IF v_cond_type IN ('new_customer', 'first_order') THEN
      RETURN v_past_orders_count = 0;
    END IF;

    -- 3. Lifetime Spend Tier
    IF v_cond_type = 'lifetime_spend' THEN
      v_val := COALESCE((p_node->>'value')::NUMERIC, 0);
      RETURN v_past_orders_spend >= v_val;
    END IF;

    -- 4. Period Spend Tier
    IF v_cond_type = 'period_spend' THEN
      v_val := COALESCE((p_node->>'value')::NUMERIC, 0);
      v_days := COALESCE((p_node->>'days')::INT, 30);
      IF p_user_id IS NOT NULL THEN
        SELECT COALESCE(SUM(total), 0) INTO v_period_orders_spend
        FROM public.orders
        WHERE customer_id = p_user_id
          AND status <> 'Cancelled'
          AND created_at >= (NOW() - (v_days || ' days')::INTERVAL);
      ELSE
        SELECT COALESCE(SUM(total), 0) INTO v_period_orders_spend
        FROM public.orders
        WHERE LOWER(customer_email) = LOWER(TRIM(p_email))
          AND status <> 'Cancelled'
          AND created_at >= (NOW() - (v_days || ' days')::INTERVAL);
      END IF;
      RETURN v_period_orders_spend >= v_val;
    END IF;

    -- 5. Order Count Milestone
    IF v_cond_type IN ('order_count', 'order_count_milestone') THEN
      v_val := COALESCE((p_node->>'value')::INT, 1);
      RETURN (v_past_orders_count + 1) >= v_val;
    END IF;

    -- 6. Consecutive Order Loyalty
    IF v_cond_type = 'consecutive_loyalty' THEN
      v_days := COALESCE((p_node->>'days')::INT, 30);
      IF v_past_orders_count = 0 THEN
        RETURN FALSE;
      END IF;
      IF p_user_id IS NOT NULL THEN
        SELECT EXISTS (
          SELECT 1 FROM public.orders
          WHERE customer_id = p_user_id
            AND status <> 'Cancelled'
            AND created_at >= (NOW() - (v_days || ' days')::INTERVAL)
        ) INTO v_has_recent_order;
      ELSE
        SELECT EXISTS (
          SELECT 1 FROM public.orders
          WHERE LOWER(customer_email) = LOWER(TRIM(p_email))
            AND status <> 'Cancelled'
            AND created_at >= (NOW() - (v_days || ' days')::INTERVAL)
        ) INTO v_has_recent_order;
      END IF;
      RETURN v_has_recent_order;
    END IF;

    -- 7. Referral Program
    IF v_cond_type = 'referral' THEN
      IF p_node ? 'code' AND TRIM(p_node->>'code') <> '' THEN
        SELECT EXISTS (
          SELECT 1 FROM public.customer_referrals
          WHERE LOWER(referral_code) = LOWER(TRIM(p_node->>'code'))
            AND status = 'pending'
        ) INTO v_is_referral_valid;
        RETURN v_is_referral_valid;
      END IF;
      RETURN TRUE;
    END IF;

    -- 8. Cart Contains Category
    IF v_cond_type = 'contains_category' THEN
      v_target_cat := LOWER(TRIM(COALESCE(p_node->>'category', p_node->>'value')));
      IF p_cart_items IS NOT NULL THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart_items)
        LOOP
          IF (v_item->>'product_id') IS NOT NULL THEN
            SELECT * INTO v_prod FROM public.products WHERE id = (v_item->>'product_id')::UUID;
            IF v_prod.category_slug IS NOT NULL AND LOWER(v_prod.category_slug) = v_target_cat THEN
              RETURN TRUE;
            END IF;
          END IF;
        END LOOP;
      END IF;
      RETURN FALSE;
    END IF;

    -- 9. Cart Contains Product
    IF v_cond_type = 'contains_product' THEN
      v_target_prod_id := LOWER(TRIM(COALESCE(p_node->>'product_id', p_node->>'value')));
      IF p_cart_items IS NOT NULL THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart_items)
        LOOP
          IF LOWER(COALESCE(v_item->>'product_id', '')) = v_target_prod_id THEN
            RETURN TRUE;
          END IF;
        END LOOP;
      END IF;
      RETURN FALSE;
    END IF;

    -- Unknown condition leaf type: fail safely
    RETURN FALSE;
  END IF;

  -- Unrecognized format: fail safely
  RETURN FALSE;
END;
$$;


-- 2. UPDATED AUTHORITATIVE VALIDATION & REDEMPTION RPC
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
  v_is_loyalty_valid BOOLEAN := FALSE;
  v_is_custom_valid BOOLEAN := TRUE;
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

    -- Precise Consecutive Loyalty Logic
    IF v_offer.target_customer_rule = 'consecutive_loyalty' THEN
      IF v_past_orders_count = 0 THEN
        RETURN jsonb_build_object('is_valid', false, 'discount_amount', 0, 'message', 'This offer requires previous order history to maintain loyalty status.');
      END IF;

      IF p_user_id IS NOT NULL THEN
        SELECT EXISTS (
          SELECT 1 FROM public.orders
          WHERE customer_id = p_user_id
            AND status <> 'Cancelled'
            AND created_at >= (NOW() - (COALESCE(v_offer.consecutive_days_window, 30) || ' days')::INTERVAL)
        ) INTO v_is_loyalty_valid;
      ELSE
        SELECT EXISTS (
          SELECT 1 FROM public.orders
          WHERE LOWER(customer_email) = LOWER(TRIM(p_email))
            AND status <> 'Cancelled'
            AND created_at >= (NOW() - (COALESCE(v_offer.consecutive_days_window, 30) || ' days')::INTERVAL)
        ) INTO v_is_loyalty_valid;
      END IF;

      IF NOT v_is_loyalty_valid THEN
        RETURN jsonb_build_object('is_valid', false, 'discount_amount', 0, 'message', 'Loyalty window expired. An order was required within the past ' || COALESCE(v_offer.consecutive_days_window, 30) || ' days.');
      END IF;
    END IF;

    -- Referral Program
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

    -- Custom AND / OR Condition Tree Evaluator
    IF v_offer.target_customer_rule = 'custom_rule_builder' OR (
      v_offer.eligibility_conditions IS NOT NULL 
      AND (v_offer.eligibility_conditions ? 'conditions' OR v_offer.eligibility_conditions ? 'rules')
      AND jsonb_array_length(COALESCE(v_offer.eligibility_conditions->'conditions', v_offer.eligibility_conditions->'rules')) > 0
    ) THEN
      v_is_custom_valid := public.evaluate_offer_condition_node(
        v_offer.eligibility_conditions,
        p_user_id,
        p_email,
        p_cart_items,
        p_subtotal,
        0
      );

      IF NOT v_is_custom_valid THEN
        RETURN jsonb_build_object('is_valid', false, 'discount_amount', 0, 'message', 'Cart or customer does not meet the custom eligibility conditions for this offer.');
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
