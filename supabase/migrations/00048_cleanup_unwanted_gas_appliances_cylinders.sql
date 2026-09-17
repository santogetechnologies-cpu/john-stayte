-- Migration 00048: Cleanup Unwanted Cylinder Products from Gas Appliances
-- Removes/deactivates any Campingaz 907 Refillable Cylinder products erroneously associated with Gas Appliances subcategories (Barbecues, Mobile Heaters, Patio Heaters, Camping)

DELETE FROM public.products
WHERE category_slug = 'gas-appliances'
  AND (
    slug ILIKE '%907%'
    OR name ILIKE '%907%cylinder%'
    OR name ILIKE '%refillable cylinder%'
  );

-- Ensure any 907 cylinders in public.products do NOT have subcategories matching Gas Appliances
UPDATE public.products
SET subcategory = 'Refill',
    category_slug = 'campingaz'
WHERE (slug ILIKE '%907%' OR name ILIKE '%907%')
  AND (
    subcategory IN ('Barbecues', 'Mobile Heaters', 'Patio Heaters', 'Camping')
    OR category_slug = 'gas-appliances'
  );
