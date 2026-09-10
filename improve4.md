# [Phase 4] 관리자 라벨링 통합 워크스페이스 UI (/admin/labels) 및 6대 블록 편집기 (improve4.md)

## 1. 개요 및 목적
관리자가 송영민푸드의 300여 개 K-Food 품목을 조회하고, 특정 품목을 선택하여 5대 권역(미국, 중국, 일본, EU, UAE)별 라벨 데이터를 직관적으로 편집·검증·승인할 수 있는 **관리자 백오피스 라벨링 스튜디오(`/admin/labels`)**를 구축합니다.

---

## 2. 관리자 라우트 및 페이지 구조

```
src/app/admin/labels/
├── layout.tsx                     # 라벨 관리자 서브 레이아웃
├── page.tsx                       # 품목별 5대국 라벨 현황 대시보드 & 목록
└── [productId]/
    └── page.tsx                   # 6대 블록 인터랙티브 라벨 에디터 & 실시간 프리뷰
```

---

## 3. UI 화면 구성 및 기능 명세

### 3.1. 라벨 관리 대시보드 (`/admin/labels`)
1. **상단 KPI 통계 카드**:
   - 총 등록 품목 수 (예: 320개)
   - 국가별 적합(Compliant) 라벨 수 / 미작성(Draft) 수 / 경고(Red-Flag) 수
2. **필터 및 검색 바**:
   - 품목 카테고리 필터 (K-만두, K-라면, K-소스, K-음료, K-주류)
   - 수출 대상국 필터 (ALL, US, CN, JP, EU, UAE)
   - 컴플라이언스 상태 필터 (전체, 적합, 검토필요, 위반)
   - 품목명 / SKU / 영문명 실시간 검색
3. **품목 데이터 테이블**:
   - 썸네일 이미지, 한국어 상품명, 영문 상품명, HS Code
   - 5개 국가별 뱃지 (`US: [Compliant]`, `CN: [Warning]`, `JP: [Draft]`, `EU: [Compliant]`, `UAE: [Review]`)
   - [라벨 편집(Edit Studio)] 및 [스펙시트 내보내기(Export)] 버튼

### 3.2. 라벨 에디터 스튜디오 (`/admin/labels/[productId]`)
화면을 좌측(6대 블록 입력 폼)과 우측(실시간 패키지 라벨 프리뷰 & Red-Flag 감지기)의 2단 Split 레이아웃으로 구성합니다.

```
┌────────────────────────────────────────┬────────────────────────────────────────┐
│ 1. 상단 글로벌 바: 품목명 | 5개국 선택 탭 [US | CN | JP | EU | UAE] | 저장 | 승인│
├────────────────────────────────────────┼────────────────────────────────────────┤
│ [좌측: 6대 블록 에디터 폼]             │ [우측: 실시간 라벨 그래픽 프리뷰]       │
│                                        │                                        │
│ ▼ Block 1: Header (기본 식별 정보)     │ ┌────────────────────────────────────┐ │
│   - HS Code, 현지어 제품명, 법적 식품유형│ │  [PDP 전면 라벨 실물 렌더링]       │ │
│ ▼ Block 2: PDP (전면 주표시면)         │ ├────────────────────────────────────┤ │
│   - 순중량(g/oz), 클레임 뱃지(Halal 등)│ │  [Information & Nutrition Panel]   │ │
│ ▼ Block 3: Information Panel (정보표시)│ │  [미국 FDA Nutrition Facts Box]    │ │
│   - 원재료 배합비 내림차순, 알레르겐 박스│ ├────────────────────────────────────┤ │
│   - 보관방법, 제조원/수입자(Buyer to Fill)│ │  [Dating & GS1 Barcode]            │ │
│ ▼ Block 4: Nutrition Panel (영양성분)  │ └────────────────────────────────────┘ │
│   - 1회 제공량 및 성분 입력/자동 계산  │                                        │
│ ▼ Block 5: Dating & Lot (일자/로트)   │ ⚠️ [실시간 Red-Flag 알림 패널]         │
│   - 국가별 날짜 포맷 드롭다운 선택기   │ - [CRITICAL] 9대 알레르겐 박스 누락    │
│ ▼ Block 6: Barcode & Marking (바코드)  │ - [WARNING] 미국향 oz 단위 병기 권장   │
│   - EAN-13/UPC-A 번호, 분리배출 심볼  │ [원클릭 자동 수정(Auto-Fix) 버튼]      │
└────────────────────────────────────────┴────────────────────────────────────────┘
```

---

## 4. 컴포넌트 구조 (`src/components/admin/labels/`)

1. **`LabelDashboardTable.tsx`**: 300여 품목 목록 및 5개국 컴플라이언스 현황 그리드.
2. **`CountryTabSelector.tsx`**: 국가별 탭 전환 및 현재 선택 국가 규제 배지 노출.
3. **`BlockHeaderEditor.tsx`**: HS Code, 공식 명칭, 카테고리 입력기.
4. **`BlockPdpEditor.tsx`**: 전면 중량, 영문/현지어 카피, 소구 포인트 태그 선택기.
5. **`BlockInfoPanelEditor.tsx`**: 원재료 DnD 배합비 정렬, 알레르겐 태깅, 보관조건.
6. **`BlockNutritionEditor.tsx`**: 100g ➔ 1회 제공량 자동 환산기 연동.
7. **`BlockDatingEditor.tsx`**: 국가별 유통기한/상미기한 표기 규칙 선택기.
8. **`BlockBarcodeEditor.tsx`**: 바코드 생성기 및 인증 마크 셀렉터.
9. **`LiveLabelPreview.tsx`**: 대상국 인쇄 표준 비율 패키지 시각화 뷰어.
10. **`ComplianceAlertBox.tsx`**: 실시간 위반 항목 경고 및 해결 가이드 제안 모달.

---

## 5. 실행 및 검증 기준 (Done Criteria)
1. `/admin/layout.tsx` 사이드바 내비게이션에 "🏷️ K-Food 수출 라벨링 시스템" 링크 정상 추가.
2. `/admin/labels` 페이지에서 기존 `products` 데이터와 연동되어 목록 로딩 및 국가 탭 전환 동작 확인.
3. `/admin/labels/[productId]` 에디터에서 원재료나 영양성분 변경 시 우측 프리뷰 및 Red-Flag 검증이 실시간 동기화되는지 확인.
