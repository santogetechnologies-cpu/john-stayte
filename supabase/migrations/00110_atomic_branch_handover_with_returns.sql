-- Migration: 00110_atomic_branch_handover_with_returns.sql
-- Purpose: Provide an atomic PostgreSQL RPC function to record per-cylinder-type
-- returns and complete Click & Collect order handover in a single transaction
-- with row-level locking (SELECT ... FOR UPDATE) to prevent orphaned records
-- and concurrent duplicate return inserts.
-- NOTE: Staged locally only — DO NOT APPLY TO PRODUCTION WITHOUT REVIEW.

CREATE OR REPLACE FUNCTION public.complete_branch_handover_with_returns(
  p_order_id uuid,
  p_staff_id uuid,
  p_fulfillment_status text DEFAULT 'Completed',
  p_notes text DEFAULT NULL,
  p_cylinder_returns jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_staff public.profiles%ROWTYPE;
  v_role text;
  v_staff_branch_id text;
  v_staff_branch_name text;
  v_order_branch_id text;
  v_order_depot text;
  v_order_col_branch text;
  v_otp_verified boolean := FALSE;
  v_payment_status text;
  v_payment_method text;
  v_is_credit_order boolean := FALSE;
  v_credit_approved boolean := FALSE;
  v_has_existing_returns boolean := FALSE;
  v_is_exchange boolean := FALSE;
  v_returns jsonb := COALESCE(p_cylinder_returns, '[]'::jsonb);
  v_entry jsonb;
  v_product_id uuid;
  v_cylinder_name text;
  v_expected_qty integer;
  v_returned_qty integer;
  v_entry_notes text;
  v_prod_name text;
  v_item_qty integer;
  v_seen_product_ids uuid[] := ARRAY[]::uuid[];
  v_seen_names text[] := ARRAY[]::text[];
  v_resolved_branch_id uuid;
  v_resolved_branch_name text;
  v_inserted_count integer := 0;
BEGIN
  -- Restrict execution to verified server-side service_role callers
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Forbidden: service_role required for atomic handover completion.'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_order_id IS NULL OR p_staff_id IS NULL THEN
    RAISE EXCEPTION 'Order ID and staff ID are required.'
      USING ERRCODE = 'P0001';
  END IF;

  IF jsonb_typeof(v_returns) <> 'array' THEN
    RAISE EXCEPTION 'Cylinder returns payload must be a JSON array.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 1. Lock the target order row to serialize concurrent handover attempts
  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 2. Resolve and verify authenticated staff profile from database
  SELECT *
  INTO v_staff
  FROM public.profiles
  WHERE id = p_staff_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unable to verify staff profile.'
      USING ERRCODE = 'P0001';
  END IF;

  v_role := LOWER(COALESCE(v_staff.role, ''));
  IF v_role NOT IN ('admin', 'manager', 'branch_staff') THEN
    RAISE EXCEPTION 'Forbidden: Branch Staff, Manager, or Admin access required.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_role = 'branch_staff' AND LOWER(COALESCE(v_staff.status, 'active')) = 'inactive' THEN
    RAISE EXCEPTION 'Inactive branch staff accounts cannot complete handovers.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 3. Verify branch ownership for branch_staff
  IF v_role = 'branch_staff' THEN
    v_staff_branch_id := LOWER(TRIM(COALESCE(v_staff.assigned_branch_id::text, '')));
    v_staff_branch_name := LOWER(TRIM(COALESCE(v_staff.assigned_branch, '')));
    v_order_branch_id := LOWER(TRIM(COALESCE(v_order.assigned_branch_id::text, '')));
    v_order_depot := LOWER(TRIM(COALESCE(v_order.assigned_depot, '')));
    v_order_col_branch := LOWER(TRIM(COALESCE(v_order.delivery_address->>'collection_branch', '')));

    IF NOT (
      (v_staff_branch_id <> '' AND v_order_branch_id <> '' AND v_staff_branch_id = v_order_branch_id)
      OR (
        v_staff_branch_name <> ''
        AND (
          (v_order_depot <> '' AND v_order_depot LIKE '%' || v_staff_branch_name || '%')
          OR (v_order_col_branch <> '' AND v_order_col_branch LIKE '%' || v_staff_branch_name || '%')
        )
      )
    ) THEN
      RAISE EXCEPTION 'Forbidden: This order is not assigned to your branch.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- 4. Revalidate OTP verification
  SELECT EXISTS (
    SELECT 1
    FROM public.delivery_assignments da
    WHERE da.order_id = p_order_id
      AND da.otp_verified = TRUE
  )
  INTO v_otp_verified;

  IF NOT v_otp_verified THEN
    RAISE EXCEPTION 'Customer OTP verification is mandatory before completing forecourt handover.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 5. Revalidate payment / approved-credit eligibility
  v_payment_status := LOWER(TRIM(COALESCE(v_order.payment_status, 'Pending')));
  IF v_payment_status <> 'paid' THEN
    IF v_payment_status IN ('failed', 'cancelled', 'canceled') THEN
      RAISE EXCEPTION 'Cannot complete handover: payment status is %.', COALESCE(v_order.payment_status, 'Failed')
        USING ERRCODE = 'P0001';
    END IF;

    v_payment_method := LOWER(TRIM(COALESCE(v_order.delivery_address->>'payment_method', '')));
    v_is_credit_order :=
      (v_payment_method LIKE '%credit account%')
      OR (LOWER(COALESCE(v_order.notes, '')) LIKE '%credit account%');

    IF v_is_credit_order AND v_order.customer_id IS NOT NULL THEN
      SELECT
        COALESCE(p.credit_account_approved, FALSE)
        OR COALESCE((p.notification_prefs->'gas_application'->>'credit_account_approved')::BOOLEAN, FALSE)
      INTO v_credit_approved
      FROM public.profiles p
      WHERE p.id = v_order.customer_id;
    END IF;

    IF NOT COALESCE(v_credit_approved, FALSE) THEN
      RAISE EXCEPTION 'Payment or approved credit is required before completing handover.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- 6. Check existing cylinder return records under lock (idempotent retry guard)
  SELECT EXISTS (
    SELECT 1
    FROM public.order_cylinder_returns r
    WHERE r.order_id = p_order_id
  )
  INTO v_has_existing_returns;

  IF v_order.status = 'Delivered' AND (v_has_existing_returns OR jsonb_array_length(v_returns) = 0) THEN
    RETURN jsonb_build_object(
      'ok', TRUE,
      'already_completed', TRUE,
      'order_id', p_order_id,
      'cylinder_returns_recorded', 0
    );
  END IF;

  -- 7. Validate cylinder returns against trusted order_items and products
  v_is_exchange :=
    COALESCE((v_order.delivery_address->>'empty_cylinder_required')::BOOLEAN, FALSE)
    OR COALESCE(v_order.notes, '') LIKE '%Empty Cylinder Required: Yes%'
    OR COALESCE(v_order.notes, '') LIKE '%REFILL_EXCHANGE%';

  IF v_is_exchange AND NOT v_has_existing_returns AND jsonb_array_length(v_returns) = 0 THEN
    RAISE EXCEPTION 'Cylinder return records are required for refill-exchange orders.'
      USING ERRCODE = 'P0001';
  END IF;

  v_resolved_branch_id := COALESCE(
    v_order.assigned_branch_id,
    CASE WHEN v_role = 'branch_staff' THEN v_staff.assigned_branch_id ELSE NULL END
  );
  v_resolved_branch_name := TRIM(COALESCE(
    NULLIF(v_order.assigned_depot, ''),
    NULLIF(v_order.delivery_address->>'collection_branch', ''),
    CASE WHEN v_role = 'branch_staff' THEN v_staff.assigned_branch ELSE '' END,
    ''
  ));

  IF NOT v_has_existing_returns AND jsonb_array_length(v_returns) > 0 THEN
    FOR v_entry IN SELECT * FROM jsonb_array_elements(v_returns)
    LOOP
      v_cylinder_name := TRIM(COALESCE(v_entry->>'cylinder_name', ''));
      IF v_cylinder_name = '' THEN
        RAISE EXCEPTION 'Cylinder name is required for each return record.'
          USING ERRCODE = 'P0001';
      END IF;

      -- Validate non-negative integer quantities
      IF (v_entry->>'expected_quantity') !~ '^\d+$' OR (v_entry->>'returned_quantity') !~ '^\d+$' THEN
        RAISE EXCEPTION 'Invalid quantity for "%": expected and returned quantities must be non-negative integers.', v_cylinder_name
          USING ERRCODE = 'P0001';
      END IF;

      v_expected_qty := (v_entry->>'expected_quantity')::integer;
      v_returned_qty := (v_entry->>'returned_quantity')::integer;
      v_entry_notes := NULLIF(TRIM(COALESCE(v_entry->>'notes', '')), '');

      v_product_id := NULL;
      IF NULLIF(TRIM(COALESCE(v_entry->>'product_id', '')), '') IS NOT NULL THEN
        v_product_id := (TRIM(v_entry->>'product_id'))::uuid;

        IF v_product_id = ANY(v_seen_product_ids) THEN
          RAISE EXCEPTION 'Duplicate cylinder return entry for product "%".', v_cylinder_name
            USING ERRCODE = 'P0001';
        END IF;
        v_seen_product_ids := array_append(v_seen_product_ids, v_product_id);

        SELECT p.name
        INTO v_prod_name
        FROM public.products p
        WHERE p.id = v_product_id;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Invalid cylinder product ID for "%".', v_cylinder_name
            USING ERRCODE = 'P0001';
        END IF;

        IF LOWER(TRIM(v_prod_name)) <> LOWER(v_cylinder_name) THEN
          RAISE EXCEPTION 'Cylinder name "%" does not match product record "%".', v_cylinder_name, v_prod_name
            USING ERRCODE = 'P0001';
        END IF;

        -- Verify expected quantity against order_items
        SELECT COALESCE(SUM(oi.quantity), 0)
        INTO v_item_qty
        FROM public.order_items oi
        WHERE oi.order_id = p_order_id
          AND oi.product_id = v_product_id;

        IF v_item_qty > 0 THEN
          IF v_expected_qty <> (CASE WHEN v_is_exchange THEN v_item_qty ELSE 0 END) THEN
            RAISE EXCEPTION 'Manipulated expected quantity for "%": expected %, got %.', v_prod_name, (CASE WHEN v_is_exchange THEN v_item_qty ELSE 0 END), v_expected_qty
              USING ERRCODE = 'P0001';
          END IF;
        ELSE
          -- Alternative returned cylinder type: must have expected_quantity = 0 and returned_quantity > 0
          IF v_expected_qty <> 0 OR v_returned_qty <= 0 THEN
            RAISE EXCEPTION 'Alternative cylinder return "%" must have expected quantity 0 and returned quantity > 0.', v_prod_name
              USING ERRCODE = 'P0001';
          END IF;
        END IF;

        v_cylinder_name := v_prod_name;
      ELSE
        IF LOWER(v_cylinder_name) = ANY(v_seen_names) THEN
          RAISE EXCEPTION 'Duplicate cylinder return entry for "%".', v_cylinder_name
            USING ERRCODE = 'P0001';
        END IF;
        v_seen_names := array_append(v_seen_names, LOWER(v_cylinder_name));
      END IF;

      INSERT INTO public.order_cylinder_returns (
        order_id,
        branch_id,
        branch_name,
        product_id,
        cylinder_name,
        expected_quantity,
        returned_quantity,
        recorded_by,
        recorded_at,
        notes
      ) VALUES (
        p_order_id,
        v_resolved_branch_id,
        v_resolved_branch_name,
        v_product_id,
        v_cylinder_name,
        v_expected_qty,
        v_returned_qty,
        p_staff_id,
        now(),
        v_entry_notes
      );

      v_inserted_count := v_inserted_count + 1;
    END LOOP;

    IF v_is_exchange THEN
      IF EXISTS (
        SELECT 1
        FROM public.order_items oi
        WHERE oi.order_id = p_order_id
          AND oi.product_id IS NOT NULL
          AND NOT (oi.product_id = ANY(v_seen_product_ids))
      ) THEN
        RAISE EXCEPTION 'Missing cylinder return record for an expected exchange cylinder.'
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;

  -- 8. Complete order atomically within the same transaction
  UPDATE public.orders
  SET
    status = 'Delivered',
    fulfillment_status = COALESCE(NULLIF(TRIM(p_fulfillment_status), ''), 'Completed'),
    notes = COALESCE(p_notes, notes),
    updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'already_completed', FALSE,
    'order_id', p_order_id,
    'cylinder_returns_recorded', v_inserted_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_branch_handover_with_returns(uuid, uuid, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_branch_handover_with_returns(uuid, uuid, text, text, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_branch_handover_with_returns(uuid, uuid, text, text, jsonb) TO service_role;
