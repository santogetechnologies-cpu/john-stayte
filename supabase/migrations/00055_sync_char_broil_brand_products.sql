-- Migration 00055: Sync Char-Broil Brand Products
-- Ensure all 10 Char-Broil products have brand set to 'Char-Broil' and correct prices, images, and details

UPDATE public.products
SET
  brand = 'Char-Broil',
  category_slug = 'gas-appliances',
  subcategory = 'Barbecues'
WHERE slug IN (
  'ultimate-entertainment',
  'ultimate-3200',
  'ultimate-bbq-package',
  'ultimate-corner-module',
  'performance-pro-s-3',
  'professional-core-b-3',
  'professional-core-b-4',
  'professional-pro-s-2',
  'professional-pro-s-3',
  'smart-e'
);
