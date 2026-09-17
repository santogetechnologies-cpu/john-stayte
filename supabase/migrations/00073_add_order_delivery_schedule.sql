-- ====================================================================
-- JOHN STAYTE SERVICES - ORDER DELIVERY SCHEDULE FIELDS
-- Migration: 00073_add_order_delivery_schedule.sql
-- ====================================================================

-- 1. Add delivery_date and delivery_slot columns to public.orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS delivery_date DATE,
ADD COLUMN IF NOT EXISTS delivery_slot TEXT;

-- 2. Create index on delivery_date for performance
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON public.orders(delivery_date);

-- 3. Ensure delivery_assignments table has matching schedule columns
ALTER TABLE public.delivery_assignments
ADD COLUMN IF NOT EXISTS scheduled_date DATE,
ADD COLUMN IF NOT EXISTS time_slot TEXT;

-- 4. Enable RLS and verify policies allow Admin/Manager update of orders
-- Existing policies already grant admin/manager full management of orders
