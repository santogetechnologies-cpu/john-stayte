-- Migration 00058: Sync Homefire Brand Products
-- Ensure exactly the 2 requested Homefire products (Coffee Bricks 7kg and Lumpwood Charcoal 4kg) are active and configured with brand 'Homefire'

UPDATE public.products
SET
  brand = 'Homefire',
  price = 7.75,
  category_slug = 'coal-fuels'
WHERE slug = 'coffee-bricks-7kg';

UPDATE public.products
SET
  brand = 'Homefire',
  price = 5.60,
  category_slug = 'coal-fuels'
WHERE slug = 'lumpwood-charcoal-4kg';
