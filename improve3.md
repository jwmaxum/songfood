# [Phase 3] 영양성분 자동 산출 및 국가별 Nutrition Facts 변환 엔진 (improve3.md)

## 1. 개요 및 목적
식품의 기본 영양성분 데이터(100g 또는 제품 1팩 기준)를 입력받아, 미국 FDA 2016 규격, 중국 NRV%, 일본 소비자청 고정순서, EU kJ/kcal 듀얼 표기, UAE 신호등 라벨 등 5대 권역의 법정 서식에 맞게 **자동 단위 변환, 일일 권장량(DV%/NRV%) 산출 및 반응형 그래픽 Nutrition Facts 패널**을 실시간 생성하는 엔진을 구축합니다.

---

## 2. 권역별 영양성분 산출 및 환산 규칙

### 2.1. 미국 (US FDA 2016 Nutrition Facts)
- **1회 제공량 (RACC - Reference Amounts Customarily Consumed)**:
  - 예: 만두류 약 85~115g, 라면 1봉지(120g)를 1회 제공량으로 환산.
- **필수 영양소 표기 순서**:
  - `Calories` (대형 굵은 폰트)
  - `Total Fat` (% DV) ➔ `Saturated Fat` (% DV) ➔ `Trans Fat` (g만 표기)
  - `Cholesterol` (% DV)
  - `Sodium` (% DV)
  - `Total Carbohydrate` (% DV) ➔ `Dietary Fiber` (% DV) ➔ `Total Sugars` (g만) ➔ `Includes [X]g Added Sugars` (% DV)
  - `Protein` (g)
  - 필수 미량 영양소: `Vitamin D` (mcg, % DV), `Calcium` (mg, % DV), `Iron` (mg, % DV), `Potassium` (mg, % DV)
- **미국 일일 권장량(Daily Value - DV)**:
  - 지방 78g, 포화지방 20g, 콜레스테롤 300mg, 나트륨 2,300mg, 탄수화물 275g, 식이섬유 28g, 첨가당 50g, 단백질 50g, 비타민D 20mcg, 칼슘 1,300mg, 철분 18mg, 칼륨 4,700mg.

### 2.2. 중국 (GB 28050 영양소 기준치 NRV%)
- **100g(ml) 또는 1회 제공량당 의무 5대 지표**:
  - 에너지(kJ), 단백질(g), 지방(g), 탄수화물(g), 나트륨(mg) 및 각각의 NRV% 표기 필수.
- **중국 일일 권장량(NRV)**:
  - 에너지 8,400kJ, 단백질 60g, 지방 ≤60g, 탄수화물 300g, 나트륨 2,000mg.
  - 에너지 환산: `1 kcal = 4.184 kJ`.

### 2.3. 일본 (소비자청 영양표시 기준)
- **의무 표기 5개 항목 순서 보장**:
  1. 열량(エネルギー): kcal
  2. 단백질(たんぱく質): g
  3. 지질(脂質): g
  4. 탄수화물(炭水化物): g (당질/식이섬유 세부 분리 가능)
  5. 식염상당량(食塩相当量): g
- **식염상당량 자동 환산 공식**:
  $$\text{식염상당량(g)} = \frac{\text{나트륨(mg)} \times 2.54}{1000}$$

### 2.4. EU (Regulation No 1169/2011)
- **100g(100ml) 기준 기본 표기 필수**:
  - `Energy`: kJ 및 kcal 듀얼 동시 표기
  - `Fat`: Total fat (g) / of which `saturates` (g)
  - `Carbohydrate`: Total carbohydrate (g) / of which `sugars` (g)
  - `Protein`: g
  - `Salt`: g (나트륨이 아닌 식염상당량 표기 의무)
- **참고 섭취량(RI - Reference Intake)**: 에너지 8,400 kJ / 2,000 kcal, 염분 6g.

### 2.5. UAE / GSO 신호등 라벨 (Traffic Light Labelling)
- 100g당 함량에 따라 3단계 색상 태그 자동 부여:
  - **지방**: 녹색(≤3.0g) / 노랑(3.1~17.5g) / 빨강(>17.5g)
  - **포화지방**: 녹색(≤1.5g) / 노랑(1.6~5.0g) / 빨강(>5.0g)
  - **당류**: 녹색(≤5.0g) / 노랑(5.1~22.5g) / 빨강(>22.5g)
  - **염분**: 녹색(≤0.3g) / 노랑(0.3~1.5g) / 빨강(>1.5g)

---

## 3. 영양성분 계산 모듈 (`src/lib/nutrition-calculator/`)

```typescript
export interface BaseNutritionInput {
  baseWeightG: number; // 기준 중량 (예: 100g)
  servingSizeG: number; // 1회 제공량 (예: 120g)
  servingsPerContainer: number;
  caloriesKcal: number;
  totalFatG: number;
  saturatedFatG: number;
  transFatG?: number;
  cholesterolMg?: number;
  sodiumMg: number;
  totalCarbG: number;
  dietaryFiberG?: number;
  totalSugarsG: number;
  addedSugarsG?: number;
  proteinG: number;
  vitaminDMcg?: number;
  calciumMg?: number;
  ironMg?: number;
  potassiumMg?: number;
}
```

- **자동 환산 함수**:
  - `calculatePerServing(input: BaseNutritionInput)`
  - `calculatePer100g(input: BaseNutritionInput)`
  - `calculateUSDV(servingValues: NutritionValues)`
  - `calculateChinaNRV(per100gValues: NutritionValues)`
  - `calculateJapanNutrition(perServingValues: NutritionValues)`
  - `calculateEUNutrition(per100gValues: NutritionValues)`
  - `calculateUAETrafficLight(per100gValues: NutritionValues)`

---

## 4. UI 렌더링 컴포넌트 (`src/components/labels/nutrition/`)

1. **`USNutritionFactsPanel.tsx`**: 미 FDA 표준 블랙&화이트 볼드 보더 박스 렌더러.
2. **`ChinaNutritionTable.tsx`**: GB 28050 표준 그리드 테이블 렌더러 (항목, 100g당, NRV%).
3. **`JapanNutritionList.tsx`**: 일본 소비자청 표준 심플 박스 렌더러.
4. **`EUNutritionTable.tsx`**: EU 1169/2011 표준 표 (kJ/kcal 병기).
5. **`UAETrafficLightPanel.tsx`**: 녹색/노란색/빨간색 배지가 포함된 중동형 라벨 렌더러.
6. **`DualNutritionBox.tsx`**: 미국형 + EU/국제형을 좌우 또는 상하로 결합 배치하는 듀얼 모드.

---

## 5. 실행 및 검증 기준 (Done Criteria)
1. 기본 100g 영양 데이터 입력 시 미국 FDA 포맷, 중국 NRV%, 일본 순서, EU kJ/kcal, UAE 신호등 색상이 오차 없이 실시간 자동 계산되는 단위 테스트 통과.
2. 컴포넌트 렌더링 시 FDA 폰트 위계(굵은 헤더, 들여쓰기) 및 국가별 표준 룩앤필이 완벽하게 시각화되는지 브라우저에서 검증.
