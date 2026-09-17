-- Migration 00042: Campingaz Category and Products Setup
-- Creates/Updates the "Campingaz" category without subcategories (direct 4-product display)
-- and inserts/updates the 4 real products in public.products

-- 1. Insert / Update Campingaz category
INSERT INTO public.categories (
  name,
  slug,
  icon,
  description,
  subcategories,
  display_order,
  is_active
) VALUES (
  'Campingaz',
  'campingaz',
  'Tent',
  'Lightweight, portable butane gas bottles and camping equipment exchangeable across Europe.',
  ARRAY[]::text[],
  6,
  true
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  subcategories = EXCLUDED.subcategories,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

-- 2. Insert or update the 4 Campingaz products
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
    '904 Refill',
    '904-refill',
    'Campingaz',
    'campingaz',
    'Refill',
    'Campingaz 904 refillable butane gas cylinder (1.81kg) – compact and widely available across the UK and Europe for camping stoves and small barbecues.',
    39.95,
    50,
    5.0,
    14,
    '/campingaz-904-refill.png',
    false,
    false,
    '{"weight": "1.81kg", "gas_type": "Butane", "brand": "Campingaz", "product_mode": "Refill Exchange"}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    '907 Refill',
    '907-refill',
    'Campingaz',
    'campingaz',
    'Refill',
    'Campingaz 907 refillable butane gas cylinder (2.72kg) – popular high-capacity cylinder for camping, campervans, and portable gas appliances.',
    44.25,
    50,
    5.0,
    22,
    '/campingaz-907-refill.png',
    false,
    false,
    '{"weight": "2.72kg", "gas_type": "Butane", "brand": "Campingaz", "product_mode": "Refill Exchange"}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    'Camping Gaz Party Grill 400',
    'camping-gaz-party-grill-400',
    'Campingaz',
    'campingaz',
    'Grill',
    'Camping Gaz Party Grill 400 – essential camping companion offering stove, grill, griddle, and plancha cooking options with piezo ignition.',
    79.95,
    25,
    5.0,
    18,
    '/campingaz-party-grill-400.png',
    false,
    false,
    '{"power": "2000W", "type": "Multi-cooker Stove / Grill", "brand": "Campingaz"}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    'CP250 4 Pack',
    'cp250-4-pack',
    'Campingaz',
    'campingaz',
    'Gas Cartridges',
    'Campingaz CP250 4 Pack – high-performance isobutane gas cartridges designed for Bistro stoves and Camp''Bistro portable cookers.',
    8.15,
    100,
    5.0,
    31,
    '/campingaz-cp250-4pack.png',
    false,
    false,
    '{"quantity": "4 x 220g", "type": "Isobutane Gas Cartridges", "brand": "Campingaz"}'::jsonb,
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
