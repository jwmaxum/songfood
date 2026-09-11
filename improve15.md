# 송영민푸드 라벨 인쇄 아트워크 OCR 및 비전 레이아웃 검사기 명세서 (improve15.md)

## 1. 개요 (Overview)
- **목적**: 텍스트 DB 검증을 넘어, 실제 공장 인쇄용 라벨 파일(PNG, JPG, SVG, WebP, PDF 래스터 등)을 업로드받아 **컴퓨터 비전 및 텍스트 매칭 알고리즘을 통해 실제 인쇄 시안의 무결성(텍스트 일치도, 법정 활자 크기 x-height, 패널 배치, 콘트라스트)을 사전 검증**하는 엔터프라이즈 Artwork Inspector 구축.
- **배경**:
  - 라벨 DB에 등록된 데이터가 아무리 완벽해도, 디자이너나 외주 인쇄소가 작업한 인쇄 시안(Artwork)에서 영문 스펠링 오타, 알레르겐 강조 누락, 미국 1/16인치(1.6mm) 미달, EU 1.2mm x-height 미달, 또는 바코드 인쇄 번호 오기가 발생하면 세관에서 라벨 불합격 판정 및 전량 폐기/스티커 재부착 비용 발생.
  - `new_label.md` Section 14 "라벨 인쇄 아트워크 OCR 및 비전 검사" 요구사항 100% 충족.

---

## 2. 핵심 아키텍처 및 구현 컴포넌트

### 2.1. 비전 & 아트워크 컴플라이언스 엔진 (`artwork-ocr-engine.ts`)
- **경로**: `src/lib/label-compliance/vision/artwork-ocr-engine.ts`
- **핵심 기능**:
  1. **텍스트 정합성 Diff & 누락 검출기 (`compareArtworkWithMaster`)**:
     - 시안 텍스트(OCR 추출 문자열)와 라벨 DB 마스터 데이터(제품명, 원재료명, 영양성분 값, 알레르겐 주의문구, 순중량, 제조업체) 간의 유사도(Similarity Ratio: 0~100%) 산출.
     - 필수 법정 키워드(예: 'CONTAINS', 'Nutrition Facts', 'Best Before', '原材料名', '식염상당량' 등) 누락 감지.
  2. **법정 최소 활자 크기(Font Size / x-height) 검사기 (`validateFontPhysicalDimensions`)**:
     - 포장재 표면적(packageAreaCm2) 및 입력 해상도(DPI)를 바탕으로 실제 물리적 폰트 높이(mm, inch) 추정.
     - EU FIC 1169/2011: 표면적 >= 80cm² ➔ 최소 x-height **1.2mm**, 표면적 < 80cm² ➔ 최소 x-height **0.9mm** 미달 검출.
     - US FDA 21 CFR 101.2: PDP 순중량 폰트 크기 포장 면적 비례(최소 1/16 inch = **1.6mm**) 미달 검출.
     - 인쇄 DPI 권장 기준(최소 300 DPI 미달 시 해상도 경고).
  3. **패널 배치 적합성 검사기 (`validatePanelLayout`)**:
     - 주표시면(PDP) 필수 항목(제품명, 순중량)과 정보표시면(Info Panel) 필수 항목(영양성분, 원재료, 알레르겐, 제조사)의 누락 여부 판정.
  4. **가독성 및 대비율(Contrast Ratio) 검사기 (`evaluateContrastRatio`)**:
     - 텍스트/배경 색상 RGB 또는 시안 명암비가 WCAG 2.1 AA 기준(최소 4.5:1, 대형 텍스트 3:1)을 충족하는지 가독성 점수 판정.

### 2.2. 관리자 스튜디오 아트워크 인스펙터 모달 (`ArtworkInspectorModal.tsx`)
- **경로**: `src/components/admin/labels/ArtworkInspectorModal.tsx`
- **UI 구성**:
  - **드래그 앤 드롭 업로더**: 라벨 시안 이미지(PNG, JPG, WebP) 파일 즉각 로드.
  - **시각화 캔버스 & 돋보기 뷰어**: 인쇄 시안 미리보기, 바운딩 박스 하이라이트(오타 위험/폰트 미달 영역 표시).
  - **스마트 프리셋 테스트 기능**: 실제 이미지 파일이 없는 관리자도 원클릭으로 "정상 시안 샘플", "스펠링 오타/알레르겐 누락 샘플", "활자 크기 미달 샘플"을 즉시 테스트할 수 있는 내장 시뮬레이션 데모 데이터 탑재.
  - **1:1 DB 비교 리포트 카드**:
    - 매칭 일치도 스코어 (예: 98% MATCH)
    - 누락된 법정 문구 하이라이트 (Missing Mandatory Phrases)
    - 폰트 x-height 적합성 게이지 (1.2mm 규격 통과 여부)
    - 발견된 이슈 Red-Flag 즉시 생성 및 라벨 검증 파이프라인 연동.

### 2.3. 라벨 관리자 워크스페이스 상단 연동
- [src/app/admin/labels/[productId]/page.tsx](file:///d:/Antigravity/song_food/src/app/admin/labels/[productId]/page.tsx)의 상단 액션 바에 `[📷 인쇄 시안 비전 검사]` 버튼을 추가하여 클릭 시 모달 오픈.

---

## 3. 검증 계획 (Verification Plan)
1. **단위 테스트 (`src/__tests__/artwork-ocr-engine.test.ts`)**:
   - 텍스트 일치도 유사도 계산 및 누락 키워드 적발 테스트
   - EU 1.2mm / 0.9mm x-height 규격 미달 판정 테스트
   - 미국 1/16 inch 순중량 폰트 크기 미달 판정 테스트
   - 300 DPI 미만 저해상도 시안 경고 테스트
   - PDP/Info Panel 필수 배치 누락 판정 테스트
   - 가독성 대비율(Contrast Ratio) 계산 테스트
2. **TypeScript 무결성 검증**: `npx tsc --noEmit` 에러 0건.
3. **Jest 전체 스위트 검증**: `npm test` 22개 테스트 스위트 100% PASS.
4. **Next.js 프로덕션 빌드 검증**: `npm run build` 정적 라우트 빌드 성공.
5. **형상 관리**: `walkthrough.md` 갱신 및 GitHub push.
