# [Phase 13] 식품 첨가물 인가 매트릭스 DB 및 카테고리별 최대 허용 한도(Max Level / Quantum Satis) 검증 엔진 (improve13.md)

## 1. 개요 및 목적
`new_label.md` Section 7 ("EU-06 Additives"), Section 17 ("additives table"), Section 18 ("additive authorization matrix")의 요구사항에 따라, 단순히 E171 등 특정 금지 첨가물만 차단하는 단계를 넘어 **5대 수출국(US, CN, JP, EU, UAE)의 식품첨가물 공전(Codex GSFA, US 21 CFR, EU 1333/2008, 중국 GB 2760, 일본 첨가물공전, UAE GSO 2500)을 전산화한 첨가물 인가 매트릭스(Additive Authorization Matrix) DB**를 구축하고, **식품 카테고리별 인가 여부(Authorized), 최대 허용 한도(Max Level ppm/mg·kg) 초과 여부, Quantum Satis(적정량 규격), 용도명(Functional Class) 법정 표기 의무**를 실시간으로 정밀 판정하는 엔진을 개발합니다.

---

## 2. 세부 구현 과제

### 2.1. 5대 권역 식품첨가물 인가 매트릭스 데이터베이스 (`additive-matrix-db.json`)
- **주요 첨가물 60여 종 이상 핵심 인가 데이터베이스 구축**:
  - 보존료: 소르빈산칼륨(E202/INS 202), 안식향산나트륨(E211/INS 211), 프로피온산(E280/INS 280), 아질산나트륨(E250/INS 250) 등
  - 산화방지제: BHA(E320), BHT(E321), 아스코르빈산(E300), 토코페롤(E306), EDTA(E385) 등
  - 감미료: 아스파탐(E951), 수크랄로스(E955), 아세설팜칼륨(E950), 사카린(E954), 스테비올배당체(E960) 등
  - 착색료: 이산화티타늄(E171 - EU 전면 금지, 미국 허용), 타르색소(황색4호 E102, 적색40호 E129, 카라멜색소 E150a-d) 등
  - 산도조절제 / 증점제 / 유화제: 구연산(E330), 잔탄검(E415), 레시틴(E322), 폴리인산나트륨(E452) 등
  - 향미증진제: L-글루탐산나트륨(MSG/E621), 리보뉴클레오티드(E635) 등
- **필드 구조체 (`AdditiveAuthorizationEntry`)**:
  - `insOrENumber`: string (예: 'E202', 'INS 211')
  - `canonicalName`: string (공식 명칭)
  - `functionalClass`: string (보존료, 산화방지제, 착색료, 감미료 등)
  - `jurisdiction`: ExportCountry ('US' | 'CN' | 'JP' | 'EU' | 'UAE')
  - `authorizedCategories`: string[] (인가된 식품 범주: 만두/육가공, 라면/면류, 김치/절임, 소스류, 스낵류, 음료 등)
  - `isQuantumSatis`: boolean (사용량 제한 없이 기술적 필요량만 사용하는 규격 여부)
  - `maxLevelPpm`: number (최대 허용 한도 ppm = mg/kg)
  - `status`: 'AUTHORIZED' | 'RESTRICTED' | 'PROHIBITED'
  - `labelingRequirement`: string (용도명 병기 의무, 예: "보존료(소르빈산칼륨)")
  - `regulationSource`: string (근거 법령)

### 2.2. 첨가물 인가 및 한도 검증 엔진 (`additive-authorization-engine.ts`)
1. **식품 카테고리별 인가 적합성 검증**:
   - 제품의 법적 식품유형(`productCategoryLocal` or `legalProductType`)에서 해당 첨가물의 사용이 허가되어 있는지 검사.
   - 미인가 식품 유형에 첨가물 사용 시 `CRITICAL` 위반 즉시 차단 (`[COUNTRY]-CRIT-ADDITIVE-UNAUTHORIZED-CATEGORY`).
2. **배합비(%) 기반 ppm 환산 및 최대 허용 한도(Max Level) 초과 판정**:
   - `배합비(%) × 10,000 = ppm (mg/kg)` 공식 적용.
   - `maxLevelPpm` 초과 시 정량 위반 `CRITICAL` 통관 차단 및 적정 배합비 제시 (`[COUNTRY]-CRIT-ADDITIVE-MAX-LEVEL-EXCEEDED`).
3. **용도명(Functional Class) 표기 누락 검증**:
   - EU FIC 1169/2011, 한국/일본/중국/미국 법규상 보존료, 착색료, 감미료, 산화방지제 등 주요 기능성 첨가물은 단순 성분명 외에 용도명(예: "Preservative: Potassium Sorbate", "보존료(소르빈산칼륨)") 병기 의무 검증 (`[COUNTRY]-WARN-ADDITIVE-FUNCTION-MISSING`).
4. **권역별 금지 첨가물 즉시 적발**:
   - EU: 이산화티타늄(E171) 완전 금지
   - 미국: 폰소 4R(E124, 코치닐레드), 시클라메이트 등 비승인 색소/감미료 적발
   - UAE/중동: 주정(에탄올) 캐리어 및 동물성 유래 유화제 할랄 규격 점검

### 2.3. 14대 엔진 파이프라인 (`domain-engines.ts`) 및 관리자 에디터 (Block 3) 연동
- Engine 6 (`validateAdditives`)과 통합하여 전체 컴플라이언스 파이프라인에 실시간 반영.
- [BlockInfoPanelEditor.tsx](file:///d:/Antigravity/song_food/src/components/admin/labels/BlockInfoPanelEditor.tsx):
  - 원재료 목록에 등록된 첨가물(INS/E-Number) 옆에 [인가 상태 뱃지 (Authorized / Max Limit / Quantum Satis / Prohibited)] 실시간 노출.

---

## 3. 완료 기준 (Done Criteria)
1. `src/lib/label-compliance/engines/additive-authorization-engine.ts` 구현.
2. 5대국 주요 60+ 첨가물 인가 매트릭스 DB (`additive-matrix-db.json`) 구축.
3. 단위 테스트 `src/__tests__/additive-authorization-engine.test.ts` 작성 (10개 이상 테스트 케이스 100% 통과).
4. `npm test` 전체 20개 테스트 스위트 140개 이상 테스트 100% 통과.
5. `npx tsc --noEmit` 무결점 및 `npm run build` 정적 빌드 성공.
6. Git commit 및 GitHub push 완료.
