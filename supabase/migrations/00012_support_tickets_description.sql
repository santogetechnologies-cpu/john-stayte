-- ====================================================================
-- MIGRATION: 00012_support_tickets_description.sql
-- Add description column to public.support_tickets
-- ====================================================================

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'support_tickets' AND column_name = 'description'
  ) THEN 
    ALTER TABLE public.support_tickets ADD COLUMN description TEXT;
  END IF;
END $$;
