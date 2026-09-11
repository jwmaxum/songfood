# [Phase 14] 원재료 인텔리전스 DB & 복합원재료 5% 룰 / 가공조제·캐리오버 / 원산지(COOL) 엔진 (improve14.md)

## 1. 개요 및 목적
`new_label.md` Section 3 ("Common Label Rule - Ingredients & Origin"), Section 6 ("JP-02 原材料名 & 가공식품 원재료 원산지 표시제"), Section 7 ("EU-05 Primary Ingredient Origin & Article 26 Mismatch"), Section 10 ("Ingredient Intelligence Engine")의 요구사항에 따라, **복합원재료(Compound Ingredients) 하위 성분 전개 5% 룰**, **가공조제(Processing Aids) 및 캐리오버(Carry-over) 첨가물 표시 면제 판정**, **일본 CAA 가공식품 원재료 원산지 표시제(배합비 1위 원료 국가 표기 의무)** 및 **EU/미국 원산지 표시(COOL) 정합성 검증 엔진**을 구축합니다.

---

## 2. 세부 구현 과제

### 2.1. 원재료 인텔리전스 데이터 구조체 및 정밀 모델링 (`ingredient-intelligence.ts`)
- 원재료의 다국어 표준 명칭, 원산지(originCountry), 복합원재료 여부(`isCompound`), 하위 성분 배열(`subIngredients`), 가공조제 여부(`isProcessingAid`), 캐리오버 여부(`isCarryOver`), 동물성 유래(`animalOrigin`) 등을 포함하는 구조체 구축.
- 필드 정의:
  ```ts
  export interface SubIngredientItem {
    nameKo: string;
    nameEn: string;
    ratioInCompound: number; // 복합원재료 내 배합비 (%)
    isAllergen: boolean;
    allergenCategory?: string;
    insOrENumber?: string;
  }

  export interface IntelligentIngredient {
    ingredientNameKo: string;
    ingredientNameTarget: string;
    ratio: number; // 완제품 대비 배합비 (%)
    originCountry?: string; // 예: "KR", "US", "CN", "국산", "외국산"
    isCompound?: boolean; // 복합원재료 여부 (예: 불고기양념장, 혼합간장 등)
    subIngredients?: SubIngredientItem[]; // 하위 구성 성분
    isProcessingAid?: boolean; // 가공조제 여부
    isCarryOver?: boolean; // 캐리오버 첨가물 여부
    isAllergen?: boolean;
    insOrENumber?: string;
  }
  ```

### 2.2. 복합원재료(Compound Ingredients) 5% 룰 판정 로직
- **글로벌 5% 룰 (Codex / EU FIC / 한국 / 일본 공통)**:
  - 복합원재료의 완제품 내 배합비가 **5% 이상**인 경우 ➔ 하위 성분(Sub-ingredients) 전개 표기 의무화 (누락 시 `COMMON-CRIT-COMPOUND-SUB-INGREDIENT-MISSING` 차단).
  - 복합원재료의 배합비가 **5% 미만**인 경우 ➔ 복합원재료 명칭 단독 표기 허용 (성분 전개 생략 가능).
  - **예외적 의무 규정 (Strict Exception)**: 복합원재료가 5% 미만이더라도, 하위 성분에 **법정 알레르겐** 또는 **기술적 기능을 수행하는 식품첨가물**이 포함된 경우 생략 불가 및 필수 전개 표기 강제 (`COMMON-CRIT-COMPOUND-ALLERGEN-SUB-MANDATORY`).

### 2.3. 가공조제(Processing Aids) 및 캐리오버(Carry-over) 라벨 면제 판정
- 완제품에서 기술적 효과가 잔존하지 않고 제조 공정상 불가피하게 이행된 캐리오버(Carry-over) 성분 또는 공정 중 제거/불활성화된 가공조제는 라벨 표기 면제 판정.
- 단, 가공조제가 법정 알레르겐(예: 난백 단백질 여과제, 밀 유래 효소제 등) 유래인 경우 알레르겐 고지 의무는 면제되지 않음 (`COMMON-CRIT-PROCESSING-AID-ALLERGEN-EXPOSURE`).

### 2.4. 일본 가공식품 원재료 원산지 표시제 엔진 (`JP-COOL`)
- 일본 소비자청(CAA) 식품표시법 제3조 및 가공식품 원재료 원산지 표시제(2022년 전면 시행):
  - 완제품을 구성하는 모든 원재료 중 **배합비(%) 1위인 주원재료(Primary Ingredient)**는 반드시 **원산지(국가명 또는 '국산', '외국산')**를 원재료명 바로 옆 괄호에 표기해야 함.
  - 1위 원재료에 원산지 표기가 누락된 경우 즉시 일본 세관/소비자청 위반 차단 (`JP-CRIT-PRIMARY-INGREDIENT-ORIGIN-MISSING`).
  - 예: `돼지고기(한국산)` 또는 `Pork (Product of Korea)`.

### 2.5. EU / 미국 원산지 표시(COOL - Country of Origin Labeling) 엔진
- **EU FIC 1169/2011 Article 26(3)**:
  - 완제품 원산지 표시(예: "Made in Korea")와 주원재료(Primary Ingredient, 배합비 50% 이상 또는 제품명에 강조된 원료)의 원산지가 상이한 경우, 주원재료의 실제 원산지 또는 "주원재료는 한국산이 아님"을 병기하도록 경고 (`EU-WARN-PRIMARY-INGREDIENT-ORIGIN-MISMATCH`).
- **미국 Tariff Act 19 U.S.C. 1304**:
  - 주표시면(PDP) 또는 정보표시면 하단에 "Product of Korea" 원산지 마킹 필수 검증.

### 2.6. 관리자 스튜디오 Block 3 (Info Panel / 원재료 에디터) 및 14대 엔진 통합
- 원재료 행마다 [복합원재료 여부], [하위성분 전개 에디터], [원산지 국가 드롭다운] UI 제공.
- 일본/EU/미국 시장 선택 시 1위 원재료 원산지 미입력 실시간 경고 배너 및 자동 완성 가이드 제공.
- 14대 도메인 엔진 파이프라인(`domain-engines.ts` Engine 3 & Engine 10)에 전면 결합.

---

## 3. 완료 기준 (Done Criteria)
1. `src/lib/label-compliance/engines/ingredient-intelligence-engine.ts` 구현.
2. 단위 테스트 `src/__tests__/ingredient-intelligence-engine.test.ts` 작성 (10개 이상 테스트 케이스 100% 통과).
3. `BlockInfoPanelEditor.tsx` 원산지 및 복합원재료 하위성분 UI 연동.
4. `npm test` 전체 21개 테스트 스위트 150개 이상 테스트 100% 통과.
5. `npx tsc --noEmit` 무결점 및 `npm run build` 정적 빌드 성공.
6. Git commit 및 GitHub push 완료.
