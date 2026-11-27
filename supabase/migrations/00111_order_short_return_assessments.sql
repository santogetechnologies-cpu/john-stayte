-- Migration: 00111_order_short_return_assessments.sql
-- Purpose: Store server-calculated short-return fee assessments separately from
-- original order totals and order_items pricing, linked to orders and recorded
-- cylinder returns, without adding VAT or altering existing payment records.
-- NOTE: Staged locally only — DO NOT APPLY TO PRODUCTION WITHOUT REVIEW.

CREATE TABLE IF NOT EXISTS public.order_short_return_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  branch_id uuid,
  branch_name text NOT NULL DEFAULT '',
  expected_total_quantity integer NOT NULL DEFAULT 0 CHECK (expected_total_quantity >= 0),
  returned_total_quantity integer NOT NULL DEFAULT 0 CHECK (returned_total_quantity >= 0),
  unmatched_quantity integer NOT NULL DEFAULT 0 CHECK (unmatched_quantity >= 0),
  assessed_fee numeric(10, 2) NOT NULL DEFAULT 0 CHECK (assessed_fee >= 0),
  currency text NOT NULL DEFAULT 'GBP',
  status text NOT NULL DEFAULT 'assessed' CHECK (status IN ('none', 'assessed', 'payment_required', 'paid', 'waived')),
  calculation_details jsonb NOT NULL DEFAULT '[]'::jsonb,
  assessed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assessed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_short_return_assessments_order_id
  ON public.order_short_return_assessments(order_id);

CREATE INDEX IF NOT EXISTS idx_order_short_return_assessments_branch_id
  ON public.order_short_return_assessments(branch_id);

CREATE INDEX IF NOT EXISTS idx_order_short_return_assessments_status
  ON public.order_short_return_assessments(status);

CREATE INDEX IF NOT EXISTS idx_order_short_return_assessments_assessed_at
  ON public.order_short_return_assessments(assessed_at DESC);

ALTER TABLE public.order_short_return_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin and Manager full access on order_short_return_assessments" ON public.order_short_return_assessments;
CREATE POLICY "Admin and Manager full access on order_short_return_assessments"
  ON public.order_short_return_assessments
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "Branch staff can view assigned branch short return assessments" ON public.order_short_return_assessments;
CREATE POLICY "Branch staff can view assigned branch short return assessments"
  ON public.order_short_return_assessments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.orders o ON o.id = order_short_return_assessments.order_id
      WHERE p.id = auth.uid()
        AND LOWER(COALESCE(p.role, '')) = 'branch_staff'
        AND LOWER(COALESCE(p.status, 'active')) <> 'inactive'
        AND (
          (p.assigned_branch_id IS NOT NULL AND o.assigned_branch_id = p.assigned_branch_id)
          OR (
            COALESCE(p.assigned_branch, '') <> ''
            AND (
              LOWER(COALESCE(o.assigned_depot, '')) LIKE '%' || LOWER(p.assigned_branch) || '%'
              OR LOWER(COALESCE(o.delivery_address->>'collection_branch', '')) LIKE '%' || LOWER(p.assigned_branch) || '%'
            )
          )
        )
    )
  );
