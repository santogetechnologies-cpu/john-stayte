-- Migration: 00109_order_cylinder_returns.sql
-- Purpose: Store structured per-cylinder-type empty cylinder return records
-- recorded by Branch Staff during Click & Collect handover.
-- Supports zero returns, partial returns, and alternative returned cylinder types.
-- NOTE: Staged locally only — DO NOT APPLY TO PRODUCTION WITHOUT REVIEW.

CREATE TABLE IF NOT EXISTS public.order_cylinder_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  branch_id uuid,
  branch_name text NOT NULL DEFAULT '',
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  cylinder_name text NOT NULL,
  expected_quantity integer NOT NULL DEFAULT 0 CHECK (expected_quantity >= 0),
  returned_quantity integer NOT NULL DEFAULT 0 CHECK (returned_quantity >= 0),
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

CREATE INDEX IF NOT EXISTS idx_order_cylinder_returns_order_id
  ON public.order_cylinder_returns(order_id);

CREATE INDEX IF NOT EXISTS idx_order_cylinder_returns_branch_id
  ON public.order_cylinder_returns(branch_id);

CREATE INDEX IF NOT EXISTS idx_order_cylinder_returns_product_id
  ON public.order_cylinder_returns(product_id);

CREATE INDEX IF NOT EXISTS idx_order_cylinder_returns_recorded_at
  ON public.order_cylinder_returns(recorded_at DESC);

ALTER TABLE public.order_cylinder_returns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin and Manager full access on order_cylinder_returns" ON public.order_cylinder_returns;
CREATE POLICY "Admin and Manager full access on order_cylinder_returns"
  ON public.order_cylinder_returns
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "Branch staff can view assigned branch cylinder returns" ON public.order_cylinder_returns;
CREATE POLICY "Branch staff can view assigned branch cylinder returns"
  ON public.order_cylinder_returns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.orders o ON o.id = order_cylinder_returns.order_id
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

DROP POLICY IF EXISTS "Branch staff can insert assigned branch cylinder returns" ON public.order_cylinder_returns;
CREATE POLICY "Branch staff can insert assigned branch cylinder returns"
  ON public.order_cylinder_returns
  FOR INSERT
  TO authenticated
  WITH CHECK (
    recorded_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.orders o ON o.id = order_cylinder_returns.order_id
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
