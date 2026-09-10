# [Phase 10] 국가별 클레임(Claims & Marketing) 라이브러리 엔진 및 무첨가/Zero 불법 표기 차단기 (improve10.md)

## 1. 개요 및 목적
해외 식품 통관 및 리콜의 주요 원인 중 하나인 **부적절한 마케팅 클레임(Nutrient Content Claims / Health Claims / Clean-Label Claims)**을 사전에 차단하기 위해, 국가별 법정 허용 클레임 라이브러리와 엄격한 수치 검증 엔진을 구축합니다.

---

## 2. 권역별 핵심 클레임 검증 엔진 (`src/lib/label-compliance/engines/claim-engine.ts`)

### 2.1. 미국 FDA 영양소 함량 강조 클레임 검증 (21 CFR 101 Subpart D)
1. **Free (무함유) 클레임**:
   - Fat-Free: 1회 제공량당 지방 0.5g 미만
   - Sugar-Free: 1회 제공량당 당류 0.5g 미만
   - Sodium-Free: 1회 제공량당 나트륨 5mg 미만
   - 기준치를 초과하면서 패키지에 'Free'를 기재한 경우 즉시 Red-Flag 차단.
2. **Low (저함유) 클레임**:
   - Low-Fat: 100g당 3g 이하
   - Low-Sodium: 1회 제공량당 140mg 이하
3. **High / Excellent Source of (풍부한 영양소)**:
   - 일일 권장치(%DV) 20% 이상 함유 시에만 허용.
   - 10~19% 함유 시에는 'Good Source of'만 허용.

### 2.2. 중국 GB 7718-2025 '零添加(첨가물 제로)', '不添加' 차단기
- 중국 시장감독관리총국(SAMR)의 신규 법률에 따라, '零添加(첨가물 제로)', '不添加(무첨가)', '无添加' 등의 클레임을 전면 차단.
- 패키지 주표시면 및 상세 설명란에서 해당 문자열을 정규식으로 실시간 스캔하여 발견 시 `CN-CRIT-NO-ADDITIVE-CLAIM` 발동.

### 2.3. 비건 / 할랄 / 유기농 / Non-GMO 인증 클레임 증빙 번호 검증
- PDP에 'HALAL' 뱃지 부착 시 ➔ MoIAT/ESMA 또는 공인 할랄 인증서 번호 미기재 시 경고.
- 'ORGANIC' 클레임 시 ➔ USDA Organic / EU Organic 인증 로고 및 작업장 번호 검증.

---

## 3. 완료 기준 (Done Criteria)
1. `claim-engine.ts` 구현 및 5대국 클레임 사전 매핑.
2. 잘못된 영양강조 표시(예: 나트륨 400mg인데 Low Sodium 표기) 적발 테스트 100% 통과.
3. 관리자 스튜디오 Block 2 (PDP)에서 선택된 소구 포인트의 실시간 적합성 판정 연동.
