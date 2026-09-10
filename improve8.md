# [Phase 8] 엔터프라이즈 14대 하위 컴플라이언스 엔진 통합 아키텍처 및 Jurisdiction Resolver 구축 (improve8.md)

## 1. 개요 및 목적
`supabase/new_label.md`의 아키텍처 분석 결과를 바탕으로, 단순 국가별 조건문 처리를 탈피하고 글로벌 식품 대기업 수준의 **엔터프라이즈 14대 하위 엔진 구조**와 **Jurisdiction Resolver(관할 규제기관 자동 판정기)**를 구축합니다.

---

## 2. 핵심 아키텍처 파이프라인

```
          ┌─────────────────────────────────────────┐
          │             Product Profile             │
          │ (제품명 / 배합비 / 포장 / 타깃수출국)   │
          └────────────────────┬────────────────────┘
                               ↓
          ┌─────────────────────────────────────────┐
          │      1. Jurisdiction Resolver Engine     │
          │ - 육류 2% 경계선 판정: FDA vs USDA-FSIS │
          │ - 중국 수입품목 분류: GACC 18자리 여부  │
          │ - EU/UAE 샤리아/할랄 법령 적용 여부     │
          └────────────────────┬────────────────────┘
                               ↓
          ┌─────────────────────────────────────────┐
          │     2. Regulatory Rule Pack Registry    │
          │ (최신 법령 버전, 시행일, 조항 매핑)     │
          └────────────────────┬────────────────────┘
                               ↓
 ┌─────────────────────────────────────────────────────────────┐
 │                14대 특화 도메인 하위 검증 엔진              │
 │ 1. Product Scope Engine        2. Identity & Name Engine    │
 │ 3. Ingredient & Compound Engine 4. Allergen Sources Engine   │
 │ 5. Nutrition Facts Engine      6. Claim & Marketing Engine  │
 │ 7. Date Marking Engine         8. Storage & Shelf-Life      │
 │ 9. Operator & Importer Engine  10. Origin & Traceability    │
 │ 11. Multilingual Language      12. Additive & E-Number      │
 │ 13. Net Quantity & Font (x-ht) 14. Barcode & Marking        │
 └─────────────────────────────┬───────────────────────────────┘
                               ↓
          ┌─────────────────────────────────────────┐
          │       Compliance Decision Engine        │
          │ (CRITICAL / WARNING / PASS 판정)        │
          │ - Rule ID + 근거 법령(Article/Section)  │
          │ - 왜 문제인가(Why) + 구체적 수정법(How) │
          └─────────────────────────────────────────┘
```

---

## 3. 세부 구현 과제

### 3.1. Jurisdiction Resolver (`src/lib/label-compliance/jurisdiction-resolver.ts`)
- **제품 카테고리 20종 정밀 Scope 판정**:
  - 일반가공, 육류, 가금류, 수산물, 유제품, 음료, 주류, 건강기능, 냉동식품, 즉석섭취(RTE), 유기농, 할랄, 비건 등.
- **기관 관할 경계선 자동 라우팅**:
  - 미국: 육류 배합비 2.0% 이상 시 자동으로 FDA ➔ USDA-FSIS 인허가 체크리스트로 전환.
  - 중국: 해관총서령 제248호 18개 중점관리품목 여부에 따른 GACC 사전 인허가 필수 라우팅.

### 3.2. QUID (정량적 원재료 표시) 엔진 (`src/lib/label-compliance/engines/quid-engine.ts`)
- EU FIC 1169/2011 Article 22 규정 준수:
  - 제품명에 원재료명이 등장하거나('Pork Mandu'), 패키지에 특정 성분이 강조/이미지화된 경우 해당 원재료의 백분율(%) 표기 의무화 및 자동 누락 감지.

### 3.3. 첨가물 및 E-Number 유전독성 차단 엔진 (`src/lib/label-compliance/engines/additive-engine.ts`)
- EC Regulation 2022/63 (이산화티타늄 E171 금지), 타르색소 및 보존료 국가별 허용 한도 라이브러리 검증.

### 3.4. 순중량 및 최소 폰트 크기(x-height) 엔진 (`src/lib/label-compliance/engines/net-quantity-engine.ts`)
- 라벨 표면적(80cm²)에 따른 x-height 1.2mm vs 0.9mm 법정 가독성 충족 판정.

---

## 4. 완료 기준 (Done Criteria)
1. `jurisdiction-resolver.ts` 단위 테스트 작성 및 통과 (육류 2% 경계선, 음료/주류 관할 자동 분기).
2. 14대 도메인 엔진 인터페이스 정립 및 `validateLabel` 통합 실행 파이프라인 연동.
3. 검증 결과에 `ruleId`, `article`, `whyProblem`, `howToFix`, `sourceUrl`이 100% 구조화되어 반환되는지 확인.
