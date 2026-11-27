-- Migration: 00108_enforce_payment_before_branch_handover.sql
-- Purpose: Enforce at database level that an order cannot transition to 'Delivered'
-- unless payment_status = 'Paid' OR the order is a Credit Account order for a customer
-- with an approved credit account (and payment_status is not Failed/Cancelled).
-- NOTE: Complements existing trg_enforce_order_otp_before_delivered (00104).
-- DO NOT APPLY WITHOUT REVIEW — staged locally only.

CREATE OR REPLACE FUNCTION public.enforce_payment_or_credit_before_delivered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_status TEXT;
  v_payment_method TEXT;
  v_is_credit_order BOOLEAN := FALSE;
  v_credit_approved BOOLEAN := FALSE;
BEGIN
  -- Only validate when transitioning into 'Delivered'
  IF NEW.status = 'Delivered' AND (OLD.status IS DISTINCT FROM 'Delivered') THEN
    -- Preserve service_role (verified server functions) only
    IF auth.role() = 'service_role' THEN
      RETURN NEW;
    END IF;

    v_payment_status := LOWER(TRIM(COALESCE(NEW.payment_status, 'Pending')));

    -- Paid orders satisfy payment requirement immediately
    IF v_payment_status = 'paid' THEN
      RETURN NEW;
    END IF;

    -- Explicitly failed or cancelled payments can never be handed over as unpaid
    IF v_payment_status IN ('failed', 'cancelled', 'canceled') THEN
      RAISE EXCEPTION 'Cannot mark order as Delivered: payment status is %.', COALESCE(NEW.payment_status, 'Failed')
        USING ERRCODE = 'P0001';
    END IF;

    -- Check if order is a Credit Account order
    v_payment_method := LOWER(TRIM(COALESCE(NEW.delivery_address->>'payment_method', '')));
    v_is_credit_order :=
      (v_payment_method LIKE '%credit account%')
      OR (LOWER(COALESCE(NEW.notes, '')) LIKE '%credit account%');

    IF v_is_credit_order AND NEW.customer_id IS NOT NULL THEN
      SELECT
        COALESCE(p.credit_account_approved, FALSE)
        OR COALESCE((p.notification_prefs->'gas_application'->>'credit_account_approved')::BOOLEAN, FALSE)
      INTO v_credit_approved
      FROM public.profiles p
      WHERE p.id = NEW.customer_id;

      IF COALESCE(v_credit_approved, FALSE) THEN
        RETURN NEW;
      END IF;
    END IF;

    RAISE EXCEPTION 'Cannot mark order as Delivered: payment is not confirmed and no approved credit account covers this order.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_payment_or_credit_before_delivered ON public.orders;
CREATE TRIGGER trg_enforce_payment_or_credit_before_delivered
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_payment_or_credit_before_delivered();
