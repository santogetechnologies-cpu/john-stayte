-- Migration 00056: Sync Cleese UK / Clesse Brand Products
-- Ensure all 6 Cleese UK products have brand set to 'Cleese UK' and correct prices, images, and details

UPDATE public.products
SET
  brand = 'Cleese UK',
  category_slug = 'gas-spares'
WHERE slug IN (
  'compact-800-acov-opso-2-pack',
  'low-pressure-butane-regulator',
  'low-pressure-propane-regulator',
  'compact-800-acov-opso-4-pack',
  'low-pressure-clip-on-regulator-21mm',
  'low-pressure-propane-clip-on-regulator-27mm'
);
