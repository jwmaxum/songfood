# [Phase 1] 식품 라벨링 마스터 DB 모델링 및 Supabase DDL 구축 (improve1.md)

## 1. 개요 및 목적
송영민푸드의 300여 개 K-Food 및 K-Liquor 품목에 대해 5대 수출 대상국(미국, 중국, 일본, EU, UAE)의 규제 요건을 수용하고, 바이어 제시용 6대 표준 블록(Header, PDP, Information Panel, Nutrition Panel, Dating & Lot, Barcode)을 체계적으로 영속화할 수 있는 데이터베이스 스키마를 Supabase(PostgreSQL)에 구축합니다.

---

## 2. 데이터베이스 엔티티 설계 (ERD 구조)

```
┌────────────────────────┐         1:N         ┌────────────────────────┐
│      products          │ ──────────────────< │      food_labels       │
│ (기존 상품 마스터)     │                     │ (국가별 라벨링 마스터) │
└────────────────────────┘                     └────────────────────────┘
                                                           │
               ┌───────────────────────────────┬───────────┴───────────────────────────────┐
               │ 1:1                           │ 1:1                                       │ 1:N
┌────────────────────────┐       ┌────────────────────────┐                  ┌────────────────────────┐
│  label_nutritions      │       │  label_compliance_logs │                  │  label_ingredients     │
│ (국가별 영양성분 스펙) │       │ (규제 위반/적합 판정)  │                  │ (원재료 배합비/알레르기)│
└────────────────────────┘       └────────────────────────┘                  └────────────────────────┘
```

---

## 3. 핵심 테이블 DDL 명세

### 3.1. 국가별 라벨 마스터 테이블 (`food_labels`)
기존 `products` 테이블의 제품 ID를 외래키로 참조하며, 5개 수출국별 라벨링 사양을 관리합니다.

```sql
-- 5대 대상국 ENUM 타입
CREATE TYPE export_country_type AS ENUM ('US', 'CN', 'JP', 'EU', 'UAE');
CREATE TYPE label_status_type AS ENUM ('draft', 'review_pending', 'compliant', 'rejected');

CREATE TABLE IF NOT EXISTS public.food_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    country export_country_type NOT NULL,
    version INT NOT NULL DEFAULT 1,
    status label_status_type NOT NULL DEFAULT 'draft',
    
    -- 1. Header Block
    hs_code VARCHAR(12),                      -- HS Code (6~10자리)
    product_name_local TEXT NOT NULL,         -- 현지어 제품명 (영어/간체/일본어/아랍어 등)
    product_name_en TEXT NOT NULL,            -- 공식 영문 제품명
    product_category_local TEXT,              -- 현지 법적 식품 유형 (예: 냉동만두, 유탕면 등)
    
    -- 2. PDP Block (전면 주표시면)
    net_weight_g NUMERIC(10, 2) NOT NULL,     -- 순중량 (g/ml 단위)
    net_weight_oz NUMERIC(10, 2),             -- 미국/영미권용 온스(oz/fl oz) 병기
    claims_badges JSONB DEFAULT '[]'::jsonb,  -- 소구 뱃지 (Non-GMO, Halal, Vegan 등)
    serving_suggestion TEXT,                  -- 조리예 문구
    
    -- 3. Information Panel Block (측·후면 표시)
    storage_instructions TEXT NOT NULL,       -- 보관방법 (예: -18°C 이하 냉동보관)
    cooking_instructions TEXT,                -- 조리방법 상세
    manufacturer_info JSONB NOT NULL,         -- 제조원/수출원 (상호, 주소, 국가)
    importer_info JSONB DEFAULT '{}'::jsonb,  -- 수입자/유통사 (Buyer to Fill)
    registration_numbers JSONB DEFAULT '{}'::jsonb, -- 해외공장등록 (GACC 18자리, FDA FCE 등)
    
    -- 5. Dating & Lot Block
    date_marking_type VARCHAR(50) NOT NULL,   -- 'MM/DD/YYYY', 'YYYY/MM/DD', 'DD/MM/YYYY'
    date_marking_text TEXT,                   -- "Printed on bottom of package" 등
    shelf_life_months INT NOT NULL DEFAULT 12,
    
    -- 6. Barcode & Package
    barcode_type VARCHAR(20) DEFAULT 'EAN-13',-- EAN-13 또는 UPC-A
    barcode_number VARCHAR(30),
    packaging_material TEXT,                  -- 포장재질 (비닐류 기타, PP, PE 등)
    recycling_symbols JSONB DEFAULT '[]'::jsonb, -- 분리배출 마크 키
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, country, version)
);
```

### 3.2. 영양성분 스펙 테이블 (`label_nutritions`)
미국 FDA 2016 규격, 중국 NRV%, 일본 5대 고정순서, EU kJ/kcal 듀얼, UAE 신호등 라벨에 필요한 모든 필드를 구조화합니다.

