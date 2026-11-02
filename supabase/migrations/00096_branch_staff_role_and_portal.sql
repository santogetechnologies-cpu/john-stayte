-- ==============================================================================
-- Migration: 00096_branch_staff_role_and_portal.sql
-- Description: Branch Staff role, branch assignment columns, order security policies,
--              operational field immutability trigger, status transition enforcement,
--              and access control.
-- NOTE: HELD UNEXECUTED FOR USER/MANAGER REVIEW PRIOR TO PRODUCTION APPLICATION.
-- ==============================================================================

-- 1. Extend the profiles table role constraint to include branch_staff and delivery roles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_role_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
  END IF;

  ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('customer', 'manager', 'admin', 'driver', 'delivery_agent', 'branch_staff'));
END $$;

-- 2. Add assigned_branch and assigned_branch_id columns to profiles if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'assigned_branch'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN assigned_branch TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'assigned_branch_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN assigned_branch_id UUID REFERENCES public.auto_gas_stations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Add assigned_branch_id column to orders and ensure status check supports forecourt Ready state
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'assigned_branch_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN assigned_branch_id UUID REFERENCES public.auto_gas_stations(id) ON DELETE SET NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_status_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
  END IF;

  ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
    CHECK (status IN ('Pending', 'Approved', 'Packed', 'Ready', 'Out for Delivery', 'Delivered', 'Cancelled'));
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_assigned_branch_id ON public.orders(assigned_branch_id);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_depot ON public.orders(assigned_depot);

-- 4. Synchronize any existing staff accounts in public.profiles (e.g. staff@jss.com)
-- Matches station ID where possible; leaves Pending Confirmation unassigned.
UPDATE public.profiles p
SET 
  role = 'branch_staff',
  assigned_branch = COALESCE(NULLIF(p.assigned_branch, ''), NULLIF(u.raw_user_meta_data->>'assigned_branch', ''), p.notification_prefs->>'assigned_branch', 'Pending Confirmation'),
  assigned_branch_id = COALESCE(
    p.assigned_branch_id,
    (SELECT s.id FROM public.auto_gas_stations s 
     WHERE s.name ILIKE ('%' || COALESCE(u.raw_user_meta_data->>'assigned_branch', p.notification_prefs->>'assigned_branch', '') || '%')
        OR s.town ILIKE ('%' || COALESCE(u.raw_user_meta_data->>'assigned_branch', p.notification_prefs->>'assigned_branch', '') || '%')
     LIMIT 1)
  )
FROM auth.users u
WHERE p.id = u.id
  AND (
    u.raw_user_meta_data->>'staff_role' = 'branch_staff'
    OR p.notification_prefs->>'role' = 'branch_staff'
  )
  AND p.role != 'branch_staff';

-- 5. Trigger on public.profiles: Ensure non-admin users cannot alter their own role, assigned_branch, or assigned_branch_id
CREATE OR REPLACE FUNCTION public.check_branch_staff_immutable_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If user is updating their own record and is NOT an admin/manager:
  -- Block alterations to role, assigned_branch, assigned_branch_id
  IF auth.uid() IS NOT NULL AND auth.uid() = NEW.id THEN
    IF NOT public.is_admin_or_manager() THEN
      IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Unauthorized: Users cannot modify their own system role.';
      END IF;
      IF NEW.assigned_branch IS DISTINCT FROM OLD.assigned_branch THEN
        RAISE EXCEPTION 'Unauthorized: Users cannot modify their own assigned branch.';
      END IF;
      IF NEW.assigned_branch_id IS DISTINCT FROM OLD.assigned_branch_id THEN
        RAISE EXCEPTION 'Unauthorized: Users cannot modify their own assigned branch ID.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_branch_staff_immutable_fields ON public.profiles;
CREATE TRIGGER trg_check_branch_staff_immutable_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_branch_staff_immutable_fields();

