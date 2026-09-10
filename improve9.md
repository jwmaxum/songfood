# [Phase 9] 글로벌 알레르겐 정밀 구조화 엔진 (allergenSources 모델 & Contains vs Advisory 판정기) (improve9.md)

## 1. 개요 및 목적
`supabase/new_label.md`의 핵심 지침에 따라, 기존의 단순 boolean 플래그(`isAllergen: true/false`) 방식을 전면 폐기하고, 수입국 규제기관의 법정 요구사항에 부합하는 **정밀 구조화 알레르겐 소스 모델(`allergenSources`)**과 **법정 선언(Contains) vs 교차오염 주의환기(Advisory/May Contain) 엄격 분리 판정기**를 구축합니다.

---

## 2. 알레르겐 정밀 구조화 데이터 모델 (`src/types/allergen.ts`)

```typescript
export interface AllergenSourceItem {
  jurisdiction: 'US' | 'CN' | 'JP' | 'EU' | 'UAE';
  allergenKey: string;             // 예: 'WHEAT', 'SESAME', 'CRUSTACEAN'
  sourceIngredientName: string;    // 원천 원재료명 (예: '소맥분', '탈지대두')
  specificSpeciesRequired?: boolean; // 견과류/어류/갑각류 구체 수종 명시 필요 여부
  speciesNameEn?: string;          // 예: 'Almond', 'Atlantic Salmon', 'Crab'
  declarationRequired: boolean;    // 법정 의무 표기 대상 여부
  emphasisType: 'CONTAINS_BOX' | 'BOLD_IN_LIST' | 'SPECIFIC_RAW_MATERIAL';
}
```

---

## 3. 핵심 판정 로직 및 세부 규제 엔진

### 3.1. 견과류, 어류, 갑각류 구체 어종/수종 특정 검증 (FDA 21 CFR 101.4 / EU FIC)
- 단순 "Nuts", "Fish", "Shellfish" 표기는 미국 FDA 및 EU 통관 시 즉각 보류 대상.
- Tree Nut의 경우 정확한 수종(예: `Walnut`, `Almond`, `Cashew`, `Pecan`) 명시 검증.
- 어류 및 갑각류의 경우 구체 품종(예: `Pollock`, `Shrimp`, `Blue Crab`) 명시 여부 교차 검증.

### 3.2. 법정 선언(`CONTAINS:`) vs 교차오염 주의문구(`MAY CONTAIN`) 불법 대체 차단기
- FDA 및 EU 가이드라인: "제조시설 교차오염 주의문구(`May contain`)는 배합 원료에 포함된 법정 의무 알레르겐 선언(`CONTAINS:`)을 대체할 수 없다."
- 원재료 목록에 참깨/대두가 포함되어 있는데 `CONTAINS:`에는 누락하고 `May contain sesame`로 기재한 위장 라벨링을 Red-Flag로 즉시 적발.

### 3.3. 일본 소비자청 2025 개정 반영
- 8대 특정원재료(새우, 게, 호두, 밀, 메밀, 알, 우유, 땅콩) 고정 관리.
- 2025년 특정원재료 의무군으로 승격된 **캐슈넛(カシューナッツ)**의 준특정원재료 ➔ 법정 의무 원재료 승격 검증.
- "들어 있을지도 모름" 등 추정성 문구 원천 차단.

---

## 4. 완료 기준 (Done Criteria)
1. `src/lib/label-compliance/engines/allergen-source-engine.ts` 구현.
2. 5대국별 알레르겐 소스 추출 및 불법 Advisory 대체 시뮬레이션 Jest 테스트 100% 통과.
3. 관리자 라벨 에디터의 Block 3 (Info Panel)과 알레르겐 소스 모델 연동 완료.
