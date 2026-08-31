-- =========================================================================
-- 00021_complete_backend_schema.sql
-- Comprehensive database schema expansion for John Stayte Services
-- =========================================================================

-- 1. Services Table
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT DEFAULT 'Truck',
    image_url TEXT,
    specs JSONB DEFAULT '{}'::jsonb,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Filling Stations Table
CREATE TABLE IF NOT EXISTS public.stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    address TEXT NOT NULL,
    postcode TEXT,
    phone TEXT,
    hours TEXT,
    maps_url TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    fuel_types TEXT[] DEFAULT '{}',
    services TEXT[] DEFAULT '{}',
    image_url TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Offers Table
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    badge TEXT,
    description TEXT NOT NULL,
    image_url TEXT,
    price NUMERIC(10,2),
    compare_at NUMERIC(10,2),
    discount_percent INT,
    valid_until TIMESTAMPTZ,
    cta_link TEXT DEFAULT '/products',
    cta_text TEXT DEFAULT 'Shop Now',
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Coupons Table
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(10,2) NOT NULL,
    min_order_amount NUMERIC(10,2) DEFAULT 0,
    max_discount NUMERIC(10,2),
    expires_at TIMESTAMPTZ,
    usage_limit INT,
    times_used INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. CMS Content Blocks (Modular page content: FAQs, Home sections, About data)
CREATE TABLE IF NOT EXISTS public.cms_content_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_key TEXT UNIQUE NOT NULL,
    title TEXT,
    content TEXT NOT NULL, -- JSON string or rich text
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. CMS Banners
CREATE TABLE IF NOT EXISTS public.cms_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link_url TEXT,
    link_text TEXT,
    banner_type TEXT DEFAULT 'announcement', -- 'announcement', 'promo', 'alert'
    is_active BOOLEAN DEFAULT true,
    starts_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Blog Posts Table
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Safety',
    tag TEXT NOT NULL DEFAULT 'Safety Guide',
    read_time TEXT DEFAULT '5 min read',
    featured_image TEXT,
    author_name TEXT DEFAULT 'John Stayte Services',
    author_role TEXT DEFAULT 'Gas & Fuel Specialists',
    views_count INT DEFAULT 0,
    display_order INT DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    published_at TIMESTAMPTZ DEFAULT now(),
    seo_title TEXT,
    seo_description TEXT,
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Enquiries & Contact Submissions Table
CREATE TABLE IF NOT EXISTS public.enquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT UNIQUE,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT DEFAULT 'General', -- 'Delivery Issue', 'Cylinder Exchange', 'Account / Invoice', 'General'
    priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Waiting for Customer', 'Resolved')),
    assigned_to TEXT,
    admin_notes TEXT,
    order_id TEXT,
    messages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Newsletter Subscribers Table
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    source TEXT DEFAULT 'footer', -- 'footer', 'blog', 'safety_guide', 'checkout'
    status TEXT DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed')),
    subscribed_at TIMESTAMPTZ DEFAULT now(),
    unsubscribed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Invoices & Invoice Items Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    order_ref TEXT,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    billing_address TEXT,
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
    vat NUMERIC(10,2) NOT NULL DEFAULT 0,
    shipping NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount NUMERIC(10,2) NOT NULL DEFAULT 0,
    total NUMERIC(10,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Paid' CHECK (status IN ('Paid', 'Pending', 'Overdue', 'Cancelled')),
    issue_date TIMESTAMPTZ DEFAULT now(),
    due_date TIMESTAMPTZ DEFAULT now() + INTERVAL '30 days',
    paid_at TIMESTAMPTZ DEFAULT now(),
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Product Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    review TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    verified_purchase BOOLEAN DEFAULT false,
    admin_response TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Testimonials Table
CREATE TABLE IF NOT EXISTS public.testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    quote TEXT NOT NULL,
    rating INT DEFAULT 5,
    avatar_url TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Team Members Table
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT,
    bio TEXT,
    image_url TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. Delivery Assignments Table
CREATE TABLE IF NOT EXISTS public.delivery_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    order_ref TEXT,
    customer_name TEXT NOT NULL,
    address TEXT NOT NULL,
    area TEXT NOT NULL,
    time_slot TEXT DEFAULT 'Morning (08:00 - 12:00)',
    driver_name TEXT NOT NULL,
    vehicle_plate TEXT DEFAULT 'GL72 JSS',
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Out for Delivery', 'Delivered', 'Delayed')),
    delay_reason TEXT,
    notes TEXT,
    dispatched_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 15. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_email TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure necessary columns exist on pre-existing tables before RLS
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS maps_url TEXT;
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS fuel_types TEXT[] DEFAULT '{}';
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS services TEXT[] DEFAULT '{}';
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.cms_banners ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;

ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved';

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(10,2);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

ALTER TABLE public.delivery_assignments ADD COLUMN IF NOT EXISTS order_ref TEXT;
ALTER TABLE public.delivery_assignments ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.delivery_assignments ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.delivery_assignments ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE public.delivery_assignments ADD COLUMN IF NOT EXISTS vehicle_plate TEXT;
ALTER TABLE public.delivery_assignments ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ;
ALTER TABLE public.delivery_assignments ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.delivery_assignments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_email TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_id TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Enable RLS on all tables
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_content_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Public Read Policies
DROP POLICY IF EXISTS "Public read services" ON public.services;
CREATE POLICY "Public read services" ON public.services FOR SELECT USING (is_active = true OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read stations" ON public.stations;
CREATE POLICY "Public read stations" ON public.stations FOR SELECT USING (is_active = true OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read offers" ON public.offers;
CREATE POLICY "Public read offers" ON public.offers FOR SELECT USING (is_active = true OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read coupons" ON public.coupons;
CREATE POLICY "Public read coupons" ON public.coupons FOR SELECT USING (is_active = true OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read cms_content_blocks" ON public.cms_content_blocks;
CREATE POLICY "Public read cms_content_blocks" ON public.cms_content_blocks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read cms_banners" ON public.cms_banners;
CREATE POLICY "Public read cms_banners" ON public.cms_banners FOR SELECT USING (is_active = true OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read blog_posts" ON public.blog_posts;
CREATE POLICY "Public read blog_posts" ON public.blog_posts FOR SELECT USING (is_published = true OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read reviews" ON public.reviews;
CREATE POLICY "Public read reviews" ON public.reviews FOR SELECT USING (status = 'approved' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read testimonials" ON public.testimonials;
CREATE POLICY "Public read testimonials" ON public.testimonials FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read team_members" ON public.team_members;
CREATE POLICY "Public read team_members" ON public.team_members FOR SELECT USING (is_active = true);

-- Public Insert Policies (Forms)
DROP POLICY IF EXISTS "Public insert enquiries" ON public.enquiries;
CREATE POLICY "Public insert enquiries" ON public.enquiries FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public insert newsletter_subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Public insert newsletter_subscribers" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public insert reviews" ON public.reviews;
CREATE POLICY "Public insert reviews" ON public.reviews FOR INSERT WITH CHECK (true);

-- Authenticated Users / Customer Policies
DROP POLICY IF EXISTS "Users read own invoices" ON public.invoices;
CREATE POLICY "Users read own invoices" ON public.invoices FOR SELECT USING (
    customer_id = auth.uid() OR
    customer_email = auth.jwt()->>'email' OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('manager', 'admin')
);

DROP POLICY IF EXISTS "Users read own invoice items" ON public.invoice_items;
CREATE POLICY "Users read own invoice items" ON public.invoice_items FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.invoices
        WHERE invoices.id = invoice_items.invoice_id
        AND (invoices.customer_id = auth.uid() OR invoices.customer_email = auth.jwt()->>'email')
    ) OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('manager', 'admin')
);

-- Admin / Manager Full Access Policies
DROP POLICY IF EXISTS "Admin full access services" ON public.services;
CREATE POLICY "Admin full access services" ON public.services FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('manager', 'admin'));

DROP POLICY IF EXISTS "Admin full access stations" ON public.stations;
CREATE POLICY "Admin full access stations" ON public.stations FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('manager', 'admin'));

DROP POLICY IF EXISTS "Admin full access offers" ON public.offers;
CREATE POLICY "Admin full access offers" ON public.offers FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('manager', 'admin'));

DROP POLICY IF EXISTS "Admin full access coupons" ON public.coupons;
CREATE POLICY "Admin full access coupons" ON public.coupons FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('manager', 'admin'));

DROP POLICY IF EXISTS "Admin full access cms_content_blocks" ON public.cms_content_blocks;
CREATE POLICY "Admin full access cms_content_blocks" ON public.cms_content_blocks FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('manager', 'admin'));

DROP POLICY IF EXISTS "Admin full access cms_banners" ON public.cms_banners;
CREATE POLICY "Admin full access cms_banners" ON public.cms_banners FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('manager', 'admin'));