-- 6. Trigger on public.orders: Restrict branch staff updates strictly to operational fields & valid transitions
CREATE OR REPLACE FUNCTION public.protect_branch_order_operational_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  -- If executed by admin or manager, allow normal administrative updates
  IF public.is_admin_or_manager() THEN
    RETURN NEW;
  END IF;

  -- Get caller profile role
  SELECT role INTO v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- If caller is branch_staff, enforce strict operational field immutability and transition rules
  IF v_caller_role = 'branch_staff' THEN
    -- A. Disallow changing order ownership & customer identity
    IF NEW.customer_id IS DISTINCT FROM OLD.customer_id THEN
      RAISE EXCEPTION 'Unauthorized: branch staff cannot alter order customer_id.';
    END IF;
    IF NEW.customer_name IS DISTINCT FROM OLD.customer_name THEN
      RAISE EXCEPTION 'Unauthorized: branch staff cannot alter order customer_name.';
    END IF;
    IF NEW.customer_email IS DISTINCT FROM OLD.customer_email THEN
      RAISE EXCEPTION 'Unauthorized: branch staff cannot alter order customer_email.';
    END IF;
    IF NEW.customer_phone IS DISTINCT FROM OLD.customer_phone THEN
      RAISE EXCEPTION 'Unauthorized: branch staff cannot alter order customer_phone.';
    END IF;

    -- B. Disallow altering financial and payment details
    IF NEW.subtotal IS DISTINCT FROM OLD.subtotal THEN
      RAISE EXCEPTION 'Unauthorized: branch staff cannot alter order subtotal.';
    END IF;
    IF NEW.shipping_fee IS DISTINCT FROM OLD.shipping_fee THEN
      RAISE EXCEPTION 'Unauthorized: branch staff cannot alter order shipping_fee.';
    END IF;
    IF NEW.total IS DISTINCT FROM OLD.total THEN
      RAISE EXCEPTION 'Unauthorized: branch staff cannot alter order total amount.';
    END IF;
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      RAISE EXCEPTION 'Unauthorized: branch staff cannot alter order payment_status.';
    END IF;

    -- C. Disallow altering order identifiers, branch assignment, or delivery routing
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Unauthorized: branch staff cannot alter order id.';
    END IF;
    IF NEW.order_number IS DISTINCT FROM OLD.order_number THEN
      RAISE EXCEPTION 'Unauthorized: branch staff cannot alter order_number.';
    END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Unauthorized: branch staff cannot alter order created_at.';
    END IF;
    IF NEW.assigned_depot IS DISTINCT FROM OLD.assigned_depot THEN
      RAISE EXCEPTION 'Unauthorized: branch staff cannot alter assigned_depot.';
    END IF;
    IF NEW.assigned_branch_id IS DISTINCT FROM OLD.assigned_branch_id THEN
      RAISE EXCEPTION 'Unauthorized: branch staff cannot alter assigned_branch_id.';
    END IF;
    IF NEW.delivery_address IS DISTINCT FROM OLD.delivery_address THEN
      RAISE EXCEPTION 'Unauthorized: branch staff cannot alter delivery_address.';
    END IF;

    -- D. Block delivery-agent-only fields (Click & Collect forecourt orders do not use delivery routes)
    IF NEW.assigned_driver IS DISTINCT FROM OLD.assigned_driver THEN
      RAISE EXCEPTION 'Unauthorized: branch staff cannot assign or modify drivers.';
    END IF;
    IF NEW.delivery_date IS DISTINCT FROM OLD.delivery_date THEN
      RAISE EXCEPTION 'Unauthorized: branch staff cannot modify delivery_date.';
    END IF;
    IF NEW.delivery_slot IS DISTINCT FROM OLD.delivery_slot THEN
      RAISE EXCEPTION 'Unauthorized: branch staff cannot modify delivery_slot.';
    END IF;

    -- E. Terminal Order Protection: Delivered and Cancelled orders are completely immutable for branch staff
    IF OLD.status IN ('Delivered', 'Cancelled') THEN
      RAISE EXCEPTION 'Unauthorized: cannot modify orders that are already in terminal status (%).', OLD.status;
    END IF;

    -- F. Enforce strict forward status transitions for Click & Collect
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      -- Block delivery driver status
      IF NEW.status = 'Out for Delivery' THEN
        RAISE EXCEPTION 'Unauthorized: branch staff cannot set Out for Delivery (Click & Collect forecourt orders do not use delivery routes).';
      END IF;

      -- Validate allowed forward state transitions
      IF OLD.status = 'Pending' AND NEW.status NOT IN ('Approved', 'Cancelled') THEN
        RAISE EXCEPTION 'Unauthorized status transition: from Pending, status can only transition to Approved or Cancelled.';
      ELSIF OLD.status = 'Approved' AND NEW.status NOT IN ('Packed', 'Cancelled') THEN
        RAISE EXCEPTION 'Unauthorized status transition: from Approved, status can only transition to Packed or Cancelled.';
      ELSIF OLD.status = 'Packed' AND NEW.status NOT IN ('Ready', 'Cancelled') THEN
        RAISE EXCEPTION 'Unauthorized status transition: from Packed, status can only transition to Ready or Cancelled.';
      ELSIF OLD.status = 'Ready' AND NEW.status NOT IN ('Delivered', 'Cancelled') THEN
        RAISE EXCEPTION 'Unauthorized status transition: from Ready, status can only transition to Delivered or Cancelled.';
      ELSIF OLD.status NOT IN ('Pending', 'Approved', 'Packed', 'Ready') THEN
        RAISE EXCEPTION 'Unauthorized: cannot transition order from current status (%).', OLD.status;
      END IF;

      -- Cancellation Security requirements
      IF NEW.status = 'Cancelled' THEN
        -- Mandatory non-empty cancellation reason
        IF NULLIF(TRIM(COALESCE(NEW.cancellation_reason, '')), '') IS NULL THEN
          RAISE EXCEPTION 'Unauthorized: a valid non-empty cancellation_reason is mandatory when cancelling an order.';
        END IF;

        -- Record cancellation timestamp and responsible staff member
        NEW.cancelled_at := COALESCE(NEW.cancelled_at, now());
        NEW.cancelled_by := COALESCE(NEW.cancelled_by, auth.uid());
      END IF;
    END IF;

    -- G. Prevent setting or tampering with cancellation fields on active orders or after cancellation
    IF NEW.status != 'Cancelled' THEN
      IF NEW.cancellation_reason IS NOT NULL OR NEW.cancelled_at IS NOT NULL OR NEW.cancelled_by IS NOT NULL THEN
        RAISE EXCEPTION 'Unauthorized: cannot set cancellation fields when order status is not Cancelled.';
      END IF;
    END IF;

    IF OLD.cancelled_by IS NOT NULL AND NEW.cancelled_by IS DISTINCT FROM OLD.cancelled_by THEN
      RAISE EXCEPTION 'Unauthorized: cannot alter existing cancelled_by audit record.';
    END IF;
    IF OLD.cancelled_at IS NOT NULL AND NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at THEN
      RAISE EXCEPTION 'Unauthorized: cannot alter existing cancelled_at audit record.';
    END IF;

    -- H. Fulfillment status validation
    IF NEW.fulfillment_status IS DISTINCT FROM OLD.fulfillment_status THEN
      IF NEW.fulfillment_status NOT IN ('Pending', 'Ready', 'Fulfilled', 'Completed') THEN
        RAISE EXCEPTION 'Unauthorized: invalid fulfillment_status value for branch staff.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_branch_order_operational_fields ON public.orders;
