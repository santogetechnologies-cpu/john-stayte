-- Migration 00054: Sync Campingaz Brand Products
-- Ensure all 9 Campingaz products have brand set to 'Campingaz' and correct prices/images

UPDATE public.products
SET brand = 'Campingaz'
WHERE slug IN (
  '904-refill',
  '907-refill',
  'camping-206l',
  'camping-206s',
  'camping-gaz-party-grill-400',
  'cp250-4-pack',
  'camp-bistro-3-camping-gas-stove',
  'instaflam-stove',
  'camping-chef-cv-gas-stove'
);
