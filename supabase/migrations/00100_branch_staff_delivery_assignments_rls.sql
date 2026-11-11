-- ====================================================================
-- MIGRATION: 00100_branch_staff_delivery_assignments_rls.sql
-- Grant Narrowly Scoped RLS Access on public.delivery_assignments for Branch Staff
-- 
-- IMPORTANT / STRICT PRESERVATION RULE:
-- NOTE: HELD UNEXECUTED FOR USER/MANAGER REVIEW PRIOR TO PRODUCTION APPLICATION.
-- DO NOT EXECUTE IN PRODUCTION WITHOUT EXPLICIT USER APPROVAL.
-- ====================================================================

-- 1. Ensure RLS is active on delivery_assignments (idempotent safeguard)
ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;

-- 2. Clean up any existing duplicate branch_staff policies if previously defined
DROP POLICY IF EXISTS "Branch staff can view assigned branch delivery assignments" ON public.delivery_assignments;
DROP POLICY IF EXISTS "Branch staff can insert forecourt delivery assignments" ON public.delivery_assignments;
DROP POLICY IF EXISTS "Branch staff can update assigned branch delivery assignments" ON public.delivery_assignments;

-- 3. Policy: SELECT
-- Branch staff can view delivery assignments for Click & Collect orders belonging to their assigned forecourt/branch.
CREATE POLICY "Branch staff can view assigned branch delivery assignments"
  ON public.delivery_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.orders o ON o.id = delivery_assignments.order_id
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
    )
  );

-- 4. Policy: INSERT
-- Branch staff can auto-create / link Forecourt Handover assignments for their branch's Click & Collect orders.
CREATE POLICY "Branch staff can insert forecourt delivery assignments"
  ON public.delivery_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    driver_name = 'Forecourt Handover'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.orders o ON o.id = delivery_assignments.order_id
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
    )
  );

-- 5. Policy: UPDATE
-- Branch staff can record OTP verification attempts, verification timestamp, and handover notes.
CREATE POLICY "Branch staff can update assigned branch delivery assignments"
  ON public.delivery_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.orders o ON o.id = delivery_assignments.order_id
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
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.orders o ON o.id = delivery_assignments.order_id
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
    )
  );