CREATE TRIGGER trg_protect_branch_order_operational_fields
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_branch_order_operational_fields();

-- 7. RLS POLICIES ON public.orders FOR branch_staff
DROP POLICY IF EXISTS "Branch staff can view assigned branch click and collect orders" ON public.orders;
CREATE POLICY "Branch staff can view assigned branch click and collect orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'branch_staff'
        AND p.assigned_branch IS NOT NULL
        AND p.assigned_branch NOT IN ('', 'Pending Confirmation', 'Unassigned', 'None')
        AND (
          orders.delivery_address->>'fulfilment_method' = 'collection'
          OR (orders.delivery_address->>'collection_branch') IS NOT NULL
        )
        AND (
          (orders.assigned_branch_id IS NOT NULL AND orders.assigned_branch_id = p.assigned_branch_id)
          OR ((orders.delivery_address->>'collection_branch_id') = p.assigned_branch_id::text)
          OR (orders.assigned_depot = p.assigned_branch)
          OR (orders.delivery_address->>'collection_branch' = p.assigned_branch)
          OR (
            p.assigned_branch_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM public.auto_gas_stations s
              WHERE s.id = p.assigned_branch_id
                AND (
                  orders.assigned_depot = s.name
                  OR orders.delivery_address->>'collection_branch' = s.name
                  OR orders.assigned_depot = s.town
                  OR orders.delivery_address->>'collection_branch' = s.town
                )
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "Branch staff can update assigned branch click and collect orders" ON public.orders;
CREATE POLICY "Branch staff can update assigned branch click and collect orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'branch_staff'
        AND p.assigned_branch IS NOT NULL
        AND p.assigned_branch NOT IN ('', 'Pending Confirmation', 'Unassigned', 'None')
        AND (
          orders.delivery_address->>'fulfilment_method' = 'collection'
          OR (orders.delivery_address->>'collection_branch') IS NOT NULL
        )
        AND (
          (orders.assigned_branch_id IS NOT NULL AND orders.assigned_branch_id = p.assigned_branch_id)
          OR ((orders.delivery_address->>'collection_branch_id') = p.assigned_branch_id::text)
          OR (orders.assigned_depot = p.assigned_branch)
          OR (orders.delivery_address->>'collection_branch' = p.assigned_branch)
          OR (
            p.assigned_branch_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM public.auto_gas_stations s
              WHERE s.id = p.assigned_branch_id
                AND (
                  orders.assigned_depot = s.name
                  OR orders.delivery_address->>'collection_branch' = s.name
                  OR orders.assigned_depot = s.town
                  OR orders.delivery_address->>'collection_branch' = s.town
                )
            )
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'branch_staff'
        AND p.assigned_branch IS NOT NULL
        AND p.assigned_branch NOT IN ('', 'Pending Confirmation', 'Unassigned', 'None')
        AND (
          orders.delivery_address->>'fulfilment_method' = 'collection'
          OR (orders.delivery_address->>'collection_branch') IS NOT NULL
        )
        AND (
          (orders.assigned_branch_id IS NOT NULL AND orders.assigned_branch_id = p.assigned_branch_id)
          OR ((orders.delivery_address->>'collection_branch_id') = p.assigned_branch_id::text)
          OR (orders.assigned_depot = p.assigned_branch)
          OR (orders.delivery_address->>'collection_branch' = p.assigned_branch)
          OR (
            p.assigned_branch_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM public.auto_gas_stations s
              WHERE s.id = p.assigned_branch_id
                AND (
                  orders.assigned_depot = s.name
                  OR orders.delivery_address->>'collection_branch' = s.name
                  OR orders.assigned_depot = s.town
                  OR orders.delivery_address->>'collection_branch' = s.town
                )
            )
          )
        )
    )
  );

