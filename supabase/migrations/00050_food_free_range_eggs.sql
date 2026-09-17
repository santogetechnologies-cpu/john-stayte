-- Migration 00050: Food Category & Free Range Eggs Placement
-- Correctly maps Free Range Eggs to Food -> Local Forecourt Produce

-- 1. Ensure Food category subcategories are properly configured
UPDATE public.categories
SET subcategories = ARRAY['Local Forecourt Produce', 'Wild Bird Seed & Treats']::text[]
WHERE slug = 'food';

-- 2. Insert or update Free Range Eggs under Food -> Local Forecourt Produce
INSERT INTO public.products (
  name,
  slug,
  brand,
  category_slug,
  subcategory,
  description,
  price,
  stock,
  rating,
  reviews_count,
  image_url,
  is_featured,
  is_offer,
  specs,
  created_at,
  updated_at
) VALUES (
  'Free Range Eggs',
  'free-range-eggs',
  'Local Produce',
  'food',
  'Local Forecourt Produce',
  'Free range eggs - half a dozen.',
  1.95,
  10,
  5.0,
  8,
  '/food-free-range-eggs.png',
  true,
  false,
  '{"quantity": "Half a dozen (6 eggs)", "type": "Free Range Eggs", "origin": "Local Gloucestershire Farm"}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_slug = EXCLUDED.category_slug,
  subcategory = EXCLUDED.subcategory,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  image_url = EXCLUDED.image_url,
  specs = EXCLUDED.specs,
  updated_at = NOW();
