-- ====================================================================
-- ROLLBACK MIGRATION: 00101_fix_delivery_assignments_rls_recursion_rollback.sql
-- Restores Exact Migration 00100 Inline Policies and Drops 00101 Objects
-- ====================================================================

-- 1. Drop protection trigger and function introduced by 00101
DROP TRIGGER IF EXISTS trg_protect_branch_staff_delivery_assignment_fields ON public.delivery_assignments;
DROP FUNCTION IF EXISTS public.protect_branch_staff_delivery_assignment_fields();

-- 2. Drop helper-based policies introduced by 00101
DROP POLICY IF EXISTS "Branch staff can view assigned branch delivery assignments" ON public.delivery_assignments;
DROP POLICY IF EXISTS "Branch staff can insert forecourt delivery assignments" ON public.delivery_assignments;
DROP POLICY IF EXISTS "Branch staff can update assigned branch delivery assignments" ON public.delivery_assignments;

-- 3. Drop helper function introduced by 00101
DROP FUNCTION IF EXISTS public.can_branch_staff_access_delivery_assignment(UUID);

-- 4. Recreate exact original migration 00100 inline policies
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

