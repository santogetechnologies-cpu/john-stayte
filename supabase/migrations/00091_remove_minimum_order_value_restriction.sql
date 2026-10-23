-- ==============================================================================
-- Migration: 00091_remove_minimum_order_value_restriction.sql
-- Description: Completely removes the £15 minimum order value restriction and sets
-- default minOrderValue to 0 in admin_system_settings to allow orders of any positive amount.
-- ==============================================================================

UPDATE public.cms_content_blocks
SET content = jsonb_set(content::jsonb, '{minOrderValue}', '0'::jsonb)::text,
    updated_at = now()
WHERE section_key = 'admin_system_settings';
