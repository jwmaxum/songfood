-- ==============================================================================
-- 송영민푸드 (Song Youngmin Food) 글로벌 식품 마스터 라벨링 시스템
-- Supabase Migration DDL: label_schema.sql
-- ==============================================================================

-- 1. ENUM 타입 정의
DO $$ BEGIN
    CREATE TYPE export_country_type AS ENUM ('US', 'CN', 'JP', 'EU', 'UAE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE label_status_type AS ENUM ('draft', 'review_pending', 'compliant', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. 국가별 라벨 마스터 테이블 (food_labels)
CREATE TABLE IF NOT EXISTS public.food_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL,
    country export_country_type NOT NULL,
    version INT NOT NULL DEFAULT 1,
    status label_status_type NOT NULL DEFAULT 'draft',
    
    -- 1. Header Block
    hs_code VARCHAR(12),
    product_name_local TEXT NOT NULL,
    product_name_en TEXT NOT NULL,
    product_category_local TEXT,
    
    -- 2. PDP Block (주표시면)
    net_weight_g NUMERIC(10, 2) NOT NULL,
    net_weight_oz NUMERIC(10, 2),
    package_area_cm2 NUMERIC(8, 2),
    is_shelf_stable BOOLEAN DEFAULT true,
    claims_badges JSONB DEFAULT '[]'::jsonb,
    serving_suggestion TEXT,
    
    -- 3. Information Panel Block (정보표시면)
    storage_instructions TEXT NOT NULL,
    cooking_instructions TEXT,
    manufacturer_info JSONB NOT NULL,
    importer_info JSONB DEFAULT '{}'::jsonb,
    registration_numbers JSONB DEFAULT '{}'::jsonb,
    alcohol_percentage NUMERIC(4, 2) DEFAULT 0.00,
    
    -- 4. Dating & Barcode
    date_marking_type VARCHAR(50) NOT NULL,
    date_marking_text TEXT,
    shelf_life_months INT NOT NULL DEFAULT 12,
    barcode_type VARCHAR(20) DEFAULT 'EAN-13',
    barcode_number VARCHAR(30),
    packaging_material TEXT,
    recycling_symbols JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, country, version)
);

-- 3. 원재료 배합비 및 알레르겐 테이블 (label_ingredients)
CREATE TABLE IF NOT EXISTS public.label_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label_id UUID NOT NULL REFERENCES public.food_labels(id) ON DELETE CASCADE,
    ingredient_name_ko TEXT NOT NULL,
    ingredient_name_target TEXT NOT NULL,
    ratio NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    sub_ingredients TEXT,
    ins_or_e_number VARCHAR(20),
    is_allergen BOOLEAN DEFAULT false,
    allergen_category VARCHAR(50),
    allergen_origin TEXT,
    is_highly_refined_oil BOOLEAN DEFAULT false,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 권역별 영양성분 테이블 (label_nutritions)
CREATE TABLE IF NOT EXISTS public.label_nutritions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label_id UUID NOT NULL REFERENCES public.food_labels(id) ON DELETE CASCADE,
    
    -- 1회 제공량 기준
    serving_size_g NUMERIC(8, 2) NOT NULL,
    serving_size_unit TEXT DEFAULT 'g',
    serving_size_household TEXT,
    servings_per_container NUMERIC(6, 1),
    is_dual_column BOOLEAN DEFAULT false,
    
    -- 기본 영양성분
    calories_kcal NUMERIC(8, 2) NOT NULL,
    calories_kj NUMERIC(8, 2),
    total_fat_g NUMERIC(8, 2) DEFAULT 0,
    saturated_fat_g NUMERIC(8, 2) DEFAULT 0,
    trans_fat_g NUMERIC(8, 2) DEFAULT 0,
    cholesterol_mg NUMERIC(8, 2) DEFAULT 0,
    sodium_mg NUMERIC(8, 2) DEFAULT 0,
    salt_equivalent_g NUMERIC(8, 2) DEFAULT 0,
    total_carbohydrate_g NUMERIC(8, 2) DEFAULT 0,
    dietary_fiber_g NUMERIC(8, 2) DEFAULT 0,
    total_sugars_g NUMERIC(8, 2) DEFAULT 0,
    added_sugars_g NUMERIC(8, 2) DEFAULT 0,
    protein_g NUMERIC(8, 2) DEFAULT 0,
    
    -- 미량 영양소
    vitamin_d_mcg NUMERIC(8, 2) DEFAULT 0,
    calcium_mg NUMERIC(8, 2) DEFAULT 0,
    iron_mg NUMERIC(8, 2) DEFAULT 0,
    potassium_mg NUMERIC(8, 2) DEFAULT 0,
    
    -- 권역별 지표
    nrv_percentages JSONB DEFAULT '{}'::jsonb,
    traffic_light_ratings JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(label_id)
);

-- 5. 컴플라이언스 검증 로그 (label_compliance_logs)
CREATE TABLE IF NOT EXISTS public.label_compliance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label_id UUID NOT NULL REFERENCES public.food_labels(id) ON DELETE CASCADE,
    jurisdiction VARCHAR(50) NOT NULL,
    is_compliant BOOLEAN NOT NULL DEFAULT false,
    score INT NOT NULL DEFAULT 0,
    critical_errors JSONB DEFAULT '[]'::jsonb,
    warnings JSONB DEFAULT '[]'::jsonb,
    checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_food_labels_product_country ON public.food_labels(product_id, country);
CREATE INDEX IF NOT EXISTS idx_food_labels_status ON public.food_labels(status);
CREATE INDEX IF NOT EXISTS idx_label_nutritions_label_id ON public.label_nutritions(label_id);
CREATE INDEX IF NOT EXISTS idx_label_ingredients_label_id ON public.label_ingredients(label_id, display_order);

-- 7. 원재료 배합비 내림차순 자동 정렬 트리거
CREATE OR REPLACE FUNCTION reorder_label_ingredients()
RETURNS TRIGGER AS $$
BEGIN
    WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY label_id ORDER BY ratio DESC) AS new_order
        FROM public.label_ingredients
        WHERE label_id = NEW.label_id
    )
    UPDATE public.label_ingredients li
    SET display_order = ranked.new_order
    FROM ranked
    WHERE li.id = ranked.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reorder_ingredients ON public.label_ingredients;
CREATE TRIGGER trg_reorder_ingredients
AFTER INSERT OR UPDATE OF ratio ON public.label_ingredients
FOR EACH ROW EXECUTE FUNCTION reorder_label_ingredients();

-- 8. Row Level Security (RLS) 정책
ALTER TABLE public.food_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.label_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.label_nutritions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.label_compliance_logs ENABLE ROW LEVEL SECURITY;

-- 바이어/공개 읽기 (승인된 라벨 열람)
DROP POLICY IF EXISTS "Public compliant labels view" ON public.food_labels;
CREATE POLICY "Public compliant labels view" ON public.food_labels
FOR SELECT USING (status = 'compliant');

-- 관리자 전권
DROP POLICY IF EXISTS "Admin full access labels" ON public.food_labels;
CREATE POLICY "Admin full access labels" ON public.food_labels
FOR ALL USING (true);
