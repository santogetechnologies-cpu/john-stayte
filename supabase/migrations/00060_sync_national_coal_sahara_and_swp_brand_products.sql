-- Migration 00060: Sync National Coal, Sahara, and SWP Brand Products
-- Ensure National Coal has exactly the 2 products (Kiln Dried Kindling £4.00, Stoveflame Original 25kg £18.25)
-- Ensure Sahara has exactly the 2 products (13kW Heat Focus Patio Heater Charcoal £199.99, 15kW Heat Focus Patio Heater White £319.99)
-- Ensure SWP has exactly the 1 product (Pub Gas Combination Spanner £5.95)

UPDATE public.products
SET
  brand = 'National Coal',
  name = 'Kiln Dried Kindling',
  price = 4.00,
  category_slug = 'coal-fuels',
  image_url = '/fuel-kiln-dried-kindling.png'
WHERE slug = 'kiln-dried-kindling' OR slug = 'net-of-kindling-5kg';

UPDATE public.products
SET
  brand = 'National Coal',
  name = 'Stoveflame Original 25kg',
  price = 18.25,
  category_slug = 'coal-fuels',
  image_url = '/fuel-stoveflame-25kg.png'
WHERE slug = 'stoveflame-25kg' OR slug = 'stoveflame-original-25kg';

UPDATE public.products
SET
  brand = 'Sahara',
  name = '13kW Heat Focus Patio Heater Charcoal',
  price = 199.99,
  category_slug = 'gas-appliances',
  image_url = '/patio-heater-13kw-charcoal.png'
WHERE slug = '13kw-heat-focus-patio-heater-charcoal' OR slug = 'patio-heater-13kw-charcoal';

UPDATE public.products
SET
  brand = 'Sahara',
  name = '15kW Heat Focus Patio Heater White',
  price = 319.99,
  category_slug = 'gas-appliances',
  image_url = '/patio-heater-15kw-white.png'
WHERE slug = '15kw-heat-focus-patio-heater-white' OR slug = 'patio-heater-15kw-white';

UPDATE public.products
SET
  brand = 'SWP',
  name = 'Pub Gas Combination Spanner',
  price = 5.95,
  category_slug = 'pub-gas',
  image_url = '/pub-gas-spanner.png'
WHERE slug = 'pub-gas-spanner' OR slug = 'pub-gas-combination-spanner';
