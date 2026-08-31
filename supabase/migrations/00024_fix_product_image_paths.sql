-- ====================================================================
-- MIGRATION: 00024_fix_product_image_paths.sql
-- Fix image_url paths in public.products to remove Vite dev /src/assets/ prefix
-- ====================================================================

UPDATE public.products
SET image_url = REPLACE(image_url, '/src/assets/', '/')
WHERE image_url LIKE '%/src/assets/%';

UPDATE public.products
SET image_url = REPLACE(image_url, 'src/assets/', '/')
WHERE image_url LIKE 'src/assets/%';
