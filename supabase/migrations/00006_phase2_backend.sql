-- ====================================================================
-- MIGRATION: 00006_phase2_backend.sql
-- Complete Backend Schema for CMS, Offers, Coupons & Wishlist Persistence
-- ====================================================================

-- 1. CMS BANNERS
CREATE TABLE IF NOT EXISTS public.cms_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT DEFAULT '/products',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CMS BLOG POSTS
CREATE TABLE IF NOT EXISTS public.cms_blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  image_url TEXT,
  author_name TEXT DEFAULT 'John Stayte Team',
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CMS CONTENT BLOCKS
CREATE TABLE IF NOT EXISTS public.cms_content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. OFFERS
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  discount_percentage NUMERIC(5,2) DEFAULT 0,
  banner_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. COUPONS
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL,
  min_order_amount NUMERIC(10,2) DEFAULT 0,
  max_uses INTEGER DEFAULT 100,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ENABLE RLS ON NEW TABLES
ALTER TABLE public.cms_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_content_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES FOR CMS, OFFERS, COUPONS

-- Public Read Policies
DROP POLICY IF EXISTS "Public can view active banners" ON public.cms_banners;
CREATE POLICY "Public can view active banners" ON public.cms_banners FOR SELECT USING (is_active = TRUE OR public.is_admin_or_manager());

DROP POLICY IF EXISTS "Public can view published blog posts" ON public.cms_blog_posts;
CREATE POLICY "Public can view published blog posts" ON public.cms_blog_posts FOR SELECT USING (is_published = TRUE OR public.is_admin_or_manager());

DROP POLICY IF EXISTS "Public can view content blocks" ON public.cms_content_blocks;
CREATE POLICY "Public can view content blocks" ON public.cms_content_blocks FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Public can view active offers" ON public.offers;
CREATE POLICY "Public can view active offers" ON public.offers FOR SELECT USING (is_active = TRUE OR public.is_admin_or_manager());

DROP POLICY IF EXISTS "Public can view active coupons" ON public.coupons;
CREATE POLICY "Public can view active coupons" ON public.coupons FOR SELECT USING (is_active = TRUE OR public.is_admin_or_manager());

-- Staff Write Policies
DROP POLICY IF EXISTS "Staff can manage cms_banners" ON public.cms_banners;
CREATE POLICY "Staff can manage cms_banners" ON public.cms_banners FOR ALL USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "Staff can manage cms_blog_posts" ON public.cms_blog_posts;
CREATE POLICY "Staff can manage cms_blog_posts" ON public.cms_blog_posts FOR ALL USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "Staff can manage cms_content_blocks" ON public.cms_content_blocks;
CREATE POLICY "Staff can manage cms_content_blocks" ON public.cms_content_blocks FOR ALL USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "Staff can manage offers" ON public.offers;
CREATE POLICY "Staff can manage offers" ON public.offers FOR ALL USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "Staff can manage coupons" ON public.coupons;
CREATE POLICY "Staff can manage coupons" ON public.coupons FOR ALL USING (public.is_admin_or_manager());
