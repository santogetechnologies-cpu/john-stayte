-- Migration 00059: Sync Kingfisher and Lifestyle Appliances Brand Products
-- Ensure Kingfisher has exactly the 2 products (Oil Drum Charcoal BBQ £72.00, Small Instant Barbecue £3.00)
-- Ensure Lifestyle Appliances has exactly the 3 products (Lifestyle Catalytic £142.95, Lifestyle Mini Black £99.95, Lifestyle Mini Red £99.95)

UPDATE public.products
SET
  brand = 'Kingfisher',
  price = 72.00,
  category_slug = 'gas-appliances'
WHERE slug = 'oil-drum-charcoal-bbq';

UPDATE public.products
SET
  brand = 'Kingfisher',
  price = 3.00,
  category_slug = 'gas-appliances'
WHERE slug = 'small-instant-barbecue';

UPDATE public.products
SET
  brand = 'Lifestyle Appliances',
  price = 142.95,
  category_slug = 'gas-appliances'
WHERE slug = 'lifestyle-catalytic';

UPDATE public.products
SET
  brand = 'Lifestyle Appliances',
  price = 99.95,
  category_slug = 'gas-appliances'
WHERE slug = 'lifestyle-mini-black';

UPDATE public.products
SET
  brand = 'Lifestyle Appliances',
  price = 99.95,
  category_slug = 'gas-appliances'
WHERE slug = 'lifestyle-mini-red';
