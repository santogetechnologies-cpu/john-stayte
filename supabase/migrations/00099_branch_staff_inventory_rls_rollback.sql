-- ==============================================================================
-- Rollback Migration: 00099_branch_staff_inventory_rls_rollback.sql
-- Description: Revert branch staff inventory SELECT policy, restoring inventory
--              access strictly to admin and manager roles.
-- ==============================================================================

-- 1. Drop the scoped branch staff inventory SELECT policy
DROP POLICY IF EXISTS "Branch staff can view assigned branch inventory" ON public.inventory;

-- 2. Verify admin and manager inventory policy remains intact
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'inventory' AND policyname = 'Staff inventory access'
  ) THEN
    CREATE POLICY "Staff inventory access"
      ON public.inventory FOR ALL
      USING (public.is_admin_or_manager());
  END IF;
END $$;

