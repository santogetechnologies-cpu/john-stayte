-- Migration 00053: Sync Bonningtons Brand Products
-- Update the 6 Bonningtons products in public.products

UPDATE public.products
SET brand = 'Bonningtons'
WHERE slug IN (
  'free-standing-patio-heater',
  'outdoor-bbq-fire-pit-heater',
  'outdoor-gas-patio-heater',
  'outdoor-table-top-patio-heater',
  'smoker-bbq'
);

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
  'OUTDOOR BBQ FIRE PIT HEATER',
  'patio-heater-outdoor-fire-pit',
  'Bonningtons',
  'gas-appliances',
  'Patio Heaters',
  'OUTDOOR BBQ FIRE PIT HEATER – dual-purpose circular garden fire pit and barbecue with spark mesh guard, chrome cooking grill, and heat-resistant finish.',
  69.65,
  25,
  5.0,
  27,
  '/patio-heater-outdoor-fire-pit.png',
  false,
  false,
  '{"brand": "Bonningtons", "type": "Fire Pit & BBQ", "fuel": "Wood / Charcoal"}'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category_slug = EXCLUDED.category_slug,
  subcategory = EXCLUDED.subcategory,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  image_url = EXCLUDED.image_url,
  specs = EXCLUDED.specs,
  updated_at = NOW();
