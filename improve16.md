# 송영민푸드 법규 개정 자동 일괄 재평가 & 원클릭 자동 수정 패치기 명세서 (improve16.md)

## 1. 개요 (Overview)
- **목적**: 전 세계 식품 법규 개정(예: 중국 GB 7718-2025 개정, 일본 캐슈넛 의무 승격, 미국 FASTER Act 참깨 의무화 등)이나 시스템 내 Rule Pack 버전 업데이트 시, 등록된 모든 제품 및 국가별 라벨을 **원클릭으로 일괄 자동 재평가(Batch Auto Re-run)**하고, 발견된 위반 결함에 대해 사람이 일일이 고치지 않고도 안전하게 교정할 수 있는 **원클릭 자동 수정 패치기(Auto-Fix Patch Engine)** 구축.
- **배경**:
  - 수백 개 SKU와 5개국(US, CN, JP, EU, UAE) 라벨을 운영할 때, 규정 개정 하나만으로도 수십 개 라벨이 동시에 부적합 상태로 전환됨.
  - 이를 일일이 수동 검색/수정하면 누락 위험 및 막대한 인건비 발생.
  - `new_label.md` Section 13, 16 "법규 개정 시 기존 라벨 자동 일괄 재평가 및 자동 수정 패치" 요구사항 100% 충족.

---

## 2. 핵심 아키텍처 및 구현 컴포넌트

### 2.1. 일괄 자동 재평가 엔진 (`batch-reevaluation-engine.ts`)
- **경로**: `src/lib/label-compliance/engines/batch-reevaluation-engine.ts`
- **핵심 기능**:
  - `runBatchReevaluation(labels: FoodLabel[], options?)`:
    - 수백 개의 라벨 배열을 비동기 병렬 검증 실행.
    - 기존 상태가 'compliant'였으나 새로운 법령/규칙으로 인해 위반이 발생한 영향도 분석(Impact Analysis).
    - 국가별 위반 분포, 신규 발생 Red-Flag 통계, 통관 리스크 등급 집계 리포트(`BatchEvaluationReport`) 반환.

### 2.2. 원클릭 자동 수정 패치 엔진 (`auto-fix-engine.ts`)
- **경로**: `src/lib/label-compliance/engines/auto-fix-engine.ts`
- **핵심 기능**:
  - `generateAutoFixPatch(label: FoodLabel, redFlags: RedFlagItem[])`:
    - RedFlagItem의 위반 코드를 정밀 분석하여, 기계적으로 안전하게 자동 수정 가능한 Diff 패치 목록(`LabelPatchDiff[]`) 생성.
    - **지원하는 핵심 자동 보정 규칙**:
      1. 🇨🇳 **중국 GB 7718-2025 불법 마케팅 문구**: `零添加`, `不添加`, `Zero Additive` 감지 시 PDP 클레임 및 원재료 문구에서 자동 제거.
      2. 🇯🇵 **일본 식염상당량(g) 미환산**: 나트륨(mg) 기반으로 `식염상당량(g) = Na × 2.54 ÷ 1000` 자동 계산 후 nutrition 데이터 주입.
      3. 🇺🇸 **미국 FDA Added Sugars / Vitamin D / Potassium 누락**: 표준 0 값 및 포맷 자동 채움, CONTAINS 알레르겐 박스 대문자 정규화.
      4. 🇪🇺 **EU 에너지 kJ 누락**: `1 kcal = 4.184 kJ` 정밀 자동 환산 병기.
      5. 🇦🇪 **UAE 날짜 포맷**: YYYY/MM/DD ➔ DD/MM/YYYY 표준 포맷 자동 변환.
      6. **원산지(COOL) 마킹 누락**: 미국 "Product of Korea" 권고 문구 자동 삽입.
  - `applyPatchToLabel(label: FoodLabel, patch: LabelPatchDiff)`:
    - 패치를 안전하게 적용하여 새로운 FoodLabel 객체 반환 (불변성 유지).

### 2.3. 관리자 스튜디오 자동 수정 패치 모달 (`AutoFixPatchModal.tsx`)
- **경로**: `src/components/admin/labels/AutoFixPatchModal.tsx`
- **UI 구성**:
  - 위반 항목별 생성된 패치 목록 및 Before vs After Diff 시각화.
  - 개별 패치 선택/해제 토글.
  - `[⚡ 선택한 패치 일괄 적용 & QA 승인]` 원클릭 적용.
  - 적용 완료 시 감사 로그(Audit Trail)에 기록 연동.

### 2.4. 라벨 워크스페이스 연동
- [LabelStudioClient.tsx](file:///d:/Antigravity/song_food/src/components/admin/labels/LabelStudioClient.tsx)의 `ComplianceAlertBox` 및 상단 바에 `[⚡ 원클릭 자동 수정 패치]` 버튼 연동.
- 관리자 라벨 목록 또는 감사 페이지에 `[규제 개정 전체 라벨 일괄 재평가]` 트리거 기능 제공.

---

## 3. 검증 계획 (Verification Plan)
1. **단위 테스트 (`src/__tests__/auto-fix-batch-engine.test.ts`)**:
   - 중국 零添加 자동 제거 패치 검증
   - 일본 식염상당량(g) 자동 계산 주입 패치 검증
   - EU 에너지 kJ 자동 환산 병기 패치 검증
   - 미국 CONTAINS 대문자 정규화 패치 검증
   - 전체 라벨 DB 일괄 재평가(Batch Re-evaluation) 리포트 집계 검증
2. **TypeScript 무결성 검증**: `npx tsc --noEmit` 에러 0건.
3. **Jest 전체 스위트 검증**: `npm test` 23개 테스트 스위트 100% PASS.
4. **Next.js 프로덕션 빌드 검증**: `npm run build` 정적 라우트 빌드 성공.
5. **형상 관리**: `walkthrough.md` 갱신 및 GitHub push.
