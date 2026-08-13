-- ====================================================================
-- MIGRATION: 00009_fix_cancellation_created_by.sql
-- Fix order_status_history created_by column and cancel_customer_order RPC
-- ====================================================================

-- 1. Ensure created_by column exists in public.order_status_history for compatibility
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'order_status_history' AND column_name = 'created_by'
  ) THEN 
    ALTER TABLE public.order_status_history ADD COLUMN created_by UUID REFERENCES public.profiles(id);
  END IF;
END $$;

-- 2. Update cancel_customer_order RPC function with exact schema column mapping
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
  user_full_name TEXT;
BEGIN
  -- Get requesting user email and name
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  SELECT full_name INTO user_full_name FROM public.profiles WHERE id = auth.uid();

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

  -- 2. Check cancellable status (Prevent cancelling already cancelled orders or out-for-delivery orders)
  IF target_order.status IN ('Packed', 'Out for Delivery', 'Delivered', 'Cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order cannot be cancelled at current stage: ' || target_order.status);
  END IF;

  -- 3. Update order status to Cancelled and store cancellation reason
  UPDATE public.orders
  SET status = 'Cancelled',
      cancellation_reason = COALESCE(reason_text, 'Cancelled by customer'),
      cancelled_at = NOW(),
      cancelled_by = auth.uid(),
      updated_at = NOW()
  WHERE id = target_order_id;

  -- 4. Record status history entry (populates actor_id, actor_name, created_by, and notes)
  INSERT INTO public.order_status_history (
    order_id,
    status,
    actor_id,
    actor_name,
    created_by,
    notes,
    created_at
  ) VALUES (
    target_order_id,
    'Cancelled',
    auth.uid(),
    COALESCE(user_full_name, target_order.customer_name, 'Customer'),
    auth.uid(),
    'Reason: ' || COALESCE(reason_text, 'Cancelled by customer'),
    NOW()
  );

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
