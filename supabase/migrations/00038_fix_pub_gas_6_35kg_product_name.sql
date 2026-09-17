-- Migration 00038: Fix Pub Gas Product Name to 6.35kg Carbon Dioxide
UPDATE public.products
SET
  name = '6.35kg Carbon Dioxide',
  slug = '6-35kg-carbon-dioxide',
  description = '6.35kg food-grade Carbon Dioxide (CO2) cylinder for draught beer, cider and soft drinks dispense. Restricted to pub and licensed hospitality customers.',
  specs = jsonb_set(
    jsonb_set(specs, '{cylinder_size}', '"6.35kg"'),
    '{refill_price}', '28.80'
  ),
  updated_at = now()
WHERE category_slug = 'pub-gas'
  AND (name ILIKE '%0.35kg%' OR slug = '0-35kg-carbon-dioxide');
