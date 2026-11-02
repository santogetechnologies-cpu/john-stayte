-- ====================================================================
-- JOHN STAYTE SERVICES - PHASE 1 CUSTOMER APPLICATION & APPROVAL WORKFLOW
-- Migration: 00091_gas_customer_applications_phase1_workflow.sql
-- ====================================================================

-- 1. Extend gas_customer_applications table safely
ALTER TABLE public.gas_customer_applications
  ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'HOME' CHECK (customer_type IN ('HOME', 'BUSINESS')),
  ADD COLUMN IF NOT EXISTS has_previous_purchases BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS previous_account_details TEXT,
  ADD COLUMN IF NOT EXISTS application_reference TEXT,
  ADD COLUMN IF NOT EXISTS pricing_band TEXT,
  ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_account_approved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS more_info_requested TEXT,
  ADD COLUMN IF NOT EXISTS more_info_response TEXT,
  ADD COLUMN IF NOT EXISTS decision_history JSONB DEFAULT '[]'::jsonb;

-- 2. Relax status check constraint to support all Phase 1 workflow states
DO $$
BEGIN
  -- Drop existing status constraint if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'gas_customer_applications_status_check'
      AND conrelid = 'public.gas_customer_applications'::regclass
  ) THEN
    ALTER TABLE public.gas_customer_applications
      DROP CONSTRAINT gas_customer_applications_status_check;
  END IF;

  -- Add updated constraint including PENDING, MORE_INFO_NEEDED, APPROVED, DECLINED, REJECTED, SUBMITTED
  ALTER TABLE public.gas_customer_applications
    ADD CONSTRAINT gas_customer_applications_status_check
    CHECK (status IN ('NOT_COMPLETED', 'SUBMITTED', 'PENDING', 'MORE_INFO_NEEDED', 'APPROVED', 'DECLINED', 'REJECTED'));
END $$;

-- 3. Extend profiles table for customer approval, pricing band, discount, and credit limits
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pricing_band TEXT DEFAULT 'Standard Domestic',
  ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_account_approved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS account_approved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS application_status TEXT DEFAULT 'NOT_APPLIED';

-- 4. Fast query indexes
CREATE INDEX IF NOT EXISTS idx_gas_customer_apps_reference ON public.gas_customer_applications(application_reference);
CREATE INDEX IF NOT EXISTS idx_profiles_account_approved ON public.profiles(account_approved);

-- 5. Harden RLS: Ensure Managers and Admins have full access and Customers can view/update their own application
DROP POLICY IF EXISTS "Customers can view own applications" ON public.gas_customer_applications;
CREATE POLICY "Customers can view own applications"
  ON public.gas_customer_applications FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_admin_or_manager());

DROP POLICY IF EXISTS "Customers can update own application" ON public.gas_customer_applications;
CREATE POLICY "Customers can update own application"
  ON public.gas_customer_applications FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_admin_or_manager())
  WITH CHECK (
    public.is_admin_or_manager() OR (
      customer_id = auth.uid() AND (
        -- Customer can update their details and reply when status is NOT_COMPLETED, SUBMITTED, PENDING, or MORE_INFO_NEEDED
        status IN ('NOT_COMPLETED', 'SUBMITTED', 'PENDING', 'MORE_INFO_NEEDED')
      )
    )
  );

-- 6. Trigger to generate canonical application reference (e.g. JSS-APP-XXXXXX) if missing
CREATE OR REPLACE FUNCTION public.set_gas_application_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.application_reference IS NULL OR NEW.application_reference = '' THEN
    NEW.application_reference := 'JSS-APP-' || UPPER(SUBSTRING(COALESCE(NEW.id::text, gen_random_uuid()::text) FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_gas_application_reference ON public.gas_customer_applications;
CREATE TRIGGER trg_set_gas_application_reference
  BEFORE INSERT ON public.gas_customer_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_gas_application_reference();

-- 7. Record migration in schema_migrations
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('00091', 'gas_customer_applications_phase1_workflow')
ON CONFLICT (version) DO NOTHING;