-- 8. RLS POLICIES ON public.order_items FOR branch_staff
DROP POLICY IF EXISTS "Branch staff can view order items for assigned orders" ON public.order_items;
CREATE POLICY "Branch staff can view order items for assigned orders"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE o.id = order_items.order_id
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
    )
  );

-- 9. RLS POLICIES ON public.order_status_history FOR branch_staff
DROP POLICY IF EXISTS "Branch staff can view order history for assigned orders" ON public.order_status_history;
CREATE POLICY "Branch staff can view order history for assigned orders"
  ON public.order_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE o.id = order_status_history.order_id
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
        )
    )
  );

DROP POLICY IF EXISTS "Branch staff can insert order history for assigned orders" ON public.order_status_history;
CREATE POLICY "Branch staff can insert order history for assigned orders"
  ON public.order_status_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE o.id = order_status_history.order_id
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
        )
    )
  );

COMMENT ON COLUMN public.profiles.assigned_branch IS 'Name of the forecourt station or depot assigned to branch staff';
COMMENT ON COLUMN public.profiles.assigned_branch_id IS 'Foreign key reference to public.auto_gas_stations for branch staff';
COMMENT ON COLUMN public.orders.assigned_branch_id IS 'Foreign key reference to public.auto_gas_stations for Click & Collect orders';
