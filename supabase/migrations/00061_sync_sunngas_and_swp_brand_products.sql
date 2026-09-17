-- Migration 00061: Sync SunnGas and SWP Brand Products
-- SunnGas: exactly 1 product (Compact Double Burner Stove £20.00)
-- SWP: 0 products (empty state)

-- Ensure SunnGas product exists in products table
INSERT INTO public.products (
  id,
  name,
  slug,
  brand,
  price,
  stock,
  image_url,
  category_slug,
  subcategory,
  is_active,
  description,
  specs
)
VALUES (
  'camping-compact-double-burner-stove',
  'Compact Double Burner Stove',
  'compact-double-burner-stove',
  'SunnGas',
  20.00,
  1,
  '/camping-compact-double-burner.png',
  'gas-appliances',
  'Camping',
  true,
  'Compact Double Burner Stove, compact size and high performance. Quality construction that works from butane or propane.',
  '{"model": "CCKE210", "manufacturer": "SunnGas", "fuel_type": "Butane or Propane", "brand": "SunnGas", "is_active": true}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  brand = 'SunnGas',
  price = 20.00,
  stock = 1,
  image_url = '/camping-compact-double-burner.png',
  category_slug = 'gas-appliances',
  subcategory = 'Camping',
  is_active = true,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs;
