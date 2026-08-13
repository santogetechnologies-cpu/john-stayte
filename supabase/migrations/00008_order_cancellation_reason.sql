-- ====================================================================
-- MIGRATION: 00008_order_cancellation_reason.sql
-- Add cancellation_reason columns and update cancel_customer_order RPC
-- ====================================================================

-- 1. Add cancellation tracking columns to orders table if not exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'cancellation_reason'
  ) THEN 
    ALTER TABLE public.orders ADD COLUMN cancellation_reason TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'cancelled_at'
  ) THEN 
    ALTER TABLE public.orders ADD COLUMN cancelled_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'cancelled_by'
  ) THEN 
    ALTER TABLE public.orders ADD COLUMN cancelled_by UUID REFERENCES public.profiles(id);
  END IF;
END $$;

-- 2. Create or Replace cancel_customer_order RPC function with reason_text parameter
CREATE OR REPLACE FUNCTION public.cancel_customer_order(
  target_order_id UUID,
  reason_text TEXT DEFAULT 'Cancelled by customer'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_order RECORD;
  item_rec RECORD;
  user_email TEXT;
BEGIN
  -- Get requesting user email
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();

  -- 1. Fetch target order & verify ownership
  SELECT * INTO target_order
  FROM public.orders
  WHERE id = target_order_id;

  IF target_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found.');
  END IF;

  IF target_order.customer_id IS DISTINCT FROM auth.uid() 
     AND target_order.customer_email IS DISTINCT FROM user_email 
     AND NOT public.is_admin_or_manager() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized to cancel this order.');
  END IF;

  -- 2. Check cancellable status
  IF target_order.status IN ('Packed', 'Out for Delivery', 'Delivered', 'Cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order cannot be cancelled at current stage: ' || target_order.status);
  END IF;

  -- 3. Update order status to Cancelled and store reason
  UPDATE public.orders
  SET status = 'Cancelled',
      cancellation_reason = COALESCE(reason_text, 'Cancelled by customer'),
      cancelled_at = NOW(),
      cancelled_by = auth.uid(),
      updated_at = NOW()
  WHERE id = target_order_id;

  -- 4. Record status history entry
  INSERT INTO public.order_status_history (order_id, status, notes, created_by)
  VALUES (target_order_id, 'Cancelled', 'Reason: ' || COALESCE(reason_text, 'Cancelled by customer'), auth.uid());

  -- 5. Restore stock in public.products and public.inventory
  FOR item_rec IN 
    SELECT product_id, quantity FROM public.order_items WHERE order_id = target_order_id
  LOOP
    IF item_rec.product_id IS NOT NULL THEN
      -- Restore stock in products
      UPDATE public.products
      SET stock = COALESCE(stock, 0) + item_rec.quantity,
          updated_at = NOW()
      WHERE id = item_rec.product_id;

      -- Restore stock in inventory if matching row exists
      UPDATE public.inventory
      SET current_stock = COALESCE(current_stock, 0) + item_rec.quantity,
          updated_at = NOW()
      WHERE product_id = item_rec.product_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'message', 'Order cancelled successfully.');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.cancel_customer_order(UUID, TEXT) TO authenticated;
