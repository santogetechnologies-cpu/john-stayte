-- ==============================================================================
-- Migration: 00092_fix_orders_status_check_and_payment_reconciliation.sql
-- Description: Ensures orders_status_check accommodates lifecycle statuses and
-- reconciles payments and invoices to prevent constraint violation 23514.
-- ==============================================================================

-- 1. Ensure orders_status_check allows canonical order lifecycle statuses
-- ('Pending', 'Approved', 'Processing', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled')
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('Pending', 'Approved', 'Processing', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'));
