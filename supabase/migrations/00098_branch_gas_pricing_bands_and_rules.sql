-- ==============================================================================
-- Migration: 00098_branch_gas_pricing_bands_and_rules.sql
-- Description: Branch-Based Gas Pricing and Customer Discount Management System
-- Authority:
--   1. Weston Gas Prices Memorandum (18 May 2026)
--   2. Weston Discount Bands 89 (17.5%), 90 (20%), 97 (22.5%), 98 (25%)
--   3. Eastington Discounted Gas Prices Excel Workbook (18 May 2026 revision)
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. TABLE: public.gas_pricing_bands
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gas_pricing_bands (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    branch_id UUID REFERENCES public.auto_gas_stations(id) ON DELETE SET NULL,
    location_name TEXT NOT NULL,
    location_code TEXT NOT NULL,
    band_number TEXT NOT NULL,
    customer_category TEXT NOT NULL,
    band_type TEXT NOT NULL CHECK (band_type IN ('percentage', 'fixed')),
    discount_percentage NUMERIC(5,2) CHECK (discount_percentage IS NULL OR (discount_percentage >= 0 AND discount_percentage <= 100)),
    delivery_fee_waived BOOLEAN NOT NULL DEFAULT true,
    pricing_source TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    effective_from TIMESTAMPTZ DEFAULT '2026-05-18 00:00:00+00',
    effective_to TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_gas_pricing_band
    ON public.gas_pricing_bands (location_code, band_number, customer_category);

CREATE INDEX IF NOT EXISTS idx_gas_pricing_bands_branch_id
    ON public.gas_pricing_bands (branch_id);

CREATE INDEX IF NOT EXISTS idx_gas_pricing_bands_location_code
    ON public.gas_pricing_bands (location_code);

-- ------------------------------------------------------------------------------
-- 2. TABLE: public.branch_gas_prices
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.branch_gas_prices (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    pricing_band_id TEXT NOT NULL REFERENCES public.gas_pricing_bands(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.auto_gas_stations(id) ON DELETE SET NULL,
    location_name TEXT NOT NULL,
    gas_type TEXT NOT NULL,
    cylinder_size TEXT NOT NULL,
    price_exc_vat NUMERIC(10,2),
    price_inc_vat NUMERIC(10,2),
    vat_status TEXT NOT NULL CHECK (vat_status IN ('EXCLUDING_VAT', 'INCLUDING_VAT', 'SPLIT_DOCUMENTED', 'UNSPECIFIED')),
    vat_rate NUMERIC(5,4),
    currency TEXT NOT NULL DEFAULT 'GBP',
    cost_price NUMERIC(10,2),
    is_special_customer_price BOOLEAN NOT NULL DEFAULT false,
    special_customer_code TEXT,
    special_customer_name TEXT,
    effective_from TIMESTAMPTZ DEFAULT '2026-05-18 00:00:00+00',
    effective_to TIMESTAMPTZ,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_std_branch_gas_price
    ON public.branch_gas_prices (pricing_band_id, gas_type, cylinder_size)
    WHERE special_customer_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_special_cust_branch_gas_price
    ON public.branch_gas_prices (pricing_band_id, gas_type, cylinder_size, special_customer_code)
    WHERE special_customer_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_branch_gas_prices_band_id
    ON public.branch_gas_prices (pricing_band_id);

CREATE INDEX IF NOT EXISTS idx_branch_gas_prices_gas_cylinder
    ON public.branch_gas_prices (gas_type, cylinder_size);

-- ------------------------------------------------------------------------------
-- 3. CUSTOMER PRICING ASSIGNMENT INTEGRATION (BACKWARD COMPATIBLE)
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS pricing_band_id TEXT REFERENCES public.gas_pricing_bands(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS customer_code TEXT;

ALTER TABLE public.gas_customer_applications
    ADD COLUMN IF NOT EXISTS pricing_band_id TEXT REFERENCES public.gas_pricing_bands(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS customer_code TEXT;

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.gas_pricing_bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_gas_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage gas pricing bands" ON public.gas_pricing_bands;
CREATE POLICY "Admin manage gas pricing bands"
    ON public.gas_pricing_bands FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admin manage branch gas prices" ON public.branch_gas_prices;
CREATE POLICY "Admin manage branch gas prices"
    ON public.branch_gas_prices FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admin and Manager view all gas pricing bands" ON public.gas_pricing_bands;
CREATE POLICY "Admin and Manager view all gas pricing bands"
    ON public.gas_pricing_bands FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.role = 'admin'
                OR (
                    profiles.role = 'manager'
                    AND (
                        profiles.assigned_branch_id IS NULL
                        OR gas_pricing_bands.branch_id IS NULL
                        OR gas_pricing_bands.branch_id = profiles.assigned_branch_id
                        OR LOWER(gas_pricing_bands.location_name) = LOWER(profiles.assigned_branch)
                        OR LOWER(gas_pricing_bands.location_code) = LOWER(profiles.assigned_branch)
                    )
                )
            )
        )
    );

DROP POLICY IF EXISTS "Authorized customers view assigned pricing band" ON public.gas_pricing_bands;
CREATE POLICY "Authorized customers view assigned pricing band"
    ON public.gas_pricing_bands FOR SELECT
    TO authenticated
    USING (
        is_active = true
        AND (
            gas_pricing_bands.id = (
                SELECT p.pricing_band_id FROM public.profiles p WHERE p.id = auth.uid()
            )
            OR (
                gas_pricing_bands.band_number = (
                    SELECT p.pricing_band FROM public.profiles p WHERE p.id = auth.uid()
                )
            )
            OR (
                (SELECT p.pricing_band_id FROM public.profiles p WHERE p.id = auth.uid()) IS NULL
                AND (SELECT p.pricing_band FROM public.profiles p WHERE p.id = auth.uid()) IS NULL
                AND gas_pricing_bands.band_number = '20'
                AND gas_pricing_bands.customer_category = 'Retail Normal'
            )
        )
    );

DROP POLICY IF EXISTS "Admin and Manager view branch gas prices" ON public.branch_gas_prices;
CREATE POLICY "Admin and Manager view branch gas prices"
    ON public.branch_gas_prices FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.role = 'admin'
                OR (
                    profiles.role = 'manager'
                    AND (
                        profiles.assigned_branch_id IS NULL
                        OR branch_gas_prices.branch_id IS NULL
                        OR branch_gas_prices.branch_id = profiles.assigned_branch_id
                        OR LOWER(branch_gas_prices.location_name) = LOWER(profiles.assigned_branch)
                    )
                )
            )
        )
    );

