# [Phase 6] 바이어 제시용 표준 라벨 스펙시트 생성 및 인쇄/PDF/엑셀 내보내기 (improve6.md)

## 1. 개요 및 목적
해외 바이어(미국, 중국, 일본, 유럽, 중동)에게 제품 제안서 및 수출 통관 서류로 전달할 수 있는 **공식 Master Labeling Spec Sheet**를 규격화하여, 화면 인터랙티브 뷰어는 물론 A4 출력, 벡터 PDF 다운로드, 엑셀 일괄 내보내기(Bulk Export/Import)가 가능한 패키징 자동화 시스템을 구축합니다.

---

## 2. 바이어 스펙시트 표준 레이아웃 사양 (A4 최적화)

```
===================================================================================
                SONG YOUNGMING FOOD - MASTER LABELING SPECIFICATION
===================================================================================
[1. PRODUCT HEADER]
Product Code : SF-DM-001             Target Region : UNITED STATES (FDA Compliant)
Product Name : 송영민 K-비비고 왕교자 만두  HS Code       : 1902.20.0000
English Name : Premium Vegetable & Seafood Dumplings (Pork-Free)

-----------------------------------------------------------------------------------
[2. PDP (Principal Display Panel) PREVIEW]
+---------------------------------------------------------------------------------+
|   [LOGO] SONG YOUNGMIN FOOD                                                     |
|                                                                                 |
|   PREMIUM VEGETABLE & SEAFOOD DUMPLINGS                                         |
|   Authentic Korean Recipe | Crispy & Juicy                                      |
|                                                                                 |
|   NET WT. 16.9 OZ (1.05 LBS) 480g                                               |
|   [BADGES: NON-GMO | HALAL CERTIFIED | NO ADDED MSG]                            |
+---------------------------------------------------------------------------------+

-----------------------------------------------------------------------------------
[3. INFORMATION PANEL & NUTRITION FACTS (DUAL COLUMNS)]
LEFT: Information Panel                 | RIGHT: Nutrition Facts (US FDA 2016)
----------------------------------------|------------------------------------------
INGREDIENTS:                            | Nutrition Facts
Dough (Wheat flour, Water, Modified     | 4 servings per container
Tapioca Starch, Salt), Filling (Cabbage,| Serving size: 4 pieces (120g)
Tofu [Soybeans, Water, Magnesium        | -----------------------------------------
Chloride], Shrimp [Crustacean], Green   | Amount per serving
Onion, Leek, Onion, Sesame Oil, Sugar,  | Calories                      220
Garlic, Ginger, Black Pepper).          | -----------------------------------------
                                        |                             % Daily Value*
CONTAINS: WHEAT, SOYBEANS, CRUSTACEAN   | Total Fat 6g                            8%
SHELLFISH (SHRIMP), SESAME.             |   Saturated Fat 1g                      5%
                                        |   Trans Fat 0g
STORAGE INSTRUCTIONS:                   | Cholesterol 15mg                        5%
Keep frozen at 0°F (-18°C) or colder.   | Sodium 460mg                           20%
Do not refreeze once thawed.            | Total Carbohydrate 32g                 12%
                                        |   Dietary Fiber 2g                      7%
MANUFACTURED BY:                        |   Total Sugars 3g
Song Youngmin Food Co., Ltd.            |     Includes 1g Added Sugars            2%
123 K-Food Way, Seoul, Korea            | Protein 9g                             18%
FDA FCE No: 192837465                   | -----------------------------------------
                                        | Vitamin D 0mcg 0%  •  Calcium 40mg 4%
IMPORTER / DISTRIBUTOR:                 | Iron 1.8mg 10%     •  Potassium 180mg 4%
[ BUYER TO FILL ]                       |
Address: [ BUYER TO FILL ]              |
Contact: [ BUYER TO FILL ]              |

-----------------------------------------------------------------------------------
[4. DATING, BARCODE & PACKAGING]
Date Format : Best If Used By: MM/DD/YYYY (Printed on bottom seam)
Shelf Life  : 12 Months from production date
Barcode     : 8 809123 456789 (UPC-A / EAN-13)
Material    : Polypropylene (PP), Recycle Class 5
===================================================================================
```

---

## 3. 핵심 구현 기능

### 3.1. 인터랙티브 바이어 뷰어 (`/labels/[id]/view` or `/admin/labels/[id]/spec`)
- 바이어에게 링크를 공유하여 웹에서 즉각 열람 가능한 반응형 뷰어.
- **Buyer to Fill 폼 필드**: 수입자(바이어)가 자사의 회사명, 현지 통관 라이선스 번호, 유통 주소를 직접 웹에서 입력하여 본인 회사 맞춤형 스펙시트로 업데이트 및 저장 가능.

### 3.2. 고해상도 PDF 생성 엔진
- 브라우저 인쇄 모드 `@media print` CSS 완벽 튜닝 (1페이지/2페이지 깔끔한 Page-Break 분할, 여백 및 폰트 깨짐 0%).
- `html2canvas` + `jspdf` 또는 서버 사이드 PDF 렌더링을 통한 원클릭 벡터 PDF 다운로드 기능.

### 3.3. 300여 개 품목 엑셀 일괄 내보내기/가져오기 (Excel Bulk I/O)
- 바이어 요청 시 전체 카탈로그 또는 특정 카테고리의 5개국 라벨 스펙을 엑셀(`.xlsx`) 단일 파일 시트별(US, CN, JP, EU, UAE)로 다운로드.
- 대량 품목 일괄 업데이트 시 엑셀 템플릿 업로드 지원 (`xlsx` 파서 연동).

---

## 4. 라우트 및 파일 구조 (`src/app/`)

```
src/
├── app/
│   ├── admin/labels/[productId]/spec/
│   │   └── page.tsx              # 스펙시트 미리보기 & PDF 다운로드 페이지
│   └── api/
│       ├── labels/export-pdf/    # PDF 생성 엔드포인트
│       └── labels/excel-io/      # 엑셀 다운로드/업로드 API
├── components/labels/spec-sheet/
│   ├── MasterSpecSheet.tsx       # 6대 블록 공식 A4 템플릿 컴포넌트
│   ├── BuyerToFillForm.tsx       # 바이어 정보 입력 인터랙티브 폼
│   └── PrintStyleGuide.css       # A4 인쇄 전용 CSS 스타일시트
└── lib/export/
    ├── pdf-generator.ts          # PDF 다운로드 유틸리티
    └── excel-generator.ts        # Excel 변환 라이브러리
```

---

## 5. 실행 및 검증 기준 (Done Criteria)
1. 스펙시트 화면에서 `[PDF 다운로드]` 버튼 클릭 시 3초 이내에 바이어 제시용 고해상도 PDF가 규격에 맞추어 다운로드되는지 확인.
2. 브라우저에서 인쇄(Ctrl+P) 실행 시 잘림이나 레이아웃 왜곡 없이 A4 용지에 정갈하게 출력되는지 확인.
3. 엑셀 내보내기 실행 시 5개국 시트가 포함된 통합 엑셀 파일 정상 생성 확인.
