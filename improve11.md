# [Phase 11] GS1 글로벌 바코드 정합성 검증기 및 수입국 분리배출 재활용 심볼 라이브러리 (improve11.md)

## 1. 개요 및 목적
글로벌 리테일 유통(Walmart, Costco, Carrefour, AEON, LuLu) 입점 시 필수적인 **GS1 표준 바코드 체크디지트 정합성 검증 엔진**과, 국가별 환경 규제에 따른 **법정 분리배출 재활용 마크(Recycling Symbols) 관리 시스템**을 구축합니다.

---

## 2. 세부 구현 과제

### 2.1. GS1 바코드 체크디지트 검증 엔진 (`src/lib/label-compliance/engines/barcode-engine.ts`)
1. **EAN-13 Modulo-10 검증**:
   - 13자리 바코드의 앞 12자리를 짝수/홀수 자릿수 가중치(1 vs 3)로 연산하여 13번째 체크디지트와 정확히 일치하는지 수학적으로 검증.
   - 한국 국가코드(880), 일본(45/49), 중국(690-699) 프리픽스 정합성 체크.
2. **UPC-A (북미 12자리) 정합성**:
   - 미국 유통 표준 12자리 바코드 체크디지트 검증 및 EAN-13과의 0-패딩 변환 지원.

### 2.2. 수입국별 법정 분리배출 재활용 심볼 라이브러리
- 🇯🇵 **일본**: 용기포장리사이클법 기준 플라스틱(プラ), 종이(紙) 식별 마크 인쇄 규격.
- 🇫🇷 **프랑스/EU**: Triman 로고 및 Info-tri 분리배출 분류 가이드 준수 검증.
- 🇩🇪 **독일/EU**: Der Grüne Punkt (Green Dot) 인증 마크 관리.
- 🇺🇸 **미국**: How2Recycle 및 Mobius Loop 수지 식별 코드(Resin Identification Code).

---

## 3. 완료 기준 (Done Criteria)
1. `barcode-engine.ts` 단위 테스트: 올바른/잘못된 EAN-13 및 UPC-A 바코드 판별 테스트 100% 통과.
2. 관리자 스튜디오 Block 6 (Barcode & Marking)에서 잘못된 바코드 번호 입력 시 실시간 오류 감지.
3. 인쇄용 SVG 벡터 분리배출 마크 에셋 패키징 완료.
