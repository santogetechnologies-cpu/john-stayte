-- ====================================================================
-- MIGRATION: 00101_fix_delivery_assignments_rls_recursion.sql
-- Fix Infinite Recursion Between orders and delivery_assignments
-- Enforces Strict Whitelist and Irreversible Handover Lifecycle
-- ====================================================================

-- 1. Non-recursive SECURITY DEFINER Helper Function
-- Derives identity solely from auth.uid() without caller-supplied parameters
CREATE OR REPLACE FUNCTION public.can_branch_staff_access_delivery_assignment(asgn_order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.orders o ON o.id = asgn_order_id
    WHERE p.id = auth.uid()
      AND p.role = 'branch_staff'
      AND p.assigned_branch IS NOT NULL
      AND p.assigned_branch NOT IN ('', 'Pending Confirmation', 'Unassigned', 'None')
      AND (
        o.delivery_address->>'fulfilment_method' = 'collection'
        OR (o.delivery_address->>'collection_branch') IS NOT NULL
      )
      AND (
        (o.assigned_branch_id IS NOT NULL AND o.assigned_branch_id = p.assigned_branch_id)
        OR ((o.delivery_address->>'collection_branch_id') = p.assigned_branch_id::text)
        OR (o.assigned_depot = p.assigned_branch)
        OR (o.delivery_address->>'collection_branch' = p.assigned_branch)
        OR (
          p.assigned_branch_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.auto_gas_stations s
            WHERE s.id = p.assigned_branch_id
              AND (
                o.assigned_depot = s.name
                OR o.delivery_address->>'collection_branch' = s.name
                OR o.assigned_depot = s.town
                OR o.delivery_address->>'collection_branch' = s.town
              )
          )
        )
      )
  );
$$;

-- Restrict function execution to authenticated callers only
REVOKE ALL ON FUNCTION public.can_branch_staff_access_delivery_assignment(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_branch_staff_access_delivery_assignment(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_branch_staff_access_delivery_assignment(UUID) TO authenticated;

-- 2. Update Branch Staff Policies on delivery_assignments to Use Non-Recursive Helper
DROP POLICY IF EXISTS "Branch staff can view assigned branch delivery assignments" ON public.delivery_assignments;
CREATE POLICY "Branch staff can view assigned branch delivery assignments"
  ON public.delivery_assignments FOR SELECT
  TO authenticated
  USING (public.can_branch_staff_access_delivery_assignment(order_id));

DROP POLICY IF EXISTS "Branch staff can insert forecourt delivery assignments" ON public.delivery_assignments;
CREATE POLICY "Branch staff can insert forecourt delivery assignments"
  ON public.delivery_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    driver_name = 'Forecourt Handover'
    AND public.can_branch_staff_access_delivery_assignment(order_id)
  );

DROP POLICY IF EXISTS "Branch staff can update assigned branch delivery assignments" ON public.delivery_assignments;
CREATE POLICY "Branch staff can update assigned branch delivery assignments"
  ON public.delivery_assignments FOR UPDATE
  TO authenticated
  USING (public.can_branch_staff_access_delivery_assignment(order_id))
  WITH CHECK (public.can_branch_staff_access_delivery_assignment(order_id));

-- 3. Strict Whitelist & Irreversible Handover Lifecycle Trigger on delivery_assignments
CREATE OR REPLACE FUNCTION public.protect_branch_staff_delivery_assignment_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_whitelist CONSTANT text[] := ARRAY[
    'otp_code',
    'otp_expires_at',
    'otp_attempts',
    'otp_max_attempts',
    'otp_verified',
    'otp_verified_at',
    'notes',
    'status',
    'empty_cylinder_verified',
    'cylinder_condition',
    'updated_at'
  ];
BEGIN
  -- Administrative updates by Admin and Manager (or backend service role / internal triggers) are permitted
  IF auth.uid() IS NULL OR public.is_admin_or_manager() THEN
    RETURN NEW;
  END IF;

  SELECT role INTO v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- If caller is branch_staff, enforce whitelist & lifecycle rules
  IF v_caller_role = 'branch_staff' THEN
    -- A. Enforce strict whitelist of permitted fields
    IF (to_jsonb(NEW) - v_whitelist) IS DISTINCT FROM (to_jsonb(OLD) - v_whitelist) THEN
      RAISE EXCEPTION 'Unauthorized: branch staff may only update handover and verification fields (otp_code, otp_expires_at, otp_attempts, otp_max_attempts, otp_verified, otp_verified_at, notes, status, empty_cylinder_verified, cylinder_condition, updated_at).'
        USING ERRCODE = 'P0001';
    END IF;

    -- B. OTP Verification Immutability (Prevent un-verifying OTP)
    IF OLD.otp_verified = true AND COALESCE(NEW.otp_verified, false) = false THEN
      RAISE EXCEPTION 'Unauthorized: once authenticated, customer OTP verification cannot be revoked or reset by branch staff.'
        USING ERRCODE = 'P0001';
    END IF;

    -- C. Irreversible Final Status (Delivered is terminal for branch staff)
    IF OLD.status = 'Delivered' AND NEW.status IS DISTINCT FROM 'Delivered' THEN
      RAISE EXCEPTION 'Unauthorized: Delivered status is final and irreversible by branch staff.'
        USING ERRCODE = 'P0001';
    END IF;

    -- D. Mandatory OTP verification before marking assignment Delivered
    IF NEW.status = 'Delivered' AND OLD.status IS DISTINCT FROM 'Delivered' THEN
      IF COALESCE(NEW.otp_verified, false) = false THEN
        RAISE EXCEPTION 'Unauthorized: customer OTP verification is mandatory before completing handover and setting status to Delivered.'
          USING ERRCODE = 'P0001';
      END IF;
    END IF;

    -- E. Restrict status transitions to valid forecourt handover lifecycle states
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('Pending', 'Assigned', 'Delivered') THEN
      RAISE EXCEPTION 'Unauthorized: invalid status transition for forecourt handover. Permitted: Pending, Assigned, Delivered.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_branch_staff_delivery_assignment_fields ON public.delivery_assignments;
CREATE TRIGGER trg_protect_branch_staff_delivery_assignment_fields
  BEFORE UPDATE ON public.delivery_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_branch_staff_delivery_assignment_fields();

