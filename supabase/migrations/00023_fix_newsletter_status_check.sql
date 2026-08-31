-- 00023_fix_newsletter_status_check.sql
-- Allow both 'active' and 'subscribed' in newsletter_subscribers check constraint

ALTER TABLE public.newsletter_subscribers DROP CONSTRAINT IF EXISTS newsletter_subscribers_status_check;
ALTER TABLE public.newsletter_subscribers ADD CONSTRAINT newsletter_subscribers_status_check 
  CHECK (status IN ('active', 'subscribed', 'unsubscribed'));
