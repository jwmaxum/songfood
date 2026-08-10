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
    18000.00,
    22000.00,
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
    15000.00,
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
),
(
    'prod-3',
    'K-수제 눈꽃 떡볶이 & 모둠튀김 3인분 밀키트 (K-Street Tteokbokki Kit)',
    'K-Street Spicy Tteokbokki & Assorted Tempura Kit',
    'K-간편식/HMR',
    '떡볶이 & 밀키트',
    10000.00,
    14000.00,
    95,
    4.8,
    64,
    'KFD-TTEOK-KIT',
    '650g 밀키트 (3인분)',
    '급속동결 비법 소스',
    '매콤달콤 크림슨 레드',
    '쫄깃한 쌀떡 & 야채/김말이 튀김',
    'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80',
    '쫄깃한 쌀떡과 매콤달콤 비법 양념소스, 김말이·야채튀김이 어우러진 스트리트 K-떡볶이 수제 밀키트.',
    '650g',
    '서울, 대한민국',
    true,
    true,
    true,
    10,
    0.15,
    85000.00,
    7.50
),
(
    'prod-5',
    '크리스피 순살 양념 & 간장 반반 치킨 (K-Fried Chicken Half & Half)',
    'Korean Boneless Fried Chicken Half & Half (Sweet & Garlic Soy)',
    'K-냉동식품',
    '치킨 & 안주',
    10000.00,
    14000.00,
    110,
    5.0,
    145,
    'KFD-CHIK-HALF',
    '800g (400g x 2팩)',
    '더블 에어크리스피 공법',
    '마늘간장 & 달콤 양념 글레이즈',
    '100% 닭다리살 순살 치킨',
    'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?auto=format&fit=crop&w=800&q=80',
    '에어프라이어 15분으로 에어크리스피 겉바속촉 완성! 달콤매콤 양념소스크런치와 단짠 마늘간장치킨 반반 세트.',
    '800g',
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
    'prod-sauce',
    '송영민 수제 불고기 & 갈비 비법 양념소스 2kg (Artisanal Bulgogi Sauce 2kg)',
    'Song Youngmin Artisanal Korean Bulgogi & Galbi Sauce 2kg',
    'K-소스/조미료',
    '소스 & 양념',
    10000.00,
    14000.00,
    180,
    4.9,
    98,
    'KFD-SAU-BULG-2K',
    '2kg 업소용 용기',
    '나주배 농축 숙성 양조간장',
    '진한 앰버 갈색 소스',
    '윤기 흐르는 특제 마리네이드',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    '나주 배 즙과 특제 양조간장, 국산 다진 마늘을 숙성시켜 깊은 풍미를 자랑하는 업소용/B2B 불고기 비법 소스.',
    '2 kg',
    '대한민국 (Korea)',
    true,
    true,
    false,
    10,
    0.15,
    85000.00,
    7.50
),
(
    'prod-2',
    '원소주 프리미엄 증류식 소주 24% (WON SOJU Distilled Spirits)',
    'WON SOJU Artisanal Distilled Rice Spirits 24% 375ml',
    'K-주류 & 전통주',
    '증류식 소주',
    10000.00,
    14000.00,
    80,
    5.0,
    124,
    'KLQ-WON-SOJU-375',
    '375ml 유리병',
    '100% 국내산 쌀 증류',
    '투명하고 감미로운 쌀 향',
    '옹기 장기 숙성 전통 증류주',
    'https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&w=800&q=80',
    '100% 국내산 쌀만을 발효하여 옹기 숙성한 부드럽고 깔끔한 풍미의 박재범 원소주 24% 전통 증류주.',
    '375 ml',
    '원주, 대한민국',
    true,
    false,
    true,
    10,
    0.15,
    85000.00,
    7.50
),
(
    'prod-4',
    '느린마을 수제 생막걸리 750ml (Slow Village Raw Rice Wine)',
    'Slow Village Artisanal Fresh Raw Makgeolli 750ml',
    'K-주류 & 전통주',
    '막걸리 & 탁주',
    10000.00,
    14000.00,
    60,
    4.9,
    72,
    'KLQ-SLOW-MAK-750',
    '750ml 신선 냉장병',
    '무아스파탐 순수 발효',
    '뽀얀 우윳빛 발효주',
    '자연 탄산 살균 생막걸리',
    'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80',
    '인공 감미료 없이 쌀, 누룩, 물만으로 장기 순수 발효시킨 프레시 생막걸리. 부드러운 탄산과 순수한 단맛.',
    '750 ml',
    '포천, 대한민국',
    true,
    false,
    false,
    10,
    0.15,
    85000.00,
    7.50
),
(
    'prod-snack',
    '송영민푸드 프리미엄 K-스낵 바삭 고구마칩 100g (Sweet Potato Chips)',
    'Song Youngmin Premium Crunchy Sweet Potato Chips 100g',
    'K-스낵/음료',
    '과자 & 스낵',
    10000.00,
    14000.00,
    300,
    4.9,
    56,
    'KFD-SNK-SWPOT-100',
    '100g 알루미늄 파우치',
    '진공 저온 유탕 공법',
    '황금빛 자색 고구마색',
    '국산 100% 고구마 원물 스낵',
    'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=800&q=80',
    '국산 고구마 100%를 진공 저온 공법으로 튀겨 고구마 본연의 달콤함과 바삭함을 살린 프리미엄 K-웰빙 스낵.',
    '100g',
    '대한민국 (Korea)',
    true,
    true,
    true,
    10,
    0.15,
    85000.00,
    7.50
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    name_en = EXCLUDED.name_en,
    collection = EXCLUDED.collection,
    category = EXCLUDED.category,
    price = EXCLUDED.price,
    original_price = EXCLUDED.original_price,
    stock = EXCLUDED.stock,
    rating = EXCLUDED.rating,
    reviews_count = EXCLUDED.reviews_count,
    sku = EXCLUDED.sku,
    format = EXCLUDED.format,
    finish = EXCLUDED.finish,
    color = EXCLUDED.color,
    look = EXCLUDED.look,
    image_url = EXCLUDED.image_url,
    description = EXCLUDED.description,
    thickness = EXCLUDED.thickness,
    origin = EXCLUDED.origin,
    is_featured = EXCLUDED.is_featured,
    is_todays_deal = EXCLUDED.is_todays_deal,
    is_best_seller = EXCLUDED.is_best_seller,
    carton_qty = EXCLUDED.carton_qty,
    wholesale_discount_rate = EXCLUDED.wholesale_discount_rate,
    wholesale_price_krw = EXCLUDED.wholesale_price_krw,
    export_price_usd = EXCLUDED.export_price_usd;

-- ------------------------------------------------------------------------------
-- JOURNAL_ARTICLES TABLE (News, Events & Recipes)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.journal_articles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL DEFAULT '뉴스',
    excerpt TEXT,
    content TEXT,
    cover_image TEXT,
    is_published BOOLEAN DEFAULT true,
    published_date TEXT DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for journal_articles
ALTER TABLE public.journal_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Journal Articles" ON public.journal_articles;
CREATE POLICY "Public Read Journal Articles" ON public.journal_articles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin Full Access Journal Articles" ON public.journal_articles;
CREATE POLICY "Admin Full Access Journal Articles" ON public.journal_articles FOR ALL USING (true);

-- Seed Data for journal_articles
INSERT INTO public.journal_articles (id, title, slug, category, excerpt, content, cover_image, is_published, published_date)
VALUES
(
    'art-1',
    '송영민푸드 K-푸드 신선 공방 오픈 소식',
    'songyoungminfood-k-food-lab-open',
    '뉴스',
    '대한민국 프리미엄 K-냉동식품과 원소주, 생막걸리 전통주 직송 라인업이 강화되었습니다.',
    '# 송영민푸드 K-푸드 신선 공방 오픈\n\n송영민푸드(Song Youngmin Food)에서 엄선된 국산 100% 원재료 기반 K-냉동식품과 명품 전통주 라인업을 신규 출시합니다.\n\n세계 50개국에 진출하는 프리미엄 K-Food 표준을 제시합니다.',
    'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=1200&q=80',
    true,
    '2026-06-15'
),
(
    'art-2',
    '원소주 24% & 느린마을 생막걸리 미식 페어링 가이드',
    'wonsoju-makgeolli-pairing-guide',
    'K-레시피',
    '비비고 왕교자 만두 및 수제 떡볶이 밀키트와 완벽하게 어우러지는 전통주 페어링 팁.',
    '# K-주류 미식 페어링 가이드\n\n옹기 숙성 원소주의 청량하고 깊은 풍미와 떡볶이의 매콤함이 이루는 환상의 조합을 경험하세요.',
    'https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&w=1200&q=80',
    true,
    '2026-05-20'
),
(
    'art-3',
    '에어프라이어 15분! 바삭한 크리스피 반반 치킨 비법',
    'airfryer-crispy-chicken-recipe',
    'K-레시피',
    '집에서도 갓 튀겨낸 듯 바삭하고 튀김 옷이 살아있는 양념 & 간장 치킨 조리법.',
    '# 에어프라이어 치킨 조리 비법\n\n180도 예열된 에어프라이어에서 15분간 조리하면 극강의 바삭함이 완성됩니다.',
    'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1200&q=80',
    true,
    '2026-04-10'
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    slug = EXCLUDED.slug,
    category = EXCLUDED.category,
    excerpt = EXCLUDED.excerpt,
    content = EXCLUDED.content,
    cover_image = EXCLUDED.cover_image,
    is_published = EXCLUDED.is_published,
    published_date = EXCLUDED.published_date;
