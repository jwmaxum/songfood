# 송영민푸드 K-Food 글로벌 마스터 라벨링 시스템 고도화 마스터 플랜 (improve.md)
> **문서 목적**: `new_label.md`에서 제시된 엔터프라이즈 상용화 요구사항과 기 완료된 Phase 1 ~ Phase 12 구축 결과를 정밀 대조하고, 미비점을 보완하여 세계 최고 수준의 글로벌 식품 라벨 컴플라이언스 플랫폼으로 완성하기 위한 **추가 개발 로드맵(Phase 13 ~ Phase 16)**을 정의합니다.

---

## 1. 현황 및 갭 분석 (Status & Gap Analysis)

### 1.1. 기 구축 완료 내역 (Phase 1 ~ Phase 12)
| 단계 | 문서 | 핵심 구현 내용 | 상태 |
|:---|:---|:---|:---:|
| **Phase 1** | [improve1.md](file:///d:/Antigravity/song_food/improve1.md) | 라벨 마스터 DB DDL, 5대국 스키마, GNB 메뉴 & 쇼케이스 UI | **완료** |
| **Phase 2** | [improve2.md](file:///d:/Antigravity/song_food/improve2.md) | 5대 권역(US/CN/JP/EU/UAE) 컴플라이언스 엔진 & Red-Flag 체커 | **완료** |
| **Phase 3** | [improve3.md](file:///d:/Antigravity/song_food/improve3.md) | 국가별 Nutrition Facts 자동 환산 Dual-Panel 변환 엔진 | **완료** |
| **Phase 4** | [improve4.md](file:///d:/Antigravity/song_food/improve4.md) | 관리자 통합 워크스페이스 (/admin/labels) & 6대 표준 블록 에디터 | **완료** |
| **Phase 5** | [improve5.md](file:///d:/Antigravity/song_food/improve5.md) | 국가별 Rule Pack 레지스트리 (JSON Rule Packs) & 자동 검증 | **완료** |
| **Phase 6** | [improve6.md](file:///d:/Antigravity/song_food/improve6.md) | 품목별 마스터 스펙시트 Export (PDF/Excel) & 인허가 번호 매핑 | **완료** |
| **Phase 7** | [improve7.md](file:///d:/Antigravity/song_food/improve7.md) | 프로덕션 레벨 E2E 무결점 검증 & 현장 운영 매뉴얼 | **완료** |
| **Phase 8** | [improve8.md](file:///d:/Antigravity/song_food/improve8.md) | 엔터프라이즈 14대 하위 도메인 엔진 & Jurisdiction Resolver 구축 | **완료** |
| **Phase 9** | [improve9.md](file:///d:/Antigravity/song_food/improve9.md) | 알레르겐 정밀 구조화(allergenSources) & Contains vs Advisory 판정 | **완료** |
| **Phase 10** | [improve10.md](file:///d:/Antigravity/song_food/improve10.md) | 클레임(Free/Low/High) 라이브러리 & 중국 GB 7718 零添加 차단기 | **완료** |
| **Phase 11** | [improve11.md](file:///d:/Antigravity/song_food/improve11.md) | GS1 Modulo-10 바코드 검증기 & 분리배출 재활용 심볼 라이브러리 | **완료** |
| **Phase 12** | [improve12.md](file:///d:/Antigravity/song_food/improve12.md) | QA/RA 감사 추적(Audit Trail), 법규 개정 알림 & 세관 리스크 예측 | **완료** |

---

### 1.2. `new_label.md` 대비 추가 구축이 필요한 4대 갭 (Gaps to Address)

`new_label.md`는 단순 체크리스트 수준을 넘어 글로벌 식품 대기업 수준의 인텔리전스 플랫폼 요구사항을 담고 있습니다. 현재 단계에서 추가 고도화가 필요한 핵심 영역은 다음과 같습니다:

1. **식품첨가물 인가 매트릭스(Additive Authorization Matrix) 부재**:
   - *new_label.md 지적*: 단순히 "E171 금지" 수준의 블랙리스트가 아닌, **"이 첨가물이 해당 식품 카테고리(만두, 소스 등)에서 허용되는가? 최대 허용한도(Max Level / ppm) 또는 Quantum Satis(적정량) 규격인가?"**를 판정하는 첨가물 인가 DB 구축 필요 (Section 7, 10, 18).
2. **원재료 인텔리전스(Ingredient Intelligence) & 원산지/공정조제 판정 한계**:
   - *new_label.md 지적*: 복합원재료(Compound Ingredients) 5% 룰 하위성분 전개 의무 판정, 가공조제(Processing Aids) / 캐리오버(Carry-over) 표시 면제 여부, 일본 가공식품 원재료 원산지 표시제(배합비 1위 원료 국가 표기 의무) 및 EU 원산지 불일치 경고 필요 (Section 3, 6, 7).
3. **라벨 인쇄 아트워크 OCR 및 비전 검사(Artwork OCR & Visual Layout) 부재**:
   - *new_label.md 지적*: 텍스트 DB 검증만으로는 실제 인쇄 시안(PDF/이미지)의 폰트 크기(EU 1.2mm x-height, 미국 1/16인치), 필수 패널 배치, 콘트라스트 및 인쇄 오타를 검증할 수 없음 (Section 14).
4. **법규 개정 시 기존 라벨 자동 일괄 재평가(Batch Re-evaluation) 및 자동 수정 패치(Auto-Fix) 미지원**:
   - *new_label.md 지적*: 새 법령이나 Rule Pack 개정 시 영향받는 전 제품 라벨을 백그라운드에서 자동 재실행(Auto Re-run)하고, 위반 항목에 대한 "원클릭 자동 수정 패치(Recommended Fix Patch)"를 생성해 승인하도록 하는 기능 필요 (Section 13, 16).

---

## 2. 추가 고도화 개발 로드맵 (Phase 13 ~ Phase 16)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 송영민푸드 글로벌 라벨링 플랫폼 엔터프라이즈 확장 로드맵     │
└─────────────────────────────────────────────────────────────────────────────┘
       │
       ├─► [Phase 13] 첨가물 인가 매트릭스 & 카테고리별 최대허용한도(Max Limit) 엔진
       │              (E-number/INS 500+ 품목, 식품유형별 사용기준 & Quantum Satis 검증)
       │
       ├─► [Phase 14] 원재료 인텔리전스 DB & 복합원재료 5% 룰 / 원산지 표시(COOL) 엔진
       │              (Sub-ingredients 자동전개, Processing Aids 면제 판정, 日 원재료 원산지제)
       │
       ├─► [Phase 15] 라벨 인쇄 아트워크 OCR 및 비전 레이아웃 검사기 (Artwork Inspector)
       │              (라벨 이미지/PDF 업로드, Tesseract/Canvas 폰트 크기 x-height 및 오타 검출)
       │
       └─► [Phase 16] 법규 개정 자동 일괄 재평가 & 원클릭 자동 수정 패치기 (Auto-Fixer)
                      (Rule 개정 시 300+ SKUs 일괄 재평가, 1-Click 라벨 데이터 교정 패치 적용)
```

---

## 3. Phase별 세부 개발 계획

### 3.1. [Phase 13] 식품 첨가물 인가 매트릭스 & 최대 허용한도(Max Level) 엔진 (`improve13.md`)
- **목표**: 5대국별 500여 개 주요 식품첨가물(보존료, 산도조절제, 착색료, 감미료, 증점제 등)의 식품 카테고리별 허용 여부 및 농도 한도 검증.
- **핵심 모듈**:
  - `src/lib/label-compliance/engines/additive-authorization-engine.ts`
  - `src/lib/label-compliance/data/additive-matrix-db.json` (Codex GSFA, US FDA 21 CFR 172-184, EU Reg 1333/2008, 중국 GB 2760, 일본 식품첨가물공전, UAE GSO 2500)
- **주요 검증 기능**:
  - 제품 식품 유형(만두, 라면, 김치, 소스 등)에 해당 첨가물이 승인되었는지(Authorized) 검증.
  - 배합비(%)를 ppm 또는 mg/kg으로 환산하여 최대 허용 농도(Max Level) 초과 여부 자동 감지.
  - Quantum Satis(적정량 사용 원칙) 대상 첨가물 여부 확인 및 기능성 명칭(Functional Class: 예 '보존료(소르빈산칼륨)') 표기 의무화 점검.
- **UI 연동**: 관리자 스튜디오 Block 3 (Info Panel / 원재료 에디터)에 첨가물 안전성 신호등 뱃지(적합/한도초과/미승인식품군) 실시간 연동.

---

### 3.2. [Phase 14] 원재료 인텔리전스 DB & 복합원재료 / 원산지 표시(COOL) 엔진 (`improve14.md`)
- **목표**: 복합원재료(소용량 소스, 혼합조미료 등) 하위 성분 전개 5% 룰 판정 및 국가별 원산지 표시 규격 자동화.
- **핵심 모듈**:
  - `src/lib/label-compliance/engines/ingredient-intelligence-engine.ts`
  - `src/lib/label-compliance/engines/country-of-origin-engine.ts`
- **주요 검증 기능**:
  - **복합원재료 5% 규정**: 완제품 중량 대비 5% 미만인 복합원재료의 경우 하위 성분 생략 허용 여부 판정 (단, 법정 알레르겐 및 식품첨가물은 5% 미만이어도 100% 필수 표기 검증).
  - **가공조제 / 캐리오버 면제**: 제조 공정 중 제거되거나 기술적 효과가 잔존하지 않는 가공조제(Processing Aid) 라벨 표기 생략 적합성 판정.
  - **일본 원재료 원산지 표시제**: 가공식품 중 중량 비율 1위 원재료의 원산지(국가명 또는 '외국산') 표시 누락 시 경고 (`JP-CRIT-PRIMARY-INGREDIENT-ORIGIN`).
  - **EU Article 26 원산지 불일치**: 완제품 원산지(예: 한국)와 주원료 원산지가 다를 경우 소비자 오인 방지 표기 의무 검증.

---

### 3.3. [Phase 15] 라벨 인쇄 아트워크 OCR 및 비전 레이아웃 검사기 (`improve15.md`)
- **목표**: 실제 제작된 인쇄용 라벨 파일(PNG, JPG, PDF)을 업로드하여 마스터 데이터 정합성 및 인쇄 활자 규격을 컴퓨터 비전으로 사전 검사.
- **핵심 모듈**:
  - `src/lib/label-compliance/vision/artwork-ocr-engine.ts`
  - `src/components/admin/labels/ArtworkInspectorModal.tsx`
- **주요 검증 기능**:
  - **OCR 텍스트 추출 & 불일치 감지**: 이미지 내 텍스트를 인식하여 DB의 제품명, 성분표, 영양성분 값과 1:1 Diff 비교 (누락된 단어, 오타 하이라이트).
  - **법정 활자 크기(Font Size / x-height) 측정**: 포장 표면적에 따른 최소 x-height(EU 1.2mm / 0.9mm, 미국 1/16 inch) 미달 영역 시각적 경고 박스 렌더링.
  - **패널 배치 적합성**: PDP(주표시면) vs Information Panel(정보표시면) 법정 필수 배치 항목 준수 여부 판정.
- **UI 연동**: 라벨 스튜디오 상단에 [📷 인쇄 시안 아트워크 검사] 버튼 배치 및 드래그앤드롭 업로드 뷰어 제공.

---

### 3.4. [Phase 16] 법규 개정 자동 일괄 재평가 & 원클릭 자동 수정 패치기 (`improve16.md`)
- **목표**: 규제 개정 시 등록된 전 제품 라벨을 백그라운드에서 일괄 재평가하고, 위반 사항을 1-Click으로 자동 교정하는 패치 시스템 구축.
- **핵심 모듈**:
  - `src/lib/label-compliance/engines/batch-reevaluation-engine.ts`
  - `src/lib/label-compliance/engines/auto-fix-engine.ts`
  - `src/components/admin/labels/AutoFixPatchModal.tsx`
- **주요 검증 기능**:
  - **일괄 재평가(Batch Auto Re-run)**: Rule Pack 업데이트(예: 1.0 -> 2.0) 또는 신규 법령 시행 시 전체 라벨 DB를 비동기 병렬 검증하여 즉시 영향 리포트 생성.
  - **원클릭 자동 수정 패치(Recommended Fix Patch)**:
    - 예 1: 중국 라벨에 `零添加` 문구 적발 시 ➔ 원클릭으로 해당 문구 삭제 및 클레임 배열 교정 패치 생성.
    - 예 2: 미국 라벨에 나트륨 단위 미병기 시 ➔ 규격 포맷 자동 적용 패치 생성.
    - 예 3: 일본 라벨 나트륨 미환산 시 ➔ `식염상당량(g)` 자동 계산 삽입 패치 생성.
  - **QA 승인 연동**: 관리자가 패치 미리보기(Diff) 확인 후 [패치 적용 및 QA 승인] 클릭 시 DB 즉각 반영.

---

## 4. 추진 일정 및 우선순위 매트릭스

| Phase | 과제명 | 비즈니스 중요도 | 개발 난이도 | 우선순위 |
|:---:|:---|:---:|:---:|:---:|
| **Phase 13** | 식품 첨가물 인가 매트릭스 & 카테고리별 최대허용한도 엔진 | **최상 (통관 직결)** | 중상 | **1순위 (즉시 착수)** |
| **Phase 14** | 원재료 인텔리전스 & 복합원재료 5% 룰 / 원산지(COOL) 엔진 | **상 (표시기준)** | 중 | **2순위** |
| **Phase 15** | 라벨 인쇄 아트워크 OCR 및 비전 레이아웃 검사기 | **상 (인쇄사고 방지)** | 상 | **3순위** |
| **Phase 16** | 법규 개정 자동 일괄 재평가 & 원클릭 자동 수정 패치기 | **최상 (유지보수 자동화)** | 중상 | **4순위** |

---

## 5. 결론 및 권고사항

현재 송영민푸드 K-Food 라벨링 시스템은 **Phase 1 ~ Phase 12를 통해 5대국 핵심 규제 검증, 영양성분 듀얼 패널, 14대 도메인 엔진, 알레르겐 정밀화, 바코드/재활용 심볼, QA 감사 추적까지 완벽하게 가동**되고 있습니다.

`new_label.md`의 비전을 완벽히 달성하기 위해, 위의 **Phase 13 (첨가물 인가 매트릭스)** ➔ **Phase 14 (원재료 인텔리전스 & 원산지)** ➔ **Phase 15 (아트워크 비전 검사)** ➔ **Phase 16 (자동 수정 패치기)** 순으로 단계별 고도화를 추진할 것을 권장합니다.
