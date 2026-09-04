-- MIGRATION: 00026_stations_coordinates_and_images.sql
-- Ensure stations table has image_url, images, latitude, longitude, and maps_url

ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS maps_url TEXT;
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS fuel_types TEXT[] DEFAULT '{}';
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;

-- Ensure anyone can view stations
DROP POLICY IF EXISTS "Anyone can view stations" ON public.stations;
CREATE POLICY "Anyone can view stations" ON public.stations FOR SELECT USING (true);
