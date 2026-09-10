# [Phase 2] 5대 권역 규제 준수(Compliance) 검증 엔진 및 Red-Flag 체커 (improve2.md)

## 1. 개요 및 목적
300여 개 품목의 라벨 데이터를 수출 대상국에 맞추어 검토할 때, 국가별 통관 금지 또는 라벨링 법규 위반(Red-Flag)을 자동으로 사전 탐지하는 **규제 검증 엔진(`ComplianceRuleEngine`)**을 구현합니다. FoodChain ID / Decernis gComply 수준의 검증 로직을 내장하여 통관 지연 및 반송 리스크를 0%로 통제합니다.

---

## 2. 5대 수출 대상국 규제 룰셋 (Rule Definition)

### 2.1. 미국 (US - FDA / USDA)
1. **[CRITICAL] 육류 원료 제한 (USDA 관할 검증)**:
   - 만두/가공식품에 소고기·돼지고기 배합비가 2% 이상 포함된 경우, USDA-FSIS 인허가 필수 경고 및 한국산 수출 제한 플래그 발생 (대안: 수산물/식물성 원료 권장).
2. **[CRITICAL] FASTER Act 9대 알레르겐 검증**:
   - `Milk, Eggs, Peanuts, Tree nuts, Fish, Crustacean shellfish, Wheat, Soybeans, Sesame(참깨)`
   - 라벨 내에 'Contains: [성분명]' 형식의 독립된 Callout 박스가 존재하는지 유효성 검사.
3. **[CRITICAL] 영양성분 필수 항목 누락 검사**:
   - `Added Sugars(첨가당)`, `Vitamin D`, `Potassium(칼륨)` 표기 여부 필수 검증.
4. **[WARNING] 날짜 표기 형식**:
   - 월/일/연도 (`MM/DD/YYYY` 또는 Month DD, YYYY) 형식 권장 준수 여부 확인.

### 2.2. 중국 (CN - SAMR / GACC)
1. **[CRITICAL] GACC 18자리 해외제조업체 등록번호**:
   - `registration_numbers.gacc_code`가 유효한 18자리 코드인지 정규식 검증 (`^[A-Z0-9]{18}$`).
2. **[CRITICAL] 생산일자 + 유통기한 병기**:
   - 중국 식품안전법 제67조에 따라 생산일자(生产日期)와 보존기한(保质期)이 모두 지정되었는지 확인.
3. **[CRITICAL] 5대 의무 영양성분 및 NRV%**:
   - 에너지, 단백질, 지방, 탄수화물, 나트륨 및 각각의 영양소 기준치 비율(NRV%) 필수 계산 검증.
4. **[WARNING] 표기 언어**:
   - 중국어 간체(Simplified Chinese) 필수 표기 검증.

### 2.3. 일본 (JP - 소비자청)
1. **[CRITICAL] 8대 특정원재료 의무 표기**:
   - `새우(えび), 게(かに), 호두(くるみ), 밀(小麦), 메밀(そば), 계란(卵), 우유(乳), 땅콩(落花生)` 포함 여부 확인 및 20대 권장 성분 매핑.
2. **[CRITICAL] 영양표시 순서 고정**:
   - `열량(エネルギー) ➔ 단백질(たんぱく質) ➔ 지질(脂質) ➔ 탄수화물(炭水化物) ➔ 식염상당량(食塩相当量)` 순서 보장 검증.
3. **[WARNING] 기한 표시 구분**:
   - 품질유지기한은 '상미기한(賞味期限)', 부패하기 쉬운 식품은 '소비기한(消費期限)' 용어 매핑 검사.

### 2.4. EU (EFSA / EC)
1. **[CRITICAL] 14대 알레르겐 시각적 강조**:
   - EU FIC Regulation No 1169/2011에 따라 알레르겐 원재료가 볼드(Bold) 또는 밑줄(Underline) 등 주변 텍스트와 뚜렷이 구분되는 스타일 태그를 가지고 있는지 검사.
2. **[CRITICAL] 에너지 듀얼 표기**:
   - 열량이 `kJ`와 `kcal` 두 단위로 동시에 표기되었는지 검사 (`1 kcal = 4.184 kJ`).
3. **[WARNING] 최소 활자 크기 (x-height 1.2mm)**:
   - 포장 면적에 따른 최소 폰트 크기 가이드 준수 체크.
4. **[WARNING] 산화에틸렌(EO) / 2-클로로에탄올(2-CE)**:
   - 면류 스프, 참깨, 고춧가루 등 위험 품목 분석 성적서 구비 알림.

### 2.5. UAE (MoIAT / GSO)
1. **[CRITICAL] 알코올 잔류 한도 검증**:
   - 소스류, 장류, 발효식품의 잔류 알코올 함량이 기준치(0.05% 이하)를 초과하는지 여부 검증.
2. **[CRITICAL] 할랄(Halal) 인증 마크 및 서류**:
   - 육류, 동물성 유화제, 쇼트닝 등이 포함된 경우 GSO 공인 할랄 인증 여부 필수 확인.
3. **[CRITICAL] 언어 및 날짜**:
   - 아랍어 병기 여부 및 `일/월/연도 (DD/MM/YYYY)` 생산일자 + 유통기한 병기 검증.

---

## 3. 컴플라이언스 엔진 아키텍처 (`src/lib/label-compliance/`)

```
src/lib/label-compliance/
├── index.ts                   # 통합 validateLabel() 진입 함수
├── rules/
│   ├── us-rules.ts            # 미국 규제 검사기
│   ├── cn-rules.ts            # 중국 규제 검사기
│   ├── jp-rules.ts            # 일본 규제 검사기
│   ├── eu-rules.ts            # EU 규제 검사기
│   └── uae-rules.ts           # UAE 규제 검사기
├── allergens-registry.ts      # 국가별 법정 알레르겐 표준 딕셔너리
└── types.ts                   # ValidationResult, RedFlagItem 타입
```

---

## 4. API 인터페이스 (`/api/labels/validate`)

### 요청 (POST)
```typescript
interface ValidationRequest {
  labelId?: string;
  country: 'US' | 'CN' | 'JP' | 'EU' | 'UAE';
  category: string;
  ingredients: Array<{ name: string; percentage?: number; isAllergen?: boolean }>;
  nutritions: NutritionData;
  registrations?: { gaccCode?: string; fdaCode?: string };
  alcoholPercentage?: number;
}
```

### 응답 (JSON)
```typescript
interface ValidationResponse {
  isCompliant: boolean;
  score: number; // 0 ~ 100점
  criticalErrors: Array<{
    code: string;
    field: string;
    message: string;
    solution: string;
  }>;
  warnings: Array<{
    code: string;
    field: string;
    message: string;
  }>;
}
```

---

## 5. 실행 및 검증 기준 (Done Criteria)
1. `validateLabel(sampleData, country)` 실행 시 각 국가별 위반 케이스(예: 미국 육류 2% 초과, 중국 GACC 누락, UAE 알코올 초과)에 대해 올바른 `criticalErrors`를 반환하는 Jest 테스트 통과.
2. 컴플라이언스 통과 시 `isCompliant: true` 및 스코어 100 반환 확인.
