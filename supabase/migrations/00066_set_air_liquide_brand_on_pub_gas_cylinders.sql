-- Migration 00039: Set Air Liquide brand for the 7 dispense gas cylinders
UPDATE public.products
SET
  brand = 'Air Liquide',
  updated_at = now()
WHERE category_slug = 'pub-gas'
  AND slug IN (
    '6-35kg-carbon-dioxide',
    '10l-30-70-mixed-gas',
    '10l-50-50-mixed-gas',
    '10l-60-40-mixed-gas',
    '47l-30-70-mixed-gas',
    '22-6kg-carbon-dioxide',
    '34kg-carbon-dioxide'
  );
