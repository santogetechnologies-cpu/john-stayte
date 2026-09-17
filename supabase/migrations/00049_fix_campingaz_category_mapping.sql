-- Migration 00049: Fix Campingaz Category Mapping in Products
-- Ensures Campingaz products have category_slug = 'campingaz' and subcategory = 'Refill'
-- and do not appear under generic 'gas' or other categories.

UPDATE public.products
SET category_slug = 'campingaz',
    subcategory = 'Refill'
WHERE slug = 'campingaz-907-cylinder'
   OR (brand = 'Campingaz' AND category_slug = 'gas');
