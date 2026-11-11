-- ====================================================================
-- ROLLBACK MIGRATION: 00100_branch_staff_delivery_assignments_rls_rollback.sql
-- Reverts branch_staff policies on public.delivery_assignments
-- ====================================================================

DROP POLICY IF EXISTS "Branch staff can view assigned branch delivery assignments" ON public.delivery_assignments;
DROP POLICY IF EXISTS "Branch staff can insert forecourt delivery assignments" ON public.delivery_assignments;
DROP POLICY IF EXISTS "Branch staff can update assigned branch delivery assignments" ON public.delivery_assignments;

