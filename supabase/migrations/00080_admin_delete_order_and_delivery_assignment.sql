-- ====================================================================
-- JOHN STAYTE SERVICES - SECURE ADMIN DELETE ORDER & DELIVERY ASSIGNMENT
-- Migration: 00080_admin_delete_order_and_delivery_assignment.sql
-- ====================================================================

-- 1. Secure Admin Delete Order Function
DROP FUNCTION IF EXISTS public.admin_delete_order(UUID);
DROP FUNCTION IF EXISTS public.admin_delete_order;

CREATE OR REPLACE FUNCTION public.admin_delete_order(target_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_calling_user_id UUID;
  v_calling_role TEXT;
  v_order_number TEXT;
  v_customer_name TEXT;
  v_customer_email TEXT;
  v_status TEXT;
  v_total NUMERIC;
BEGIN
  -- 1. Security Check: Caller must be authenticated
  v_calling_user_id := auth.uid();
  IF v_calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- 2. Authorization Check: Caller MUST be an Administrator or Manager in public.profiles
  SELECT role INTO v_calling_role
  FROM public.profiles
  WHERE id = v_calling_user_id;

  IF v_calling_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Unauthorized: Only Administrators and Managers are authorized to delete orders.';
  END IF;

  -- 3. Target Order Validation
  SELECT order_number, customer_name, customer_email, status, total
  INTO v_order_number, v_customer_name, v_customer_email, v_status, v_total
  FROM public.orders
  WHERE id = target_order_id;

  IF v_order_number IS NULL THEN
    RAISE EXCEPTION 'Order record not found.';
  END IF;

  -- 4. Clean up / Decouple dependent records
  -- Decouple reviews and support tickets to preserve customer ticket history without dangling references
  UPDATE public.reviews
  SET order_id = NULL
  WHERE order_id = target_order_id;

  UPDATE public.support_tickets
  SET order_id = NULL
  WHERE order_id = target_order_id;

  -- Delete associated operational child records
  DELETE FROM public.delivery_assignments WHERE order_id = target_order_id;
  DELETE FROM public.order_items WHERE order_id = target_order_id;
  DELETE FROM public.order_status_history WHERE order_id = target_order_id;
  DELETE FROM public.invoices WHERE order_id = target_order_id;
  DELETE FROM public.payments WHERE order_id = target_order_id;

  -- 5. Delete Order Record from public.orders
  DELETE FROM public.orders WHERE id = target_order_id;

  -- 6. Record Audit Log
  BEGIN
    INSERT INTO public.audit_logs (
      actor_id,
      actor_name,
      action,
      target_type,
      target_id,
      metadata
    )
    VALUES (
      v_calling_user_id,
      COALESCE((SELECT full_name FROM public.profiles WHERE id = v_calling_user_id), 'Administrator'),
      'DELETE_ORDER',
      'orders',
      target_order_id::TEXT,
      jsonb_build_object(
        'order_number', v_order_number,
        'customer_name', v_customer_name,
        'customer_email', v_customer_email,
        'total', v_total,
        'status', v_status
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Audit logging non-blocking
  END;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', target_order_id,
    'order_number', v_order_number,
    'message', 'Order ' || v_order_number || ' deleted successfully.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_order(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_order(UUID) TO service_role;


-- 2. Secure Admin Delete Delivery Assignment Function
DROP FUNCTION IF EXISTS public.admin_delete_delivery_assignment(UUID);
DROP FUNCTION IF EXISTS public.admin_delete_delivery_assignment;

CREATE OR REPLACE FUNCTION public.admin_delete_delivery_assignment(target_assignment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_calling_user_id UUID;
  v_calling_role TEXT;
  v_order_id UUID;
  v_driver_id UUID;
  v_agent_id UUID;
  v_driver_name TEXT;
  v_status TEXT;
  v_route_area TEXT;
BEGIN
  -- 1. Security Check: Caller must be authenticated
  v_calling_user_id := auth.uid();
  IF v_calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- 2. Authorization Check: Caller MUST be an Administrator or Manager in public.profiles
  SELECT role INTO v_calling_role
  FROM public.profiles
  WHERE id = v_calling_user_id;

  IF v_calling_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Unauthorized: Only Administrators and Managers are authorized to delete delivery assignments.';
  END IF;

  -- 3. Target Assignment Validation
  SELECT order_id, driver_id, agent_id, driver_name, status, route_area
  INTO v_order_id, v_driver_id, v_agent_id, v_driver_name, v_status, v_route_area
  FROM public.delivery_assignments
  WHERE id = target_assignment_id;

  IF v_driver_name IS NULL AND v_status IS NULL THEN
    RAISE EXCEPTION 'Delivery assignment record not found.';
  END IF;

  -- 4. Safety Check: In-transit warning/safety
  IF v_status IN ('out_for_delivery', 'in_transit') THEN
    RAISE EXCEPTION 'This delivery is currently out for delivery / in transit. Please complete or update the delivery status before deleting.';
  END IF;

  -- 5. Safe Decoupling:
  -- Reset associated order's assigned_driver to NULL if linked
  IF v_order_id IS NOT NULL THEN
    UPDATE public.orders
    SET assigned_driver = NULL
    WHERE id = v_order_id;
  END IF;

  -- Decrement active_deliveries count on delivery_agents table if applicable
  IF v_agent_id IS NOT NULL THEN
    UPDATE public.delivery_agents
    SET active_deliveries = GREATEST(0, active_deliveries - 1)
    WHERE id = v_agent_id;
  END IF;

  -- 6. Delete ONLY the delivery assignment (NEVER delete the driver, customer, or admin profile!)
  DELETE FROM public.delivery_assignments WHERE id = target_assignment_id;

  -- 7. Record Audit Log
  BEGIN
    INSERT INTO public.audit_logs (
      actor_id,
      actor_name,
      action,
      target_type,
      target_id,
      metadata
    )
    VALUES (
      v_calling_user_id,
      COALESCE((SELECT full_name FROM public.profiles WHERE id = v_calling_user_id), 'Administrator'),
      'DELETE_DELIVERY_ASSIGNMENT',
      'delivery_assignments',
      target_assignment_id::TEXT,
      jsonb_build_object(
        'order_id', v_order_id,
        'driver_name', v_driver_name,
        'route_area', v_route_area,
        'status', v_status
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Audit logging non-blocking
  END;

  RETURN jsonb_build_object(
    'success', true,
    'assignment_id', target_assignment_id,
    'message', 'Delivery assignment deleted successfully.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_delivery_assignment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_delivery_assignment(UUID) TO service_role;