DROP POLICY IF EXISTS "Authorized customers view assigned gas prices" ON public.branch_gas_prices;
CREATE POLICY "Authorized customers view assigned gas prices"
    ON public.branch_gas_prices FOR SELECT
    TO authenticated
    USING (
        is_active = true
        AND (
            (
                pricing_band_id = (
                    SELECT p.pricing_band_id FROM public.profiles p WHERE p.id = auth.uid()
                )
                AND NOT is_special_customer_price
            )
            OR (
                is_special_customer_price = true
                AND special_customer_code IS NOT NULL
                AND (
                    special_customer_code = (SELECT p.customer_code FROM public.profiles p WHERE p.id = auth.uid())
                    OR special_customer_code = (SELECT p.assigned_branch FROM public.profiles p WHERE p.id = auth.uid())
                    OR EXISTS (
                        SELECT 1 FROM public.gas_customer_applications a
                        WHERE a.customer_id = auth.uid()
                        AND (
                            a.customer_code = branch_gas_prices.special_customer_code
                            OR a.previous_account_details ILIKE '%' || branch_gas_prices.special_customer_code || '%'
                            OR a.business_name ILIKE '%' || branch_gas_prices.special_customer_name || '%'
                        )
                    )
                )
            )
            OR (
                (SELECT p.pricing_band_id FROM public.profiles p WHERE p.id = auth.uid()) IS NULL
                AND (SELECT p.pricing_band FROM public.profiles p WHERE p.id = auth.uid()) IS NULL
                AND NOT is_special_customer_price
                AND EXISTS (
                    SELECT 1 FROM public.gas_pricing_bands b
                    WHERE b.id = branch_gas_prices.pricing_band_id
                    AND b.band_number = '20'
                    AND b.customer_category = 'Retail Normal'
                )
            )
        )
    );

-- ------------------------------------------------------------------------------
-- 5. PRICING HISTORY / AUDIT LOG TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gas_pricing_audit_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    price_id TEXT REFERENCES public.branch_gas_prices(id) ON DELETE SET NULL,
    pricing_band_id TEXT REFERENCES public.gas_pricing_bands(id) ON DELETE SET NULL,
    band_number TEXT NOT NULL,
    location_name TEXT NOT NULL,
    gas_type TEXT NOT NULL,
    cylinder_size TEXT NOT NULL,
    previous_price_exc_vat NUMERIC(10,2),
    previous_price_inc_vat NUMERIC(10,2),
    new_price_exc_vat NUMERIC(10,2),
    new_price_inc_vat NUMERIC(10,2),
    changed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    changed_by_name TEXT,
    changed_by_email TEXT,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_gas_pricing_audit_logs_price_id
    ON public.gas_pricing_audit_logs (price_id);

CREATE INDEX IF NOT EXISTS idx_gas_pricing_audit_logs_band_id
    ON public.gas_pricing_audit_logs (pricing_band_id);

CREATE INDEX IF NOT EXISTS idx_gas_pricing_audit_logs_created_at
    ON public.gas_pricing_audit_logs (created_at DESC);

ALTER TABLE public.gas_pricing_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin and Manager view pricing audit logs" ON public.gas_pricing_audit_logs;
CREATE POLICY "Admin and Manager view pricing audit logs"
    ON public.gas_pricing_audit_logs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

DROP POLICY IF EXISTS "Admin insert pricing audit logs" ON public.gas_pricing_audit_logs;
CREATE POLICY "Admin insert pricing audit logs"
    ON public.gas_pricing_audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- ------------------------------------------------------------------------------
-- 6. TRIGGER: Automatic updated_at timestamp management
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_pricing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gas_pricing_bands_updated_at ON public.gas_pricing_bands;
CREATE TRIGGER trg_gas_pricing_bands_updated_at
    BEFORE UPDATE ON public.gas_pricing_bands
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_pricing_updated_at();

DROP TRIGGER IF EXISTS trg_branch_gas_prices_updated_at ON public.branch_gas_prices;
CREATE TRIGGER trg_branch_gas_prices_updated_at
    BEFORE UPDATE ON public.branch_gas_prices
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_pricing_updated_at();

