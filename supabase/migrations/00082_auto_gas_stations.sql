-- =========================================================================
-- JOHN STAYTE SERVICES - AUTO GAS FILLING STATIONS BACKEND & DATABASE SETUP
-- Migration: 00082_auto_gas_stations.sql
-- =========================================================================

-- 1. Create auto_gas_stations table
CREATE TABLE IF NOT EXISTS public.auto_gas_stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_number TEXT NOT NULL DEFAULT 'LOCATION 01',
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    address TEXT NOT NULL,
    town TEXT,
    county TEXT,
    postcode TEXT NOT NULL,
    telephone TEXT NOT NULL,
    opening_hours TEXT DEFAULT 'Monday–Friday: 08:00–17:30 · Saturday: 08:30–12:30',
    service TEXT DEFAULT 'Auto Gas',
    badge TEXT DEFAULT 'Auto Gas Available',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    maps_url TEXT,
    image_url TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_auto_gas_stations_is_active ON public.auto_gas_stations(is_active);
CREATE INDEX IF NOT EXISTS idx_auto_gas_stations_display_order ON public.auto_gas_stations(display_order);
CREATE INDEX IF NOT EXISTS idx_auto_gas_stations_slug ON public.auto_gas_stations(slug);

-- 3. Row Level Security (RLS)
ALTER TABLE public.auto_gas_stations ENABLE ROW LEVEL SECURITY;

-- Policy 1: Public Read Policy (Visitors and Customers can view active stations)
DROP POLICY IF EXISTS "Public can view active auto gas stations" ON public.auto_gas_stations;
CREATE POLICY "Public can view active auto gas stations"
    ON public.auto_gas_stations FOR SELECT
    USING (is_active = true OR (auth.role() = 'authenticated' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('manager', 'admin')));

-- Policy 2: Admin & Manager Full Access Policy (Create, Update, Delete)
DROP POLICY IF EXISTS "Admin and manager full access auto gas stations" ON public.auto_gas_stations;
CREATE POLICY "Admin and manager full access auto gas stations"
    ON public.auto_gas_stations FOR ALL
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('manager', 'admin'))
    WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('manager', 'admin'));

-- 4. Seed the EXACT 4 Intended Auto Gas Filling Stations
INSERT INTO public.auto_gas_stations (
    id,
    station_number,
    name,
    slug,
    address,
    town,
    county,
    postcode,
    telephone,
    opening_hours,
    service,
    badge,
    latitude,
    longitude,
    maps_url,
    display_order,
    is_active
) VALUES
(
    'a1111111-1111-4111-a111-111111111101',
    'LOCATION 01',
    'John Stayte Services – Cirencester',
    'cirencester',
    '82 Chesterton Lane',
    'Cirencester',
    'Gloucestershire',
    'GL7 1YD',
    '01285 654614',
    'Monday–Friday: 08:00–17:30 · Saturday: 08:30–12:30',
    'Auto Gas',
    'Auto Gas Available',
    51.7061,
    -1.9702,
    'https://www.google.com/maps/search/?api=1&query=John+Stayte+Services+82+Chesterton+Lane+Cirencester+GL7+1YD',
    1,
    true
),
(
    'a1111111-1111-4111-a111-111111111102',
    'LOCATION 02',
    'John Stayte Services – Gloucester',
    'gloucester',
    '1A Kingsholm Road',
    'Gloucester',
    'Gloucestershire',
    'GL1 3AX',
    '01452 525692',
    'Monday–Friday: 08:00–17:30 · Saturday: 08:30–12:30',
    'Auto Gas',
    'Auto Gas Available',
    51.8719,
    -2.2435,
    'https://www.google.com/maps/search/?api=1&query=John+Stayte+Services+1A+Kingsholm+Road+Gloucester+GL1+3AX',
    2,
    true
),
(
    'a1111111-1111-4111-a111-111111111103',
    'LOCATION 03',
    'John Stayte Services – Stroud',
    'stroud',
    'Dr Newton’s Way, Fromeside',
    'Stroud',
    'Gloucestershire',
    'GL5 3JX',
    '01453 762541',
    'Monday–Friday: 08:00–17:30 · Saturday: 08:30–12:30',
    'Auto Gas',
    'Auto Gas Available',
    51.7456,
    -2.2215,
    'https://www.google.com/maps/search/?api=1&query=John+Stayte+Services+Dr+Newtons+Way+Fromeside+Stroud+GL5+3JX',
    3,
    true
),
(
    'a1111111-1111-4111-a111-111111111104',
    'LOCATION 04',
    'John Stayte Services – Weston Super Mare',
    'weston-super-mare',
    'Searle Crescent',
    'Weston-Super-Mare',
    'North Somerset',
    'BS23 3YX',
    '01934 621375',
    'Monday–Friday: 08:00–17:30 · Saturday: 08:30–12:30',
    'Auto Gas',
    'Auto Gas Available',
    51.3412,
    -2.9567,
    'https://www.google.com/maps/search/?api=1&query=John+Stayte+Services+Searle+Crescent+Weston-Super-Mare+BS23+3YX',
    4,
    true
)
ON CONFLICT (id) DO UPDATE SET
    station_number = EXCLUDED.station_number,
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    address = EXCLUDED.address,
    town = EXCLUDED.town,
    county = EXCLUDED.county,
    postcode = EXCLUDED.postcode,
    telephone = EXCLUDED.telephone,
    opening_hours = EXCLUDED.opening_hours,
    service = EXCLUDED.service,
    badge = EXCLUDED.badge,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    maps_url = EXCLUDED.maps_url,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = now();
