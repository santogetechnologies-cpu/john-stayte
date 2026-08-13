-- ====================================================================
-- MIGRATION: 00014_categories_seed_and_columns.sql
-- Add UI fields (icon, display_order, is_active, image_url) & seed real categories
-- ====================================================================

-- 1. Ensure required columns exist on public.categories
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'icon'
  ) THEN 
    ALTER TABLE public.categories ADD COLUMN icon TEXT DEFAULT 'Flame';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'display_order'
  ) THEN 
    ALTER TABLE public.categories ADD COLUMN display_order INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'is_active'
  ) THEN 
    ALTER TABLE public.categories ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'image_url'
  ) THEN 
    ALTER TABLE public.categories ADD COLUMN image_url TEXT;
  END IF;
END $$;

-- 2. Seed the 10 real initial categories into public.categories
INSERT INTO public.categories (name, slug, description, icon, subcategories, display_order, is_active)
VALUES
  ('Gas', 'gas', 'Propane, Butane, Patio, Camping and Pub gas cylinders', 'Flame', ARRAY['Butane Cylinders', 'Propane Cylinders', 'Patio Cylinders', 'Camping Gas', 'Pub Gas'], 1, TRUE),
  ('Coal & Logs', 'coal-logs', 'Smokeless coal, hardwood logs, kindling and eco fuel', 'Logs', ARRAY['Coal', 'Smokeless Fuel', 'Logs', 'Kindling', 'Firewood', 'Eco Fuel'], 2, TRUE),
  ('Fishing Baits', 'fishing-baits', 'Groundbaits, carp pellets and fishing supplies', 'Fish', ARRAY['Groundbait', 'Pellets'], 3, TRUE),
  ('Animal Feed', 'animal-feed', 'Horse, chicken, dog and cat food', 'Dog', ARRAY['Horse Feed', 'Chicken Feed', 'Dog Food', 'Cat Food'], 4, TRUE),
  ('Gas Appliances', 'gas-appliances', 'Cookers, mobile heaters, blow heaters and barbecues', 'CookingPot', ARRAY['Cookers', 'Mobile Heaters', 'Blow Heaters', 'Patio Heaters', 'Barbecues'], 5, TRUE),
  ('Gas Spares', 'gas-spares', 'Regulators, gas hoses, clips and connectors', 'Wrench', ARRAY['Regulators', 'Hoses', 'Clips', 'Connectors'], 6, TRUE),
  ('Garden', 'garden', 'Compost, rock salt and garden supplies', 'Sprout', ARRAY['Garden'], 7, TRUE),
  ('Food', 'food', 'Local farm eggs and seasonal food bundles', 'Utensils', ARRAY['Food'], 8, TRUE),
  ('Trailers', 'trailers', 'Single axle and heavy duty trailers', 'Truck', ARRAY['Trailers'], 9, TRUE),
  ('Workwear', 'workwear', 'Work trousers and hi-vis waterproof jackets', 'Shirt', ARRAY['Workwear'], 10, TRUE)
ON CONFLICT (slug) DO UPDATE 
SET name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    subcategories = EXCLUDED.subcategories,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active;

-- 3. Ensure public SELECT policy exists for categories
DROP POLICY IF EXISTS "Public can view active categories" ON public.categories;
CREATE POLICY "Public can view active categories"
  ON public.categories FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Staff can manage categories" ON public.categories;
CREATE POLICY "Staff can manage categories"
  ON public.categories FOR ALL
  USING (public.is_admin_or_manager());
