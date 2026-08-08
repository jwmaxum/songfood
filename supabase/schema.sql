-- ==============================================================================
-- 송영민푸드 (Song Youngmin Food) K-Food Marketplace & Global B2B Export Platform
-- Complete Supabase Database Schema DDL (schema.sql)
-- Website: https://www.songfood.co.kr/
-- Description: Full Production DDL Scripts, RLS Policies, Indexes, and Initial Seed Data
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. MENUS TABLE (Dynamic Layout & Menu Engine)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    parent_id UUID REFERENCES public.menus(id) ON DELETE CASCADE,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    position TEXT NOT NULL CHECK (position IN ('header', 'footer', 'both')),
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. HERO_SLIDES TABLE (Hero Banner & Media Slider CMS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hero_slides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    media_url TEXT NOT NULL,
    poster_url TEXT,
    title TEXT NOT NULL,
    subtitle TEXT,
    cta_label TEXT DEFAULT 'Explore K-Food Catalog',
    cta_url TEXT DEFAULT '/shop',
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. PRODUCTS TABLE (Product CRUD, Dual Pricing & Export Catalog)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY, -- e.g. 'prod-1', 'prod-kimchi'
    name TEXT NOT NULL,
    name_en TEXT,
    collection TEXT NOT NULL,
    category TEXT,
    price NUMERIC(12, 2) NOT NULL DEFAULT 10000.00, -- Retail Unit Price (₩10,000)
    original_price NUMERIC(12, 2) DEFAULT 14000.00,
    stock INT NOT NULL DEFAULT 150,
    rating NUMERIC(3, 2) DEFAULT 4.9,
    reviews_count INT DEFAULT 48,
    sku TEXT,
    format TEXT NOT NULL,
    finish TEXT NOT NULL,
    color TEXT NOT NULL,
    look TEXT NOT NULL,
    image_url TEXT NOT NULL,
    description TEXT,
    thickness TEXT DEFAULT '1.05 kg',
    origin TEXT DEFAULT '대한민국 (Korea)',
    is_featured BOOLEAN DEFAULT true,
    is_todays_deal BOOLEAN DEFAULT false,
    is_best_seller BOOLEAN DEFAULT false,
    deal_discount_percent INT DEFAULT 0,

    -- Domestic Specs
    brand TEXT DEFAULT '송영민푸드',
    manufacturer TEXT DEFAULT '송영민푸드(주)',
    country_of_origin TEXT DEFAULT '대한민국',
    net_weight TEXT,
    package_size TEXT,
    shelf_life TEXT,
    storage TEXT,
    ingredients TEXT,
    allergens TEXT,
    certifications JSONB DEFAULT '["HACCP"]'::jsonb,

    -- Master Box & Export Specs
    carton_qty INT NOT NULL DEFAULT 10, -- 10 items per box
    wholesale_discount_rate NUMERIC(4, 2) NOT NULL DEFAULT 0.15, -- 15% discount
    wholesale_price_krw NUMERIC(12, 2) DEFAULT 85000.00, -- ₩85,000 / Box
    export_price_usd NUMERIC(10, 2) DEFAULT 7.50, -- FOB USD per CTN
    carton_size TEXT DEFAULT '480 x 320 x 240 mm',
    gross_weight NUMERIC(6, 2) DEFAULT 11.2,
    cbm NUMERIC(6, 3) DEFAULT 0.037,
    moq_cartons INT DEFAULT 50,
    hs_code TEXT DEFAULT '1902.20-1000',
    production_lead_time TEXT DEFAULT '14 Days',
    export_packaging TEXT DEFAULT 'Cold-Chain Reefer Carton Box (-18°C)',
    loading_port TEXT DEFAULT 'Busan Port, Korea',
    target_markets JSONB DEFAULT '["USA", "Japan", "Europe", "Southeast Asia"]'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. USER_PROFILES TABLE (Customer Profiles & Sub-Admin Roles)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'inquiry_staff', 'product_staff', 'order_staff', 'viewer')) DEFAULT 'viewer',
    status TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'pending')) DEFAULT 'active',
    addresses JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. ORDERS TABLE (Domestic E-Commerce Orders & Toss Payments)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY, -- e.g. 'ORD-2026-8891'
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled')) DEFAULT 'Processing',
    items JSONB NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    shipping_fee NUMERIC(10, 2) DEFAULT 0.00, -- 3,000 KRW if subtotal < 50,000 KRW
    total NUMERIC(12, 2) NOT NULL,
    shipping_address JSONB NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('tosspayments', 'credit_card', 'virtual_account', 'bank_transfer', 'kakao_pay')) DEFAULT 'tosspayments',
    payment_key TEXT,
    payment_status TEXT CHECK (payment_status IN ('READY', 'IN_PROGRESS', 'WAITING_FOR_DEPOSIT', 'DONE', 'CANCELED', 'PARTIAL_CANCELED', 'ABORTED', 'EXPIRED')) DEFAULT 'DONE',
    order_type TEXT CHECK (order_type IN ('retail', 'wholesale')) DEFAULT 'retail',
    courier_company TEXT DEFAULT 'CJ대한통운',
    tracking_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. RFQ_REQUESTS TABLE (Overseas Buyer RFQ & Pro Forma Invoice)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rfq_requests (
    id TEXT PRIMARY KEY, -- e.g. 'RFQ-2026-9042'
    company_name TEXT NOT NULL,
    buyer_name TEXT NOT NULL,
    buyer_email TEXT NOT NULL,
    buyer_phone TEXT,
    business_type TEXT DEFAULT 'Importer / Distributor',
    destination_country TEXT NOT NULL DEFAULT 'USA',
    destination_port TEXT DEFAULT 'Los Angeles Port (USLAX)',
    incoterms TEXT NOT NULL DEFAULT 'FOB Busan',
    discount_rate NUMERIC(4, 2) DEFAULT 15.00,
    items JSONB NOT NULL,
    total_usd NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Under Review', 'Quote Issued', 'Contract Signed', 'Shipped', 'Cancelled')) DEFAULT 'Under Review',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. PAYMENTS TABLE (Toss Payments Server Audit Log)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_key TEXT UNIQUE NOT NULL,
    order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL,
    method TEXT NOT NULL,
    requested_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    raw_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 8. CONTENT_BLOCKS TABLE (Section Content Block Editor)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_key TEXT UNIQUE NOT NULL,
    page TEXT NOT NULL DEFAULT 'home',
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    media_url TEXT,
    media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
    badge TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 9. JOURNAL_ARTICLES TABLE (News / Event / Blog Journal Editor)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.journal_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('News', 'Event', 'Architecture', 'Design')),
    excerpt TEXT,
    content TEXT NOT NULL,
    cover_image TEXT,
    is_published BOOLEAN DEFAULT true,
    published_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 10. MEDIA_LIBRARY TABLE (Media Library & File Upload Manager)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('image', 'video')),
    size TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_menus_parent ON public.menus(parent_id);
