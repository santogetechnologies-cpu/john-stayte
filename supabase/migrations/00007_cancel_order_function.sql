-- ====================================================================
-- MIGRATION: 00007_cancel_order_function.sql
-- Atomic Customer Order Cancellation and Stock Restoration Function
-- ====================================================================

CREATE OR REPLACE FUNCTION public.cancel_customer_order(target_order_id UUID)
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
    RETURN jsonb_build_object('success', false, 'error', 'Order cannot be cancelled at stage: ' || target_order.status);
  END IF;

  -- 3. Update order status to Cancelled
  UPDATE public.orders
  SET status = 'Cancelled',
      updated_at = NOW()
  WHERE id = target_order_id;

  -- 4. Record status history entry
  INSERT INTO public.order_status_history (order_id, status, notes, created_by)
  VALUES (target_order_id, 'Cancelled', 'Order cancelled by customer', auth.uid());

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
GRANT EXECUTE ON FUNCTION public.cancel_customer_order(UUID) TO authenticated;
