-- Migration: 00081_add_boc_gases_category.sql
-- Description: Register BOC Gases brand and category record in categories table
-- Note: Strict 0 fake products created. Ready to receive real BOC products when provided.

INSERT INTO public.categories (
  name,
  slug,
  description,
  subcategories,
  icon,
  display_order,
  is_active
)
VALUES (
  'BOC Gases',
  'boc-gases',
  'Industrial, medical and specialty gases from BOC, A Linde company.',
  ARRAY['All BOC Gases'],
  'Flame',
  41,
  true
)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subcategories = EXCLUDED.subcategories,
  icon = EXCLUDED.icon,
  is_active = true;