CREATE INDEX IF NOT EXISTS idx_menus_position_active ON public.menus(position, is_active);
CREATE INDEX IF NOT EXISTS idx_products_collection ON public.products(collection);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(is_featured);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_key ON public.orders(payment_key);
CREATE INDEX IF NOT EXISTS idx_rfq_status ON public.rfq_requests(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_journal_slug ON public.journal_articles(slug);
CREATE INDEX IF NOT EXISTS idx_journal_published ON public.journal_articles(is_published);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;

-- 0. Drop Existing Policies for Clean Re-execution
DROP POLICY IF EXISTS "Public Read Active Menus" ON public.menus;
DROP POLICY IF EXISTS "Public Read Hero Slides" ON public.hero_slides;
DROP POLICY IF EXISTS "Public Read Products" ON public.products;
DROP POLICY IF EXISTS "Public Read Content Blocks" ON public.content_blocks;
DROP POLICY IF EXISTS "Public Read Published Journal Articles" ON public.journal_articles;
DROP POLICY IF EXISTS "Public Read Media Library" ON public.media_library;

DROP POLICY IF EXISTS "Users Read Own Profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users Update Own Profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users Read Own Orders" ON public.orders;
DROP POLICY IF EXISTS "Users Insert Orders" ON public.orders;

DROP POLICY IF EXISTS "Admin Full Access Menus" ON public.menus;
DROP POLICY IF EXISTS "Admin Full Access Hero Slides" ON public.hero_slides;
DROP POLICY IF EXISTS "Admin Full Access Products" ON public.products;
DROP POLICY IF EXISTS "Admin Full Access User Profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admin Full Access Orders" ON public.orders;
DROP POLICY IF EXISTS "Admin Full Access RFQ Requests" ON public.rfq_requests;
DROP POLICY IF EXISTS "Admin Full Access Payments" ON public.payments;
DROP POLICY IF EXISTS "Admin Full Access Content Blocks" ON public.content_blocks;
DROP POLICY IF EXISTS "Admin Full Access Journal Articles" ON public.journal_articles;
DROP POLICY IF EXISTS "Admin Full Access Media Library" ON public.media_library;

-- 1. Public Read Policies
CREATE POLICY "Public Read Active Menus" ON public.menus FOR SELECT USING (true);
CREATE POLICY "Public Read Hero Slides" ON public.hero_slides FOR SELECT USING (true);
CREATE POLICY "Public Read Products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public Read Content Blocks" ON public.content_blocks FOR SELECT USING (true);
CREATE POLICY "Public Read Published Journal Articles" ON public.journal_articles FOR SELECT USING (true);
CREATE POLICY "Public Read Media Library" ON public.media_library FOR SELECT USING (true);

-- 2. Customer Policies
CREATE POLICY "Users Read Own Profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users Update Own Profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users Read Own Orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users Insert Orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 3. Admin & Service Role Access Policies
CREATE POLICY "Admin Full Access Menus" ON public.menus FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Admin Full Access Hero Slides" ON public.hero_slides FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Admin Full Access Products" ON public.products FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Admin Full Access User Profiles" ON public.user_profiles FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Admin Full Access Orders" ON public.orders FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Admin Full Access RFQ Requests" ON public.rfq_requests FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Admin Full Access Payments" ON public.payments FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Admin Full Access Content Blocks" ON public.content_blocks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Admin Full Access Journal Articles" ON public.journal_articles FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Admin Full Access Media Library" ON public.media_library FOR ALL USING (auth.role() = 'service_role');

-- ==============================================================================
-- INITIAL SEED DATA INSERT STATEMENTS (K-Food Standard 10,000 KRW & 10 per box)
-- ==============================================================================

INSERT INTO public.products (id, name, name_en, collection, category, price, original_price, stock, rating, reviews_count, sku, format, finish, color, look, image_url, description, thickness, origin, is_featured, is_todays_deal, is_best_seller, carton_qty, wholesale_discount_rate, wholesale_price_krw, export_price_usd)
VALUES
(
    'prod-1',
    'CJ 비비고 수제 프리미엄 왕교자 만두 (Bibigo Pork & Leek Mandu)',
    'Bibigo Premium Pork & Leek Mandu Dumplings',
    'K-냉동식품',
    '만두 & 교자',
    10000.00,
    14000.00,
    150,
    4.9,
    88,
    'KFD-BIBI-MANDU',
    '1.05kg 패밀리팩',
    '-40°C IQF 급속냉동',
    '노릇노릇한 바삭함',
    '수제 손주름 왕교자',
    'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=800&q=80',
    '100% 얇은 피 속 국내산 돼지고기와 신선한 부추, 당면이 듬뿍 들어간 대한민국 대표 비비고 왕교자 만두.',
    '1.05 kg',
    '대한민국 (Korea)',
    true,
    true,
    true,
    10,
    0.15,
    85000.00,
    7.50
),
(
    'prod-kimchi',
    '송영민푸드 명품 전통 포기김치 5kg (Premium Artisanal Poggi Kimchi)',
    'Song Youngmin Food Premium Artisanal Poggi Kimchi 5kg',
    'K-전통식품',
    '김치 & 발효식품',
    10000.00,
    14000.00,
    200,
    5.0,
    142,
    'KFD-KMC-POGGI-5K',
    '5kg 업소용/가정용',
    '자연 유산균 발효',
    '진한 붉은빛 갓담근 김치',
    '해남 배추 수제 포기김치',
    'https://images.unsplash.com/photo-1583224964978-2257b960c3d3?auto=format&fit=crop&w=800&q=80',
    '100% 해남 배추와 고춧가루, 황석어젓, 멸치액젓으로 정성껏 담근 한국 전통 발효 명품 포기김치.',
    '5 kg',
    '대한민국 (Korea)',
    true,
    false,
    true,
    10,
    0.15,
    85000.00,
    7.50
)
ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    carton_qty = EXCLUDED.carton_qty,
    wholesale_discount_rate = EXCLUDED.wholesale_discount_rate,
    wholesale_price_krw = EXCLUDED.wholesale_price_krw,
    export_price_usd = EXCLUDED.export_price_usd;
