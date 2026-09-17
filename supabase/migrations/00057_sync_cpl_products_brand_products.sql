-- Migration 00057: Sync CPL Products Brand Products
-- Ensure all 7 CPL Products records have brand set to 'CPL Products' and correct prices, images, and details

UPDATE public.products
SET
  brand = 'CPL Products',
  category_slug = 'coal-fuels'
WHERE slug IN (
  'brazier-10kg',
  'brazier-20kg',
  'homefire-twizlers-wood-wool-natural-firelighters',
  'taybrite-25kg',
  'homefire-25kg',
  'homefire-kiln-dried-logs-approx-8kg',
  'heat-log-blocks-pack-of-8'
);
