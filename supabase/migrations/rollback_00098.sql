-- ==============================================================================
-- Rollback Script for Migration 00098: branch_gas_pricing_bands_and_rules.sql
-- ==============================================================================

BEGIN;

-- 1. Drop audit logs
DROP TABLE IF EXISTS public.gas_pricing_audit_logs CASCADE;

-- 2. Drop branch gas prices
DROP TABLE IF EXISTS public.branch_gas_prices CASCADE;

-- 3. Drop gas pricing bands
DROP TABLE IF EXISTS public.gas_pricing_bands CASCADE;

-- 4. Remove backward-compatible foreign key columns
ALTER TABLE public.profiles DROP COLUMN IF EXISTS pricing_band_id;
ALTER TABLE public.gas_customer_applications DROP COLUMN IF EXISTS pricing_band_id;

-- 5. Drop trigger function
DROP FUNCTION IF EXISTS public.handle_pricing_updated_at CASCADE;

-- 6. Unregister migration record
DELETE FROM supabase_migrations.schema_migrations WHERE version = '00098';

COMMIT;

