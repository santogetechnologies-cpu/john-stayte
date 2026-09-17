-- Migration 00040: Dynamite Fishing Baits Category and Products Setup
-- Creates/Updates the "Dynamite Fishing Baits" category with subcategories (Groundbait, Pellets) and inserts/updates the real products in public.products

-- 1. Insert / Update Dynamite Fishing Baits category
INSERT INTO public.categories (
  name,
  slug,
  icon,
  description,
  subcategories,
  display_order,
  is_active
) VALUES (
  'Dynamite Fishing Baits',
  'dynamite-baits',
  'Fish',
  'Premium carp, coarse and predator fishing baits, groundbait, and pellets.',
  ARRAY[
    'Groundbait',
    'Pellets'
  ],
  4,
  true
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  subcategories = EXCLUDED.subcategories,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

-- Also ensure legacy fishing-baits category slug is synchronized
INSERT INTO public.categories (
  name,
  slug,
  icon,
  description,
  subcategories,
  display_order,
  is_active
) VALUES (
  'Dynamite Fishing Baits',
  'fishing-baits',
  'Fish',
  'Premium carp, coarse and predator fishing baits, groundbait, and pellets.',
  ARRAY[
    'Groundbait',
    'Pellets'
  ],
  4,
  true
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  subcategories = EXCLUDED.subcategories,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

-- 2. Insert or update the Groundbait products
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
) VALUES
  (
    'Marine Halibut Groundbait 1kg',
    'marine-halibut-groundbait-1kg',
    'Dynamite Baits',
    'dynamite-baits',
    'Groundbait',
    'High energy marine halibut groundbait (1kg) – specially formulated with marine halibut attractants for coarse and match angling.',
    5.00,
    50,
    5.0,
    8,
    '/bait-marine-halibut-groundbait-1kg.png',
    false,
    false,
    '{"weight": "1kg", "type": "Groundbait", "brand": "Dynamite Baits"}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    'Marine Halibut Method Mix - 2kg',
    'marine-halibut-method-mix-2kg',
    'Dynamite Baits',
    'dynamite-baits',
    'Groundbait',
    'High energy marine halibut method mix (2kg) – big carp range with proven attraction and binding properties for method feeders.',
    7.30,
    50,
    5.0,
    14,
    '/bait-marine-halibut-method-mix-2kg.png',
    false,
    false,
    '{"weight": "2kg", "type": "Method Mix", "brand": "Dynamite Baits"}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    'Swim Stim Carp Groundbait - Amino Black - 900g',
    'swim-stim-carp-groundbait-amino-black-900g',
    'Dynamite Baits',
    'dynamite-baits',
    'Groundbait',
    'Swim Stim carp groundbait amino black (900g) – advanced koi technology groundbait with amino acids and dark finish for wary fish.',
    4.25,
    50,
    5.0,
    9,
    '/bait-swim-stim-carp-groundbait-amino-black-900g.png',
    false,
    false,
    '{"weight": "900g", "type": "Groundbait", "brand": "Dynamite Baits"}'::jsonb,
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
  rating = EXCLUDED.rating,
  reviews_count = EXCLUDED.reviews_count,
  image_url = EXCLUDED.image_url,
  is_featured = EXCLUDED.is_featured,
  is_offer = EXCLUDED.is_offer,
  specs = EXCLUDED.specs,
  updated_at = NOW();
