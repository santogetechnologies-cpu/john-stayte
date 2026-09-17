-- Migration: 00076_complete_cms_content_blocks.sql
-- Comprehensive CMS Content Blocks and Storage configuration

-- 1. Ensure cms_content_blocks table exists and has proper RLS
CREATE TABLE IF NOT EXISTS public.cms_content_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_key TEXT NOT NULL UNIQUE,
    title TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cms_content_blocks ENABLE ROW LEVEL SECURITY;

-- Drop previous policies to prevent duplicates
DROP POLICY IF EXISTS "Public can view cms content blocks" ON public.cms_content_blocks;
DROP POLICY IF EXISTS "Admins can manage cms content blocks" ON public.cms_content_blocks;
DROP POLICY IF EXISTS "Managers can view cms content blocks" ON public.cms_content_blocks;

-- Public can view all CMS blocks
CREATE POLICY "Public can view cms content blocks"
    ON public.cms_content_blocks FOR SELECT
    TO public
    USING (true);

-- Admins and authorized managers can manage CMS blocks
CREATE POLICY "Admins can manage cms content blocks"
    ON public.cms_content_blocks FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- 2. Storage Bucket for CMS Media
INSERT INTO storage.buckets (id, name, public)
VALUES ('cms_media', 'cms_media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for cms_media bucket
DROP POLICY IF EXISTS "Public read access on cms_media" ON storage.objects;
DROP POLICY IF EXISTS "Admin write access on cms_media" ON storage.objects;

CREATE POLICY "Public read access on cms_media"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'cms_media');

CREATE POLICY "Admin write access on cms_media"
    ON storage.objects FOR ALL
    TO authenticated
    USING (
        bucket_id = 'cms_media' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    )
    WITH CHECK (
        bucket_id = 'cms_media' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );
