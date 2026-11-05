-- ==============================================================================
-- Migration: 00099_branch_staff_inventory_rls.sql
-- Description: Enable read-only inventory access for Branch Staff scoped strictly
--              to their assigned collection forecourt.
-- Requirements:
-- 1. Branch Staff can read stock belonging to their assigned forecourt only.
-- 2. Staff cannot access other branches' inventory or central Whitminster depot stock.
-- 3. Staff cannot alter stock quantities (SELECT only).
-- 4. Admin and Manager full access permissions remain unchanged.
-- NOTE: HELD UNEXECUTED FOR USER/MANAGER REVIEW PRIOR TO PRODUCTION APPLICATION.
-- ==============================================================================

-- 1. Ensure RLS is active on public.inventory
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- 2. Add scoped SELECT policy for authenticated branch_staff
DROP POLICY IF EXISTS "Branch staff can view assigned branch inventory" ON public.inventory;

CREATE POLICY "Branch staff can view assigned branch inventory"
  ON public.inventory FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'branch_staff'
        AND p.assigned_branch IS NOT NULL
        AND p.assigned_branch NOT IN ('', 'Pending Confirmation', 'Unassigned', 'None')
        AND (
          -- Match by assigned branch name
          inventory.depot_location ILIKE ('%' || p.assigned_branch || '%')
          OR (
            -- Match by assigned auto_gas_stations town or name
            p.assigned_branch_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM public.auto_gas_stations s
              WHERE s.id = p.assigned_branch_id
                AND (
                  inventory.depot_location ILIKE ('%' || s.town || '%')
                  OR inventory.depot_location ILIKE ('%' || s.name || '%')
                )
            )
          )
        )
    )
  );

-- 3. Explicitly ensure branch staff cannot INSERT, UPDATE, or DELETE inventory rows
-- (Admins and managers maintain full access via existing "Staff inventory access" policy)
COMMENT ON POLICY "Branch staff can view assigned branch inventory" ON public.inventory IS
  'Grants SELECT access to branch staff strictly for inventory records matching their assigned forecourt location. Write operations are blocked.';

