-- ====================================================================
-- MIGRATION: 00015_avatars_storage_bucket.sql
-- Create avatars Supabase Storage bucket & Security RLS Policies
-- ====================================================================

-- 1. Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  TRUE,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE 
SET public = TRUE;

-- 2. Add avatar_url column to profiles table if not exists
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 3. Storage RLS Policies for avatars bucket
DROP POLICY IF EXISTS "Public can view avatar images" ON storage.objects;
CREATE POLICY "Public can view avatar images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated users can upload own avatar image" ON storage.objects;
CREATE POLICY "Authenticated users can upload own avatar image"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update own avatar image" ON storage.objects;
CREATE POLICY "Authenticated users can update own avatar image"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete own avatar image" ON storage.objects;
CREATE POLICY "Authenticated users can delete own avatar image"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
