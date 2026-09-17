-- ====================================================================
-- JOHN STAYTE SERVICES - SECURE ADMIN CUSTOMER DELETE FUNCTION
-- Migration: 00074_admin_delete_customer_function.sql
-- ====================================================================

DROP FUNCTION IF EXISTS public.admin_delete_customer(UUID);
DROP FUNCTION IF EXISTS public.admin_delete_customer;

CREATE OR REPLACE FUNCTION public.admin_delete_customer(target_customer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_calling_user_id UUID;
  v_calling_role TEXT;
  v_calling_email TEXT;
  v_calling_name TEXT;
  v_customer_role TEXT;
  v_customer_email TEXT;
  v_customer_name TEXT;
  v_orders_count INT := 0;
BEGIN
  -- 1. Security Check: Caller must be authenticated
  v_calling_user_id := auth.uid();
  IF v_calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- 2. Authorization Check: Caller MUST be an Administrator in public.profiles
  SELECT role, email, full_name 
  INTO v_calling_role, v_calling_email, v_calling_name
  FROM public.profiles
  WHERE id = v_calling_user_id;

  IF v_calling_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only Administrators are authorized to delete customer accounts.';
  END IF;

  -- 3. Safety Check: Prevent admin from deleting own account
  IF v_calling_user_id = target_customer_id THEN
    RAISE EXCEPTION 'Operation not allowed: You cannot delete your own Administrator account.';
  END IF;

  -- 4. Target Account Validation
  SELECT role, email, full_name 
  INTO v_customer_role, v_customer_email, v_customer_name
  FROM public.profiles
  WHERE id = target_customer_id;

  IF v_customer_email IS NULL THEN
    -- Check auth.users directly if profile was missing
    SELECT email INTO v_customer_email
    FROM auth.users
    WHERE id = target_customer_id;

    IF v_customer_email IS NULL THEN
      RAISE EXCEPTION 'Customer account not found.';
    END IF;
  END IF;

  -- 5. Safety Check: Do NOT delete Staff/Admin accounts through Customer Directory
  IF v_customer_role IN ('admin', 'manager', 'delivery_agent') THEN
    RAISE EXCEPTION 'Operation not allowed: Cannot delete administrative or staff accounts (%) through customer directory.', v_customer_role;
  END IF;

  -- 6. Preserve Historical Orders & Invoices (Business & Tax Audit Safety)
  SELECT COUNT(*) INTO v_orders_count
  FROM public.orders
  WHERE customer_id = target_customer_id;

  IF v_orders_count > 0 THEN
    UPDATE public.orders
    SET 
      customer_id = NULL,
      notes = COALESCE(notes || ' | ', '') || 'Customer account ' || COALESCE(v_customer_email, target_customer_id::TEXT) || ' deleted on ' || NOW()::DATE::TEXT
    WHERE customer_id = target_customer_id;
  END IF;

  -- Decouple orders cancelled_by foreign key if any
  UPDATE public.orders
  SET cancelled_by = NULL
  WHERE cancelled_by = target_customer_id;

  -- Decouple order status history
  BEGIN
    UPDATE public.order_status_history
    SET created_by = NULL
    WHERE created_by = target_customer_id;
  EXCEPTION WHEN OTHERS THEN
    -- Column or table optional
  END;

  -- Decouple Invoices
  BEGIN
    UPDATE public.invoices
    SET customer_id = NULL
    WHERE customer_id = target_customer_id;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore if table does not exist
  END;

  -- Decouple Support Tickets
  BEGIN
    UPDATE public.support_tickets
    SET customer_id = NULL
    WHERE customer_id = target_customer_id;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore if table does not exist
  END;

  -- Decouple Reviews
  BEGIN
    UPDATE public.reviews
    SET user_id = NULL
    WHERE user_id = target_customer_id;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore
  END;

  -- Decouple Payment Transactions if applicable
  BEGIN
    UPDATE public.payment_transactions
    SET customer_id = NULL
    WHERE customer_id = target_customer_id;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore
  END;

  -- Decouple previous Audit Logs
  BEGIN
    UPDATE public.audit_logs
    SET actor_id = NULL
    WHERE actor_id = target_customer_id;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore
  END;

  -- 7. Clean Up Customer Transient Data
  BEGIN
    DELETE FROM public.cart_items WHERE user_id = target_customer_id;
  EXCEPTION WHEN OTHERS THEN
  END;

  BEGIN
    DELETE FROM public.customer_addresses WHERE user_id = target_customer_id;
  EXCEPTION WHEN OTHERS THEN
  END;

  BEGIN
    DELETE FROM public.customer_notifications WHERE user_id = target_customer_id;
  EXCEPTION WHEN OTHERS THEN
  END;

  BEGIN
    DELETE FROM public.notifications WHERE user_id = target_customer_id;
  EXCEPTION WHEN OTHERS THEN
  END;

  BEGIN
    DELETE FROM public.email_verifications WHERE user_id = target_customer_id;
  EXCEPTION WHEN OTHERS THEN
  END;

  BEGIN
    DELETE FROM public.gas_customer_applications WHERE customer_id = target_customer_id;
  EXCEPTION WHEN OTHERS THEN
  END;

  -- Delete Wishlist items and Wishlist
  BEGIN
    DELETE FROM public.wishlist_items
    WHERE wishlist_id IN (SELECT id FROM public.wishlists WHERE user_id = target_customer_id);
    DELETE FROM public.wishlists WHERE user_id = target_customer_id;
  EXCEPTION WHEN OTHERS THEN
  END;

  -- 8. Record Audit Log for Customer Account Deletion
  BEGIN
    INSERT INTO public.audit_logs (
      actor_id,
      actor_name,
      action,
      target_type,
      target_id,
      metadata
    ) VALUES (
      v_calling_user_id,
      COALESCE(v_calling_name, v_calling_email, 'Administrator'),
      'CUSTOMER_DELETED',
      'profiles',
      target_customer_id::TEXT,
      jsonb_build_object(
        'customer_id', target_customer_id,
        'customer_email', v_customer_email,
        'customer_name', v_customer_name,
        'historical_orders_retained', v_orders_count,
        'deleted_by_admin_id', v_calling_user_id,
        'deleted_by_admin_email', v_calling_email,
        'timestamp', NOW()
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Non-blocking fallback if audit_logs schema differs
  END;

  -- 9. Delete Profile record
  DELETE FROM public.profiles WHERE id = target_customer_id;

  -- 10. Permanently delete from auth.users (cascades auth tokens, sessions, credentials)
  DELETE FROM auth.users WHERE id = target_customer_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_customer_id', target_customer_id,
    'email', v_customer_email,
    'orders_retained', v_orders_count,
    'message', 'Customer account deleted successfully.'
  );
END;
$$;

-- Grant execute to authenticated users (internal admin role check strictly enforces authorization)
GRANT EXECUTE ON FUNCTION public.admin_delete_customer(UUID) TO authenticated;
