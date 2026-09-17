-- ====================================================================
-- JOHN STAYTE SERVICES - SECURE ADMIN DRIVER DELETE FUNCTION
-- Migration: 00078_admin_delete_driver_function.sql
-- ====================================================================

DROP FUNCTION IF EXISTS public.admin_delete_driver(UUID);
DROP FUNCTION IF EXISTS public.admin_delete_driver;

CREATE OR REPLACE FUNCTION public.admin_delete_driver(target_driver_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_calling_user_id UUID;
  v_calling_role TEXT;
  v_calling_email TEXT;
  v_driver_name TEXT;
  v_driver_email TEXT;
  v_driver_code TEXT;
  v_active_deliveries_count INT := 0;
  v_active_assignments_count INT := 0;
BEGIN
  -- 1. Security Check: Caller must be authenticated
  v_calling_user_id := auth.uid();
  IF v_calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- 2. Authorization Check: Caller MUST be an Administrator in public.profiles
  SELECT role, email
  INTO v_calling_role, v_calling_email
  FROM public.profiles
  WHERE id = v_calling_user_id;

  IF v_calling_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only Administrators are authorized to delete driver accounts.';
  END IF;

  -- 3. Target Driver Validation in public.delivery_agents
  SELECT full_name, email, agent_code, COALESCE(active_deliveries, 0)
  INTO v_driver_name, v_driver_email, v_driver_code, v_active_deliveries_count
  FROM public.delivery_agents
  WHERE id = target_driver_id;

  IF v_driver_name IS NULL THEN
    -- Fallback check in profiles if not in delivery_agents
    SELECT full_name, email, 'AGT-LEGACY', 0
    INTO v_driver_name, v_driver_email, v_driver_code, v_active_deliveries_count
    FROM public.profiles
    WHERE id = target_driver_id AND role = 'delivery_agent';

    IF v_driver_name IS NULL THEN
      RAISE EXCEPTION 'Driver record not found.';
    END IF;
  END IF;

  -- 4. Safety Check: Verify NO active deliveries or in-transit assignments exist
  IF v_active_deliveries_count > 0 THEN
    RAISE EXCEPTION 'This driver cannot be deleted while active deliveries or pending assignments exist. Deactivate the driver instead.';
  END IF;

  SELECT COUNT(*) INTO v_active_assignments_count
  FROM public.delivery_assignments
  WHERE agent_id = target_driver_id
    AND status IN ('assigned', 'in_transit', 'pending', 'active', 'out_for_delivery');

  IF v_active_assignments_count > 0 THEN
    RAISE EXCEPTION 'This driver cannot be deleted while active deliveries or pending assignments exist. Deactivate the driver instead.';
  END IF;

  -- 5. Decouple Historical Assignments & Customer Reviews (Preserve Operations History)
  UPDATE public.delivery_assignments
  SET agent_id = NULL
  WHERE agent_id = target_driver_id;

  UPDATE public.reviews
  SET delivery_agent_id = NULL
  WHERE delivery_agent_id = target_driver_id;

  -- 6. Delete Driver Record from public.delivery_agents
  DELETE FROM public.delivery_agents
  WHERE id = target_driver_id;

  -- 7. Clean up corresponding profile if exists with role = 'delivery_agent'
  DELETE FROM public.profiles
  WHERE id = target_driver_id OR (email = v_driver_email AND role = 'delivery_agent');

  -- 8. Clean up auth.users account if driver has an authentication record
  BEGIN
    DELETE FROM auth.users
    WHERE id = target_driver_id OR email = v_driver_email;
  EXCEPTION WHEN OTHERS THEN
    -- Auth deletion optional if managed by external provider
  END;

  RETURN jsonb_build_object(
    'success', true,
    'driver_id', target_driver_id,
    'driver_name', v_driver_name,
    'agent_code', v_driver_code,
    'message', 'Driver deleted successfully.'
  );
END;
$$;

-- Grant execution to authenticated users (internal role check enforces admin only)
GRANT EXECUTE ON FUNCTION public.admin_delete_driver(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_driver(UUID) TO service_role;