```sql
CREATE TABLE IF NOT EXISTS public.label_nutritions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label_id UUID NOT NULL REFERENCES public.food_labels(id) ON DELETE CASCADE,
    
    serving_size_g NUMERIC(8, 2) NOT NULL,    -- 1회 섭취참고량 (g 또는 ml)
    serving_size_unit TEXT DEFAULT 'g',       -- 'g', 'ml', 'piece'
    serving_size_household TEXT,              -- 가구당 단위 (예: "3 pieces (100g)")
    servings_per_container NUMERIC(6, 1),     -- 총 내용량당 1회 제공 횟수
    
    -- 공통 및 국가별 영양 성분 (1회 제공량 및 100g 환산치)
    calories_kcal NUMERIC(8, 2) NOT NULL,     -- 열량 (kcal)
    calories_kj NUMERIC(8, 2),                -- 열량 (kJ - EU 필수)
    total_fat_g NUMERIC(8, 2) DEFAULT 0,      -- 지방
    saturated_fat_g NUMERIC(8, 2) DEFAULT 0,  -- 포화지방
    trans_fat_g NUMERIC(8, 2) DEFAULT 0,      -- 트랜스지방 (미국 필수)
    cholesterol_mg NUMERIC(8, 2) DEFAULT 0,   -- 콜레스테롤 (mg)
    sodium_mg NUMERIC(8, 2) DEFAULT 0,        -- 나트륨 (mg)
    salt_equivalent_g NUMERIC(8, 2) DEFAULT 0,-- 식염상당량 (g - 일본/EU 필수)
    total_carbohydrate_g NUMERIC(8, 2) DEFAULT 0, -- 탄수화물
    dietary_fiber_g NUMERIC(8, 2) DEFAULT 0,  -- 식이섬유
    total_sugars_g NUMERIC(8, 2) DEFAULT 0,   -- 총 당류
    added_sugars_g NUMERIC(8, 2) DEFAULT 0,   -- 첨가당 (미국 필수)
    protein_g NUMERIC(8, 2) DEFAULT 0,        -- 단백질
    
    -- 미량 영양소 (비타민/무기질)
    vitamin_d_mcg NUMERIC(8, 2) DEFAULT 0,    -- 비타민 D (미국 필수)
    calcium_mg NUMERIC(8, 2) DEFAULT 0,       -- 칼슘
    iron_mg NUMERIC(8, 2) DEFAULT 0,          -- 철분
    potassium_mg NUMERIC(8, 2) DEFAULT 0,     -- 칼륨 (미국 필수)
    
    -- 국가별 계산 지표
    nrv_percentages JSONB DEFAULT '{}'::jsonb,-- 중국/글로벌 영양소 기준치 비율(%)
    traffic_light_ratings JSONB DEFAULT '{}'::jsonb, -- UAE/영국형 신호등 색상 (Green/Amber/Red)
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(label_id)
);
```

### 3.3. 원재료 배합비 및 알레르겐 테이블 (`label_ingredients`)
```sql
CREATE TABLE IF NOT EXISTS public.label_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label_id UUID NOT NULL REFERENCES public.food_labels(id) ON DELETE CASCADE,
    ingredient_name_ko TEXT NOT NULL,         -- 한국어 원재료명
    ingredient_name_target TEXT NOT NULL,     -- 수출 대상국 현지 표기명
    percentage NUMERIC(5, 2),                 -- 배합 비율 (내림차순 정렬용)
    sub_ingredients TEXT,                     -- 복합원재료 하위 성분 풀이 (괄호 표기)
    ins_e_number VARCHAR(20),                 -- 식품첨가물 국제번호 (E621, INS 500 등)
    is_allergen BOOLEAN DEFAULT false,        -- 알레르기 유발물질 여부
    allergen_category VARCHAR(50),            -- 알레르겐 분류 (참깨, 밀, 대두 등)
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.4. 규제 준수 검증 로그 (`label_compliance_logs`)
```sql
CREATE TABLE IF NOT EXISTS public.label_compliance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label_id UUID NOT NULL REFERENCES public.food_labels(id) ON DELETE CASCADE,
    is_compliant BOOLEAN NOT NULL DEFAULT false,
    critical_errors JSONB DEFAULT '[]'::jsonb, -- 통관 불가 Red-Flag 항목들
    warnings JSONB DEFAULT '[]'::jsonb,        -- 개선 권장 항목들
    checked_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. 인덱스 및 성능 최적화
```sql
CREATE INDEX idx_food_labels_product_country ON public.food_labels(product_id, country);
CREATE INDEX idx_food_labels_status ON public.food_labels(status);
CREATE INDEX idx_label_nutritions_label_id ON public.label_nutritions(label_id);
CREATE INDEX idx_label_ingredients_label_id ON public.label_ingredients(label_id, display_order);
```

---

## 5. RLS (Row Level Security) 정책
- **일반 공개(Public / Buyer Viewer)**: `status = 'compliant'` 상태인 라벨은 익명 및 바이어가 읽기 가능 (`SELECT`).
- **관리자(Admin / Editor)**: `food_labels`, `label_nutritions`, `label_ingredients` 전체 권한 부여 (`ALL`).

---

## 6. 실행 및 검증 기준 (Done Criteria)
1. Supabase SQL Editor 또는 마이그레이션 스크립트를 통해 테이블 생성 에러 없이 정상 적용 완료.
2. `src/types/label.ts`에 TypeScript 인터페이스 모델 정의 완료.
3. 5개국(US, CN, JP, EU, UAE) 샘플 데이터 1건 이상 Insert 후 릴레이션 관계 및 쿼리 무결성 확인.