-- ------------------------------------------------------------------------------
-- 7. IDEMPOTENT SEED DATA: 66 PRICING BANDS
-- ------------------------------------------------------------------------------
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-weston-89', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'WESTON', '89', 'Band 89 - 17.5% Disc',
    'percentage', 17.5, true, 'WESTON_BAND_89_TIER_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Documented 17.5% discount tier across all cylinder sizes.'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-weston-90', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'WESTON', '90', 'Band 90 - 20% Disc',
    'percentage', 20, true, 'WESTON_BAND_90_TIER_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Documented 20% discount tier. Includes Cheddar Bridge, Magor Fuels, Retreat Caravan Park special accounts.'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-weston-97', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'WESTON', '97', 'Band 97 - 22.5% Disc',
    'percentage', 22.5, true, 'WESTON_BAND_97_TIER_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Documented 22.5% discount tier across all cylinder sizes.'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-weston-98', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'WESTON', '98', 'Band 98 - 25% Disc',
    'percentage', 25, true, 'WESTON_BAND_98_TIER_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Documented 25% discount tier. Includes Glastonbury Egg Co, Ebbways Farm, Amesbury & Puddy special accounts.'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-weston-memo-20', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'WESTON', '20', 'Retail Normal',
    'fixed', NULL, false, 'WESTON_MEMORANDUM_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Weston Memorandum Band 20: Retail Normal'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-weston-memo-31', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'WESTON', '31', 'Weston Astute Discounted',
    'fixed', NULL, true, 'WESTON_MEMORANDUM_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Weston Memorandum Band 31: Weston Astute Discounted'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-weston-memo-10', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'WESTON', '10', 'Business Normal',
    'fixed', NULL, false, 'WESTON_MEMORANDUM_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Weston Memorandum Band 10: Business Normal'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-weston-memo-12', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'WESTON', '12', 'Business Discounted',
    'fixed', NULL, true, 'WESTON_MEMORANDUM_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Weston Memorandum Band 12: Business Discounted'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-weston-memo-15', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'WESTON', '15', 'Business Astute',
    'fixed', NULL, true, 'WESTON_MEMORANDUM_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Weston Memorandum Band 15: Business Astute'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-weston-memo-36', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'WESTON', '36', 'Fairground & Travellers',
    'fixed', NULL, true, 'WESTON_MEMORANDUM_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Weston Memorandum Band 36: Fairground & Travellers'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-weston-memo-11', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'WESTON', '11', 'Catering',
    'fixed', NULL, true, 'WESTON_MEMORANDUM_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Weston Memorandum Band 11: Catering'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-weston-memo-21', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'WESTON', '21', 'Pub Catering',
    'fixed', NULL, true, 'WESTON_MEMORANDUM_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Weston Memorandum Band 21: Pub Catering'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-weston-memo-34-39', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'WESTON', '34/39', 'Weston Special Prices (Various above £72)',
    'fixed', NULL, true, 'WESTON_MEMORANDUM_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Weston Memorandum Band 34/39: Weston Special Prices (Various above £72)'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-weston-memo-19', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'WESTON', '19', 'Business Conversion from Comp',
    'fixed', NULL, true, 'WESTON_MEMORANDUM_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Weston Memorandum Band 19: Business Conversion from Comp'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-weston-memo-39', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'WESTON', '39', 'Western Grill (very special)',
    'fixed', NULL, true, 'WESTON_MEMORANDUM_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Weston Memorandum Band 39: Western Grill (very special)'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-weston-memo-32', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'WESTON', '32', 'Weston Discounted Mobile Home Parks / Central Heating',
    'fixed', NULL, true, 'WESTON_MEMORANDUM_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Weston Memorandum Band 32: Weston Discounted Mobile Home Parks / Central Heating'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-weston-memo-33', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'WESTON', '33', 'Astute Central Heating / Warrens Village Park',
    'fixed', NULL, true, 'WESTON_MEMORANDUM_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Weston Memorandum Band 33: Astute Central Heating / Warrens Village Park'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-weston-memo-35-38', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'WESTON', '35/38', 'Normal Trailer Park Special',
    'fixed', NULL, true, 'WESTON_MEMORANDUM_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Weston Memorandum Band 35/38: Normal Trailer Park Special'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-weston-memo-32-and-33', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'WESTON', '32 & 33', 'Business Very Astute',
    'fixed', NULL, true, 'WESTON_MEMORANDUM_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Weston Memorandum Band 32 & 33: Business Very Astute'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-weston-memo-38', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'WESTON', '38', 'Mobile Caravan Parks - Warrens Village',
    'fixed', NULL, true, 'WESTON_MEMORANDUM_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Weston Memorandum Band 38: Mobile Caravan Parks - Warrens Village'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-weston-memo-56', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'WESTON', '56', 'Roofers',
    'fixed', NULL, true, 'WESTON_MEMORANDUM_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Weston Memorandum Band 56: Roofers'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-weston-memo-32-35', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'WESTON', '32/35', 'Special Price B',
    'fixed', NULL, true, 'WESTON_MEMORANDUM_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Weston Memorandum Band 32/35: Special Price B'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-weston-memo-34-56', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'WESTON', '34/56', 'Off Site Solutions',
    'fixed', NULL, true, 'WESTON_MEMORANDUM_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Weston Memorandum Band 34/56: Off Site Solutions'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-weston-memo-19-32-36-38', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'WESTON', '19/32/36/38', 'Fairground & Travelers',
    'fixed', NULL, true, 'WESTON_MEMORANDUM_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Weston Memorandum Band 19/32/36/38: Fairground & Travelers'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-20', NULL, 'Eastington', 'EASTINGTON', '20', 'RETAIL NORMAL',
    'fixed', NULL, false, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 20: RETAIL NORMAL'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-37', NULL, 'Eastington', 'EASTINGTON', '37', 'RETAIL ASTUTE',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 37: RETAIL ASTUTE'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-10', NULL, 'Eastington', 'EASTINGTON', '10', 'BUSINESS NORMAL',
    'fixed', NULL, false, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 10: BUSINESS NORMAL'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-12', NULL, 'Eastington', 'EASTINGTON', '12', 'BUSINESS DISCOUNTED',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 12: BUSINESS DISCOUNTED'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-16', NULL, 'Eastington', 'EASTINGTON', '16', 'BUSINESS LARGE DISCOUNT',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 16: BUSINESS LARGE DISCOUNT'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-15', NULL, 'Eastington', 'EASTINGTON', '15', 'BUSINESS ASTUTE',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 15: BUSINESS ASTUTE'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-14', NULL, 'Eastington', 'EASTINGTON', '14', 'BUSINESS VERY ASTUTE',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 14: BUSINESS VERY ASTUTE'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-11', NULL, 'Eastington', 'EASTINGTON', '11', 'CATERING, FIXED AND MOBILE',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 11: CATERING, FIXED AND MOBILE'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-36', NULL, 'Eastington', 'EASTINGTON', '36', 'TRAVELLERS WITHIN 10 MILES',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 36: TRAVELLERS WITHIN 10 MILES'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-30', NULL, 'Eastington', 'EASTINGTON', '30', 'TRAVELLERS PLUS    10 MILES',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 30: TRAVELLERS PLUS    10 MILES'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-41', NULL, 'Eastington', 'EASTINGTON', '41', 'VARIOUS MOBILE HOME SITES',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 41: VARIOUS MOBILE HOME SITES'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-13', NULL, 'Eastington', 'EASTINGTON', '13', 'GRAIN DRYING  46 & 47KG',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 13: GRAIN DRYING  46 & 47KG'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-19', NULL, 'Eastington', 'EASTINGTON', '19', 'BUSINESS CONVERSION FROM COMPETITOR',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 19: BUSINESS CONVERSION FROM COMPETITOR'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-43', NULL, 'Eastington', 'EASTINGTON', '43', 'GREENACRES & LAKE LOUISE',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 43: GREENACRES & LAKE LOUISE'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-27', NULL, 'Eastington', 'EASTINGTON', '27', 'ORCH PK,3 COUNTIES,STAVERTON',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 27: ORCH PK,3 COUNTIES,STAVERTON'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-24', NULL, 'Eastington', 'EASTINGTON', '24', 'BERKELEY VALE PARK  & POPULARS',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 24: BERKELEY VALE PARK  & POPULARS'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-28', NULL, 'Eastington', 'EASTINGTON', '28', 'LONGFURLONG',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 28: LONGFURLONG'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-44', NULL, 'Eastington', 'EASTINGTON', '44', 'SHOWMANS SITES',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 44: SHOWMANS SITES'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-29', NULL, 'Eastington', 'EASTINGTON', '29', 'HAYDEN/ FAIR HAVEN/ OXBUTTS & BLUNSDEN',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 29: HAYDEN/ FAIR HAVEN/ OXBUTTS & BLUNSDEN'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-31', NULL, 'Eastington', 'EASTINGTON', '31', 'QUEDGLEY COURT PARK & WOODLANDS',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 31: QUEDGLEY COURT PARK & WOODLANDS'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-40', NULL, 'Eastington', 'EASTINGTON', '40', 'WOODLANDS,COALWAY,WYELANDS',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 40: WOODLANDS,COALWAY,WYELANDS'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-42', NULL, 'Eastington', 'EASTINGTON', '42', 'BELINDA,ST JAMES, ST MICHAEL,WYESIDE',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 42: BELINDA,ST JAMES, ST MICHAEL,WYESIDE'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-23', NULL, 'Eastington', 'EASTINGTON', '23', 'VALLEY VIEW & COTS MANOR',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 23: VALLEY VIEW & COTS MANOR'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-32', NULL, 'Eastington', 'EASTINGTON', '32', 'NORMAL',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 32: NORMAL'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-21', NULL, 'Eastington', 'EASTINGTON', '21', 'ASTUTE CUSTOMER',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 21: ASTUTE CUSTOMER'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-26', NULL, 'Eastington', 'EASTINGTON', '26', 'DIFFICULT DROPS VARIABLE',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 26: DIFFICULT DROPS VARIABLE'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-17-and-33', NULL, 'Eastington', 'EASTINGTON', '17 & 33', 'DOMESTIC CONVERSION, NEW & SPECIAL PRICES',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 17 & 33: DOMESTIC CONVERSION, NEW & SPECIAL PRICES'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-48', NULL, 'Eastington', 'EASTINGTON', '48', 'PUB BAND 48 GL  POSTCODES NORMAL',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 48: PUB BAND 48 GL  POSTCODES NORMAL'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-49', NULL, 'Eastington', 'EASTINGTON', '49', 'PUB BAND 49 GL  POSTCODES LARGE',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 49: PUB BAND 49 GL  POSTCODES LARGE'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-52', NULL, 'Eastington', 'EASTINGTON', '52', 'PUB BAND 52 NON GL POSTCODES NORMAL',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 52: PUB BAND 52 NON GL POSTCODES NORMAL'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-56', NULL, 'Eastington', 'EASTINGTON', '56', 'PUB BAND 56 WHOLESALER',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 56: PUB BAND 56 WHOLESALER'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-62', NULL, 'Eastington', 'EASTINGTON', '62', 'PUB BAND 62 NON GL POSTCODES LARGE',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 62: PUB BAND 62 NON GL POSTCODES LARGE'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-15-and-37', NULL, 'Eastington', 'EASTINGTON', '15 & 37', 'BUSINESS  & RETAIL ASTUTE',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 15 & 37: BUSINESS  & RETAIL ASTUTE'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-11-and-19-and-32', NULL, 'Eastington', 'EASTINGTON', '11, 19 & 32', 'CATERING, FIXED AND MOBILE',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 11, 19 & 32: CATERING, FIXED AND MOBILE'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-15-and-16', NULL, 'Eastington', 'EASTINGTON', '15 & 16', 'BUSINESS ASTUTE',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 15 & 16: BUSINESS ASTUTE'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-14-and-32', NULL, 'Eastington', 'EASTINGTON', '14 & 32', 'BUSINESS VERY ASTUTE',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 14 & 32: BUSINESS VERY ASTUTE'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-17-and-19-and-33', NULL, 'Eastington', 'EASTINGTON', '17, 19 & 33', 'BUSINESS CONVERSION, NEW & SPECIAL PRICES',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 17, 19 & 33: BUSINESS CONVERSION, NEW & SPECIAL PRICES'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-12-and-37', NULL, 'Eastington', 'EASTINGTON', '12 & 37', 'BUSINESS DISCOUNTED & FARRIERS',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 12 & 37: BUSINESS DISCOUNTED & FARRIERS'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-11-and-32', NULL, 'Eastington', 'EASTINGTON', '11 & 32', 'CATERING, FIXED AND MOBILE',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 11 & 32: CATERING, FIXED AND MOBILE'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-30-and-36,-and-44', NULL, 'Eastington', 'EASTINGTON', '30, 36, & 44', 'TRAVELLERS & ROOFERS',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 30, 36, & 44: TRAVELLERS & ROOFERS'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-20-and-10', NULL, 'Eastington', 'EASTINGTON', '20 & 10', 'RETAIL NORMAL',
    'fixed', NULL, false, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 20 & 10: RETAIL NORMAL'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.gas_pricing_bands (
    id, branch_id, location_name, location_code, band_number, customer_category,
    band_type, discount_percentage, delivery_fee_waived, pricing_source, is_active,
    effective_from, effective_to, notes
) VALUES (
    'band-east-12-and-14--and-17-and-32', NULL, 'Eastington', 'EASTINGTON', '12, 14 , 17 & 32', 'BUSINESS ASTUTE',
    'fixed', NULL, true, 'EASTINGTON_EXCEL_2026', true,
    '2026-05-18T00:00:00Z', NULL, 'Eastington Band 12, 14 , 17 & 32: BUSINESS ASTUTE'
) ON CONFLICT (id) DO UPDATE SET
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    location_code = EXCLUDED.location_code,
    band_number = EXCLUDED.band_number,
    customer_category = EXCLUDED.customer_category,
    band_type = EXCLUDED.band_type,
    discount_percentage = EXCLUDED.discount_percentage,
    delivery_fee_waived = EXCLUDED.delivery_fee_waived,
    pricing_source = EXCLUDED.pricing_source,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());

