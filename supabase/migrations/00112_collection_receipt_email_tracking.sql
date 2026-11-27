-- Migration: 00112_collection_receipt_email_tracking.sql
-- Purpose: Add idempotent Click & Collect receipt email tracking columns
-- to public.orders without modifying existing order totals, payment status,
-- or inventory records.
-- NOTE: Staged locally only — DO NOT APPLY TO PRODUCTION WITHOUT REVIEW.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS receipt_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS receipt_email_id text,
  ADD COLUMN IF NOT EXISTS receipt_email_error text,
  ADD COLUMN IF NOT EXISTS receipt_email_attempts integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_receipt_email_attempts_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_receipt_email_attempts_check
      CHECK (receipt_email_attempts >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_receipt_email_pending
  ON public.orders(status, receipt_email_sent_at)
  WHERE status = 'Delivered' AND receipt_email_sent_at IS NULL;