DROP POLICY IF EXISTS "Admin full access blog_posts" ON public.blog_posts;
CREATE POLICY "Admin full access blog_posts" ON public.blog_posts FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('manager', 'admin'));

DROP POLICY IF EXISTS "Admin full access enquiries" ON public.enquiries;
CREATE POLICY "Admin full access enquiries" ON public.enquiries FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('manager', 'admin'));

DROP POLICY IF EXISTS "Admin full access newsletter_subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admin full access newsletter_subscribers" ON public.newsletter_subscribers FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('manager', 'admin'));

DROP POLICY IF EXISTS "Admin full access invoices" ON public.invoices;
CREATE POLICY "Admin full access invoices" ON public.invoices FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('manager', 'admin'));

DROP POLICY IF EXISTS "Admin full access invoice_items" ON public.invoice_items;
CREATE POLICY "Admin full access invoice_items" ON public.invoice_items FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('manager', 'admin'));

DROP POLICY IF EXISTS "Admin full access reviews" ON public.reviews;
CREATE POLICY "Admin full access reviews" ON public.reviews FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('manager', 'admin'));

DROP POLICY IF EXISTS "Admin full access testimonials" ON public.testimonials;
CREATE POLICY "Admin full access testimonials" ON public.testimonials FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('manager', 'admin'));

DROP POLICY IF EXISTS "Admin full access team_members" ON public.team_members;
CREATE POLICY "Admin full access team_members" ON public.team_members FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('manager', 'admin'));

DROP POLICY IF EXISTS "Admin full access delivery_assignments" ON public.delivery_assignments;
CREATE POLICY "Admin full access delivery_assignments" ON public.delivery_assignments FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('manager', 'admin'));

DROP POLICY IF EXISTS "Admin full access audit_logs" ON public.audit_logs;
CREATE POLICY "Admin full access audit_logs" ON public.audit_logs FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('manager', 'admin'));