-- ------------------------------------------------------------------------------
-- 8. IDEMPOTENT SEED DATA: 157 AUTHORITATIVE CLIENT PRICES
-- ------------------------------------------------------------------------------
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w98-but-4.5', 'band-weston-98', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Butane', '4.5kg',
    23.93, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w98-but-7', 'band-weston-98', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Butane', '7kg',
    26.43, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w98-but-15', 'band-weston-98', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Butane', '15kg',
    41.61, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w98-pro-3.9', 'band-weston-98', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '3.9kg',
    20.36, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w98-pro-6', 'band-weston-98', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '6kg',
    23.5, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w98-pro-13', 'band-weston-98', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '13kg',
    35.71, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w98-pro-19', 'band-weston-98', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '19kg',
    44.29, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w98-pro-47', 'band-weston-98', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '47kg',
    81.07, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w98-auto-12', 'band-weston-98', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Automotive', '12kg',
    27.32, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w98-auto-18', 'band-weston-98', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Automotive', '18kg',
    39.29, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w98-patio-13', 'band-weston-98', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Patio', '13kg',
    38.57, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w98-patio-5', 'band-weston-98', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Patio', '5kg',
    17.14, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w98-spec-shar10', 'band-weston-98', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '47kg',
    77.5, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    true, 'SHAR10', 'The Glastonbury Egg Company (Simon Harding)',
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w98-spec-sgro02', 'band-weston-98', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '47kg',
    77.5, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    true, 'SGRO02', 'Ebbways Farm',
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w98-spec-same01', 'band-weston-98', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '47kg',
    77.5, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    true, 'SAME01', 'Amesbury & Puddy',
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w97-but-4.5', 'band-weston-97', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Butane', '4.5kg',
    24.73, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w97-but-7', 'band-weston-97', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Butane', '7kg',
    27.31, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w97-but-15', 'band-weston-97', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Butane', '15kg',
    42.99, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w97-pro-3.9', 'band-weston-97', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '3.9kg',
    21.04, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w97-pro-6', 'band-weston-97', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '6kg',
    24.28, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w97-pro-13', 'band-weston-97', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '13kg',
    36.9, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w97-pro-19', 'band-weston-97', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '19kg',
    45.76, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w97-pro-47', 'band-weston-97', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '47kg',
    83.77, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w97-auto-12', 'band-weston-97', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Automotive', '12kg',
    28.23, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w97-auto-18', 'band-weston-97', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Automotive', '18kg',
    40.6, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w97-patio-13', 'band-weston-97', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Patio', '13kg',
    39.86, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w97-patio-5', 'band-weston-97', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Patio', '5kg',
    17.71, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w90-but-4.5', 'band-weston-90', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Butane', '4.5kg',
    25.52, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w90-but-7', 'band-weston-90', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Butane', '7kg',
    28.19, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w90-but-15', 'band-weston-90', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Butane', '15kg',
    44.38, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w90-pro-3.9', 'band-weston-90', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '3.9kg',
    21.71, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w90-pro-6', 'band-weston-90', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '6kg',
    25.07, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w90-pro-13', 'band-weston-90', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '13kg',
    38.1, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w90-pro-19', 'band-weston-90', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '19kg',
    47.24, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w90-pro-47', 'band-weston-90', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '47kg',
    86.48, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w90-auto-12', 'band-weston-90', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Automotive', '12kg',
    29.14, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w90-auto-18', 'band-weston-90', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Automotive', '18kg',
    41.9, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w90-patio-13', 'band-weston-90', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Patio', '13kg',
    41.14, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w90-patio-5', 'band-weston-90', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Patio', '5kg',
    18.29, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w90-spec-sch01', 'band-weston-90', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '47kg',
    77.5, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    true, 'SCH01', 'Cheddar Bridge Touring',
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w90-spec-smag01', 'band-weston-90', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '47kg',
    79.5, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    true, 'SMAG01', 'Magor Fuels',
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w90-spec-sret02', 'band-weston-90', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '47kg',
    77.5, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    true, 'SRET02', 'Retreat Caravn Park',
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w89-but-4.5', 'band-weston-89', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Butane', '4.5kg',
    26.32, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w89-but-7', 'band-weston-89', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Butane', '7kg',
    29.07, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w89-but-15', 'band-weston-89', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Butane', '15kg',
    45.77, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w89-pro-3.9', 'band-weston-89', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '3.9kg',
    22.39, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w89-pro-6', 'band-weston-89', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '6kg',
    25.85, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w89-pro-13', 'band-weston-89', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '13kg',
    39.29, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w89-pro-19', 'band-weston-89', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '19kg',
    48.71, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w89-pro-47', 'band-weston-89', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '47kg',
    89.18, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w89-auto-12', 'band-weston-89', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Automotive', '12kg',
    30.05, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w89-auto-18', 'band-weston-89', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Automotive', '18kg',
    43.21, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w89-patio-13', 'band-weston-89', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Patio', '13kg',
    42.43, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w89-patio-5', 'band-weston-89', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Patio', '5kg',
    18.86, NULL, 'EXCLUDING_VAT', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-47-b20', 'band-weston-memo-20', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '47kg',
    108.1, 113.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-47-b31', 'band-weston-memo-31', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '47kg',
    92.86, 97.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-47-b10', 'band-weston-memo-10', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '47kg',
    108.1, 113.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-47-b12', 'band-weston-memo-12', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '47kg',
    97.62, 102.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-47-b15', 'band-weston-memo-15', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '47kg',
    95.71, 100.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-47-b36', 'band-weston-memo-36', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '47kg',
    86.19, 90.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-47-b11', 'band-weston-memo-11', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '47kg',
    86.19, 90.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-47-b21', 'band-weston-memo-21', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '47kg',
    86.19, 90.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-47-b34-39', 'band-weston-memo-34-39', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '47kg',
    88.1, 92.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-47-b19', 'band-weston-memo-19', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '47kg',
    81.43, 85.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-47-b39', 'band-weston-memo-39', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '47kg',
    76.67, 80.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    true, NULL, 'Western Grill (very special)',
    '2026-05-18T00:00:00Z', NULL, 'Western Grill (very special)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-47-b32', 'band-weston-memo-32', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '47kg',
    80.48, 84.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-47-b33', 'band-weston-memo-33', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '47kg',
    80.48, 84.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-47-b35-38', 'band-weston-memo-35-38', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '47kg',
    80.48, 84.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-19-b20', 'band-weston-memo-20', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '19kg',
    59.05, 62, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-19-b10', 'band-weston-memo-10', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '19kg',
    59.05, 62, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-19-b12', 'band-weston-memo-12', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '19kg',
    53.81, 56.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-19-b15', 'band-weston-memo-15', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '19kg',
    52.86, 55.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-19-b32-and-33', 'band-weston-memo-32-and-33', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '19kg',
    50.95, 53.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-19-b36', 'band-weston-memo-36', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '19kg',
    42.86, 45, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-19-b38', 'band-weston-memo-38', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '19kg',
    40, 42, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-19-b11', 'band-weston-memo-11', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '19kg',
    42.38, 44.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-19-b56', 'band-weston-memo-56', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '19kg',
    42.38, 44.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-19-b19', 'band-weston-memo-19', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '19kg',
    39.05, 41, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-19-b34-39', 'band-weston-memo-34-39', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '19kg',
    39.05, 41, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-18-b20', 'band-weston-memo-20', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Automotive', '18kg',
    52.38, 55, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-18-b10', 'band-weston-memo-10', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Automotive', '18kg',
    52.38, 55, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-18-b12', 'band-weston-memo-12', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Automotive', '18kg',
    49.05, 51.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-18-b19', 'band-weston-memo-19', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Automotive', '18kg',
    44.52, 46.75, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-18-b32-35', 'band-weston-memo-32-35', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Automotive', '18kg',
    39.05, 41, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-18-b34-56', 'band-weston-memo-34-56', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Automotive', '18kg',
    39.05, 41, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    true, NULL, 'Off Site Solutions',
    '2026-05-18T00:00:00Z', NULL, 'Off Site Solutions', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-13-b20', 'band-weston-memo-20', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '13kg',
    47.62, 50, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-13-b10', 'band-weston-memo-10', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '13kg',
    47.62, 50, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-13-b12', 'band-weston-memo-12', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '13kg',
    44.76, 47, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-13-b11', 'band-weston-memo-11', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '13kg',
    43.81, 46, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-13-b56', 'band-weston-memo-56', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '13kg',
    39.05, 41, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-13-b19-32-36-38', 'band-weston-memo-19-32-36-38', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Propane', '13kg',
    39.52, 41.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-12-b10', 'band-weston-memo-10', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Butane', '12kg',
    36.43, 38.25, 'SPLIT_DOCUMENTED', 0.05, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, NULL, true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'w-memo-12-b12', 'band-weston-memo-12', 'a1111111-1111-4111-a111-111111111104', 'Weston-Super-Mare', 'Butane', '12kg',
    33.57, 38.25, 'SPLIT_DOCUMENTED', NULL, 'GBP', NULL,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'WESTON_MEMORANDUM_ENTRY: Preserved exactly as printed in client document (Inc VAT £38.25, Exc VAT £33.57). Marked for client clarification due to mathematical discrepancy against standard 5% VAT rate (£33.57 * 1.05 = £35.25).', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b20', 'band-east-20', NULL, 'Eastington', 'Propane', '47kg',
    108.1, 113.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'RETAIL NORMAL (Excel Row 9)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b37', 'band-east-37', NULL, 'Eastington', 'Propane', '47kg',
    99.52, 104.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'RETAIL ASTUTE (Excel Row 10)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b10', 'band-east-10', NULL, 'Eastington', 'Propane', '47kg',
    108.1, 113.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'BUSINESS NORMAL (Excel Row 11)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b12', 'band-east-12', NULL, 'Eastington', 'Propane', '47kg',
    99.52, 104.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'BUSINESS DISCOUNTED (Excel Row 12)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b16', 'band-east-16', NULL, 'Eastington', 'Propane', '47kg',
    96.67, 101.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'BUSINESS LARGE DISCOUNT (Excel Row 13)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b15', 'band-east-15', NULL, 'Eastington', 'Propane', '47kg',
    95.71, 100.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'BUSINESS ASTUTE (Excel Row 14)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b14', 'band-east-14', NULL, 'Eastington', 'Propane', '47kg',
    91.9, 96.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'BUSINESS VERY ASTUTE (Excel Row 15)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b11', 'band-east-11', NULL, 'Eastington', 'Propane', '47kg',
    90, 94.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'CATERING, FIXED AND MOBILE (Excel Row 16)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b36', 'band-east-36', NULL, 'Eastington', 'Propane', '47kg',
    81.43, 85.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'TRAVELLERS WITHIN 10 MILES (Excel Row 17)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b30', 'band-east-30', NULL, 'Eastington', 'Propane', '47kg',
    81.43, 85.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'TRAVELLERS PLUS    10 MILES (Excel Row 18)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b30-11', 'band-east-30', NULL, 'Eastington', 'Propane', '47kg',
    81.43, 85.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    true, 'RTRA11', 'UNNAMED TRAVELLER (RTRA11)',
    '2026-05-18T00:00:00Z', NULL, 'UNNAMED TRAVELLER (RTRA11) (Excel Row 19)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b41', 'band-east-41', NULL, 'Eastington', 'Propane', '47kg',
    80.48, 84.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'VARIOUS MOBILE HOME SITES (Excel Row 20)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b13', 'band-east-13', NULL, 'Eastington', 'Propane', '47kg',
    92.86, 97.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'GRAIN DRYING  46 & 47KG (Excel Row 21)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b19', 'band-east-19', NULL, 'Eastington', 'Propane', '47kg',
    80.48, 84.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'BUSINESS CONVERSION FROM COMPETITOR (Excel Row 22)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b43', 'band-east-43', NULL, 'Eastington', 'Propane', '47kg',
    80.48, 84.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'GREENACRES & LAKE LOUISE (Excel Row 25)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b27', 'band-east-27', NULL, 'Eastington', 'Propane', '47kg',
    80.48, 84.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'ORCH PK,3 COUNTIES,STAVERTON (Excel Row 26)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b24', 'band-east-24', NULL, 'Eastington', 'Propane', '47kg',
    80.48, 84.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'BERKELEY VALE PARK  & POPULARS (Excel Row 27)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b28', 'band-east-28', NULL, 'Eastington', 'Propane', '47kg',
    80.48, 84.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'LONGFURLONG (Excel Row 28)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b44', 'band-east-44', NULL, 'Eastington', 'Propane', '47kg',
    80.48, 84.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'SHOWMANS SITES (Excel Row 29)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b29', 'band-east-29', NULL, 'Eastington', 'Propane', '47kg',
    80.48, 84.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'HAYDEN/ FAIR HAVEN/ OXBUTTS & BLUNSDEN (Excel Row 30)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b31', 'band-east-31', NULL, 'Eastington', 'Propane', '47kg',
    80.48, 84.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'QUEDGLEY COURT PARK & WOODLANDS (Excel Row 31)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b40', 'band-east-40', NULL, 'Eastington', 'Propane', '47kg',
    80.48, 84.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'WOODLANDS,COALWAY,WYELANDS (Excel Row 32)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b42', 'band-east-42', NULL, 'Eastington', 'Propane', '47kg',
    80.48, 84.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'BELINDA,ST JAMES, ST MICHAEL,WYESIDE (Excel Row 33)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b23', 'band-east-23', NULL, 'Eastington', 'Propane', '47kg',
    80.48, 84.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'VALLEY VIEW & COTS MANOR (Excel Row 34)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b32', 'band-east-32', NULL, 'Eastington', 'Propane', '47kg',
    80.48, 84.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'NORMAL (Excel Row 37)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b21', 'band-east-21', NULL, 'Eastington', 'Propane', '47kg',
    80.48, 84.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'ASTUTE CUSTOMER (Excel Row 38)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b26', 'band-east-26', NULL, 'Eastington', 'Propane', '47kg',
    82.38, 86.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 47.63,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'DIFFICULT DROPS VARIABLE (Excel Row 39)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b17-and-33', 'band-east-17-and-33', NULL, 'Eastington', 'Propane', '47kg',
    80.48, 84.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'DOMESTIC CONVERSION, NEW & SPECIAL PRICES (Excel Row 40)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b48', 'band-east-48', NULL, 'Eastington', 'Propane', '47kg',
    86.19, 90.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'PUB BAND 48 GL  POSTCODES NORMAL (Excel Row 43)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b49', 'band-east-49', NULL, 'Eastington', 'Propane', '47kg',
    84.29, 88.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'PUB BAND 49 GL  POSTCODES LARGE (Excel Row 44)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b52', 'band-east-52', NULL, 'Eastington', 'Propane', '47kg',
    88.1, 92.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'PUB BAND 52 NON GL POSTCODES NORMAL (Excel Row 45)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b56', 'band-east-56', NULL, 'Eastington', 'Propane', '47kg',
    83.33, 87.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'PUB BAND 56 WHOLESALER (Excel Row 46)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-47-b62', 'band-east-62', NULL, 'Eastington', 'Propane', '47kg',
    83.33, 87.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 64.59,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'PUB BAND 62 NON GL POSTCODES LARGE (Excel Row 47)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-19-b20', 'band-east-20', NULL, 'Eastington', 'Propane', '19kg',
    59.05, 62, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 29.66,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'RETAIL NORMAL (Excel Row 62)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-19-b10', 'band-east-10', NULL, 'Eastington', 'Propane', '19kg',
    59.05, 62, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 29.66,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'BUSINESS NORMAL (Excel Row 63)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-19-b12', 'band-east-12', NULL, 'Eastington', 'Propane', '19kg',
    55.24, 58, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 29.66,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'BUSINESS DISCOUNTED (Excel Row 64)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-19-b15-and-37', 'band-east-15-and-37', NULL, 'Eastington', 'Propane', '19kg',
    54.29, 57, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 29.66,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'BUSINESS  & RETAIL ASTUTE (Excel Row 65)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-19-b14', 'band-east-14', NULL, 'Eastington', 'Propane', '19kg',
    53.33, 56, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 29.66,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'BUSINESS VERY ASTUTE (Excel Row 66)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-19-b17-and-33', 'band-east-17-and-33', NULL, 'Eastington', 'Propane', '19kg',
    39.05, 41, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 29.66,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'BUSINESS CONVERSION,  NEW & SPECIAL PRICES (Excel Row 67)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-19-b11--19-and-32', 'band-east-11-and-19-and-32', NULL, 'Eastington', 'Propane', '19kg',
    39.05, 41, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 29.66,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'CATERING, FIXED AND MOBILE (Excel Row 68)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-19-b41', 'band-east-41', NULL, 'Eastington', 'Propane', '19kg',
    39.05, 41, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 29.66,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'VARIOUS MOBILE HOME SITES (Excel Row 69)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-19-b36', 'band-east-36', NULL, 'Eastington', 'Propane', '19kg',
    39.05, 41, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 29.66,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'TRAVELLERS WITHIN 10 MILES (Excel Row 70)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-19-b30', 'band-east-30', NULL, 'Eastington', 'Propane', '19kg',
    40, 42, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 29.66,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'TRAVELLERS PLUS    10 MILES (Excel Row 71)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-19-b44', 'band-east-44', NULL, 'Eastington', 'Propane', '19kg',
    39.05, 41, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 29.66,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'SHOWMANS SITES (Excel Row 72)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-19-b48', 'band-east-48', NULL, 'Eastington', 'Propane', '19kg',
    46.67, 49, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 29.66,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'PUB BAND 48 GL  POSTCODES NORMAL (Excel Row 73)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-19-b49', 'band-east-49', NULL, 'Eastington', 'Propane', '19kg',
    46.67, 49, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 29.66,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'PUB BAND 49 GL  POSTCODES LARGE (Excel Row 74)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-19-b52', 'band-east-52', NULL, 'Eastington', 'Propane', '19kg',
    49.52, 52, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 29.66,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'PUB BAND 52 NON GL POSTCODES NORMAL (Excel Row 75)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-19-b56', 'band-east-56', NULL, 'Eastington', 'Propane', '19kg',
    41.9, 44, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 29.66,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'PUB BAND 56 WHOLESALER (Excel Row 76)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-19-b62', 'band-east-62', NULL, 'Eastington', 'Propane', '19kg',
    39.52, 41.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 29.66,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'PUB BAND 62 NON GL POSTCODES LARGE (Excel Row 77)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-18-b20', 'band-east-20', NULL, 'Eastington', 'Automotive', '18kg',
    52.38, 55, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 29.23,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'RETAIL NORMAL (Excel Row 80)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-18-b10', 'band-east-10', NULL, 'Eastington', 'Automotive', '18kg',
    52.38, 55, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 29.23,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'BUSINESS NORMAL (Excel Row 81)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-18-b12', 'band-east-12', NULL, 'Eastington', 'Automotive', '18kg',
    49.52, 52, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 29.23,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'BUSINESS DISCOUNTED (Excel Row 82)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-18-b15-and-16', 'band-east-15-and-16', NULL, 'Eastington', 'Automotive', '18kg',
    49.52, 52, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 29.23,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'BUSINESS ASTUTE (Excel Row 83)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-18-b14-and-32', 'band-east-14-and-32', NULL, 'Eastington', 'Automotive', '18kg',
    48.1, 50.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 29.23,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'BUSINESS VERY ASTUTE (Excel Row 84)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-18-b17--19-and-33', 'band-east-17-and-19-and-33', NULL, 'Eastington', 'Automotive', '18kg',
    44.76, 47, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 29.23,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'BUSINESS CONVERSION, NEW & SPECIAL PRICES (Excel Row 85)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-13-b20', 'band-east-20', NULL, 'Eastington', 'Propane', '13kg',
    47.62, 50, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 30.41,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'RETAIL NORMAL (Excel Row 88)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-13-b10', 'band-east-10', NULL, 'Eastington', 'Propane', '13kg',
    47.62, 50, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 30.41,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'BUSINESS NORMAL (Excel Row 89)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-13-b12-and-37', 'band-east-12-and-37', NULL, 'Eastington', 'Propane', '13kg',
    44.76, 47, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 30.41,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'BUSINESS DISCOUNTED & FARRIERS (Excel Row 90)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-13-b14', 'band-east-14', NULL, 'Eastington', 'Propane', '13kg',
    43.81, 46, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 30.41,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'BUSINESS ASTUTE (Excel Row 91)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-13-b11-and-32', 'band-east-11-and-32', NULL, 'Eastington', 'Propane', '13kg',
    43.81, 46, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 30.41,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'CATERING, FIXED AND MOBILE (Excel Row 92)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-13-b17--19-and-33', 'band-east-17-and-19-and-33', NULL, 'Eastington', 'Propane', '13kg',
    38.57, 40.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 30.41,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'CONVERSION NEW & SPECIAL PRICES (Excel Row 93)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-13-b30--36--and-44', 'band-east-30-and-36,-and-44', NULL, 'Eastington', 'Propane', '13kg',
    38.57, 40.5, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 30.41,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'TRAVELLERS & ROOFERS (Excel Row 94)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-12-b20-and-10', 'band-east-20-and-10', NULL, 'Eastington', 'Butane', '12kg',
    36.43, 38.25, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 20.27,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'RETAIL NORMAL (Excel Row 97)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.branch_gas_prices (
    id, pricing_band_id, branch_id, location_name, gas_type, cylinder_size,
    price_exc_vat, price_inc_vat, vat_status, vat_rate, currency, cost_price,
    is_special_customer_price, special_customer_code, special_customer_name,
    effective_from, effective_to, notes, is_active
) VALUES (
    'east-12-b12--14---17-and-32', 'band-east-12-and-14--and-17-and-32', NULL, 'Eastington', 'Butane', '12kg',
    33.57, 35.25, 'SPLIT_DOCUMENTED', 0.05, 'GBP', 20.27,
    false, NULL, NULL,
    '2026-05-18T00:00:00Z', NULL, 'BUSINESS ASTUTE (Excel Row 98)', true
) ON CONFLICT (id) DO UPDATE SET
    pricing_band_id = EXCLUDED.pricing_band_id,
    branch_id = EXCLUDED.branch_id,
    location_name = EXCLUDED.location_name,
    gas_type = EXCLUDED.gas_type,
    cylinder_size = EXCLUDED.cylinder_size,
    price_exc_vat = EXCLUDED.price_exc_vat,
    price_inc_vat = EXCLUDED.price_inc_vat,
    vat_status = EXCLUDED.vat_status,
    vat_rate = EXCLUDED.vat_rate,
    cost_price = EXCLUDED.cost_price,
    is_special_customer_price = EXCLUDED.is_special_customer_price,
    special_customer_code = EXCLUDED.special_customer_code,
    special_customer_name = EXCLUDED.special_customer_name,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());

-- ------------------------------------------------------------------------------
-- 9. RECORD SCHEMA MIGRATION
-- ------------------------------------------------------------------------------
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('00098')
ON CONFLICT (version) DO NOTHING;

COMMIT;
