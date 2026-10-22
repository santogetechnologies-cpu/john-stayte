-- ====================================================================
-- JOHN STAYTE SERVICES - RLS POLICIES FOR SUPPORT_TICKETS & CMS_CONTENT_BLOCKS
-- Migration: 00088_fix_support_tickets_and_cms_rls.sql
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. FIX public.support_tickets RLS POLICIES
-- --------------------------------------------------------------------
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Drop all existing / conflicting policies on support_tickets
DROP POLICY IF EXISTS "Customers can view own support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Customers can view own support tickets, staff view all" ON public.support_tickets;
DROP POLICY IF EXISTS "Customers view own tickets, staff view all" ON public.support_tickets;
DROP POLICY IF EXISTS "Customers can create support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Customers can create own support requests" ON public.support_tickets;
DROP POLICY IF EXISTS "Public and customers can create support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Staff can update support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Staff and customers can update support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Customers and staff can update support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Customers and staff can delete support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Staff can delete support tickets" ON public.support_tickets;

-- 1a. SELECT: Authenticated customers can view ONLY their own tickets. Staff can view all.
-- Anonymous users (anon) have NO select policy, preventing ticket exposure.
CREATE POLICY "Customers view own tickets, staff view all"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = customer_id)
    OR public.is_admin_or_manager()
  );

-- 1b. INSERT: Public visitors (anon) can submit enquiries (customer_id IS NULL).
-- Authenticated customers can create tickets for themselves (customer_id = auth.uid() OR customer_id IS NULL).
-- Staff (admin/manager) can create tickets for any customer.
CREATE POLICY "Public and customers can create support tickets"
  ON public.support_tickets FOR INSERT
  TO public
  WITH CHECK (
    customer_id IS NULL
    OR (auth.uid() IS NOT NULL AND auth.uid() = customer_id)
    OR public.is_admin_or_manager()
  );

-- 1c. UPDATE: Staff can update any ticket (status, priority, assignment).
-- Authenticated customers can update their own ticket (e.g., closing their ticket).
CREATE POLICY "Staff and customers can update support tickets"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = customer_id)
    OR public.is_admin_or_manager()
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = customer_id)
    OR public.is_admin_or_manager()
  );

-- 1d. DELETE: Staff can delete any ticket. Customers can delete their own ticket.
CREATE POLICY "Staff and customers can delete support tickets"
  ON public.support_tickets FOR DELETE
  TO authenticated
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = customer_id)
    OR public.is_admin_or_manager()
  );


-- --------------------------------------------------------------------
-- 2. FIX public.cms_content_blocks RLS POLICIES & CONSTRAINTS
-- --------------------------------------------------------------------
ALTER TABLE public.cms_content_blocks ENABLE ROW LEVEL SECURITY;

-- Ensure UNIQUE constraint on section_key exists for UPSERT (ON CONFLICT section_key)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cms_content_blocks_section_key_key'
      AND conrelid = 'public.cms_content_blocks'::regclass
  ) THEN
    ALTER TABLE public.cms_content_blocks
      ADD CONSTRAINT cms_content_blocks_section_key_key UNIQUE (section_key);
  END IF;
END $$;

-- Drop all existing / redundant / conflicting policies on cms_content_blocks
DROP POLICY IF EXISTS "Public can view cms content blocks" ON public.cms_content_blocks;
DROP POLICY IF EXISTS "Public can view content blocks" ON public.cms_content_blocks;
DROP POLICY IF EXISTS "Public read cms_content_blocks" ON public.cms_content_blocks;
DROP POLICY IF EXISTS "Admin full access cms_content_blocks" ON public.cms_content_blocks;
DROP POLICY IF EXISTS "Admins can manage cms content blocks" ON public.cms_content_blocks;
DROP POLICY IF EXISTS "Staff can manage cms_content_blocks" ON public.cms_content_blocks;
DROP POLICY IF EXISTS "Staff can insert cms_content_blocks" ON public.cms_content_blocks;
DROP POLICY IF EXISTS "Staff can update cms_content_blocks" ON public.cms_content_blocks;
DROP POLICY IF EXISTS "Staff can delete cms_content_blocks" ON public.cms_content_blocks;

-- 2a. SELECT: Public-readable so website visitors can view homepage, about, stations, etc.
CREATE POLICY "Public read cms_content_blocks"
  ON public.cms_content_blocks FOR SELECT
  TO public
  USING (true);

-- 2b. INSERT: Restricted to authorized staff (admins and managers).
CREATE POLICY "Staff can insert cms_content_blocks"
  ON public.cms_content_blocks FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_manager());

-- 2c. UPDATE: Restricted to authorized staff (admins and managers).
CREATE POLICY "Staff can update cms_content_blocks"
  ON public.cms_content_blocks FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

-- 2d. DELETE: Restricted to authorized staff (admins and managers).
CREATE POLICY "Staff can delete cms_content_blocks"
  ON public.cms_content_blocks FOR DELETE
  TO authenticated
  USING (public.is_admin_or_manager());
