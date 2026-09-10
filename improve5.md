# [Phase 5] 다국어 자동 번역 및 모듈식 텍스트 치환 시스템 (improve5.md)

## 1. 개요 및 목적
300여 품목의 한국어 원재료명 및 제품 규격을 미국(영어), 중국(간체), 일본(가타카나/일본어), EU(영어/독어/불어), UAE(아랍어 RTL)로 자동 변환하고, 국가별 법정 강제 표기 문구(예: "Contains:", "本品含有", "本製品には…が含まれています", "يحفظ في مكان بارד")를 **모듈식으로 원클릭 치환(Module Swapping)**하는 다국어 사전 및 변환 엔진을 구축합니다.

---

## 2. 핵심 기능 요구사항

### 2.1. 식품 전용 표준 다국어 사전 (Food Ingredients & Additives Dictionary)
- 식품첨가물 국제 공통 번호(INS / E-number) 및 5개 국어 매핑:
  - 예: `E621 / INS 621` ➔ [KO] L-글루탐산나트륨, [EN] Monosodium Glutamate, [CN] 谷氨酸钠(味精), [JP] L-グルタミン酸ナトリウム, [AR] غلوتامات أحادية الصوديوم.
  - 예: `INS 500(i)` ➔ [KO] 탄산수소나트륨, [EN] Sodium Bicarbonate, [CN] 碳酸氢钠, [JP] 炭酸水素ナトリウム, [AR] بيكربونات الصوديوم.
- 대표 K-Food 원재료 150종 표준 다국어 DB 구축:
  - 찹쌀, 고춧가루, 참기름, 대두, 돼지고기, 소고기, 김치추출물, 물엿, 매실액 등.

### 2.2. 국가별 법정 강제 문구 템플릿 치환 (Regulatory Boilerplates)
국가를 변경할 때마다 아래 필수 문구들이 대상국 양식으로 자동 전환됩니다.

| 권역 | 알레르겐 안내문구 템플릿 | 보관방법 표준 템플릿 | 조리/취급 주의문구 템플릿 |
| :--- | :--- | :--- | :--- |
| **US** | `CONTAINS: WHEAT, SOYBEANS, SESAME.`<br>`May contain traces of milk and egg.` | `Keep frozen at or below 0°F (-18°C).`<br>`Do not refreeze once thawed.` | `Cook thoroughly to an internal temperature of 165°F.` |
| **CN** | `致敏原信息：含有小麦、大豆、芝麻。`<br>`此生产线亦加工含有花生、牛奶的制品。` | `请于-18℃以下冷冻保存。解冻后请勿再次冷冻。` | `食用前请充分加热。` |
| **JP** | `原材料の一部に小麦・大豆・ごまを含みます。`<br>`本品製造工場では、卵、乳成分を含む製品を生産しています。` | `-18℃以下で保存してください。`<br>`一度解冻したものは再冻结しないでください。` | `加熱してお召し上がりください。` |
| **EU** | `Allergy Advice: For allergens, see ingredients in bold.`<br>`May contain traces of nuts.` | `Store frozen at -18°C or colder.`<br>`Do not refreeze after thawing.` | `Cook thoroughly before consumption.` |
| **UAE** | `تحذير الحساسية: يحتوي على القمح وفول الصويا والسمسم.`<br>`قد يحتوي على آثار من الحليب.` | `يحفظ مجمداً عند -18 درجة مئوية أو أقل.`<br>`لا تعيد تجميده بعد الذوبان.` | `يُطهى جيداً قبل التقديم.` |

### 2.3. 아랍어(UAE) RTL 레이아웃 엔진 지원
- 기존 `LanguageContext.tsx`의 RTL 엔진과 연계하여, UAE 뷰 및 라벨 출력 시 `dir="rtl"`과 오른쪽 정렬 아랍어 타이포그래피(`Amiri` 또는 `Noto Sans Arabic`)를 완전하게 렌더링.

---

## 3. 데이터 구조 및 인터페이스 (`src/lib/label-i18n/`)

```
src/lib/label-i18n/
├── dictionaries/
│   ├── food-ingredients-db.json  # 150종 K-Food 표준 원재료 다국어 DB
│   ├── food-additives-db.json    # INS / E-number 공인 첨가물 DB
│   └── mandatory-phrases.json    # 국가별 법정 필수 문구 템플릿
├── ingredient-translator.ts      # 한국어 원재료명 ➔ 대상국 언어 자동 번역기
└── template-swapper.ts           # 국가 변경 시 템플릿 일괄 치환기
```

```typescript
export interface FoodIngredientTranslation {
  code: string; // e.g. "ING-SESAME"
  ko: string;   // "참깨"
  en: string;   // "Sesame"
  cn: string;   // "芝麻"
  jp: string;   // "ごま"
  ar: string;   // "سمسم"
  isAllergenIn: ('US' | 'CN' | 'JP' | 'EU' | 'UAE')[];
  category: 'grain' | 'meat' | 'seafood' | 'vegetable' | 'seasoning' | 'additive';
  eNumber?: string;
}
```

---

## 4. UI 연동 및 사용자 경험 (UX)
1. **스마트 자동 번역 버튼**: 원재료 목록 입력창 상단 `[🌍 5개국 표준 용어로 자동 치환]` 버튼 클릭 시 사전 DB와 매칭하여 즉각 번역.
2. **미등록 원재료 감지**: 사전에 없는 특수 원재료는 주황색 태그로 표시하여 관리자가 수동 입력 후 사전에 추가 등록 가능.
3. **국가 전환 드롭다운**: 국가 탭 전환 시 보관/알레르겐/유효기간 문구가 0.1초 만에 해당 국가의 표준 법정 문구로 자동 스위칭.

---

## 5. 실행 및 검증 기준 (Done Criteria)
1. 300여 품목에 자주 사용되는 상위 50개 원재료(밀가루, 돼지고기, 대두, 고춧가루, 참기름 등)를 영어, 중국어, 일본어, 아랍어로 오류 없이 자동 번역 테스트.
2. UAE 선택 시 아랍어 번역 및 RTL 레이아웃(텍스트 정렬, 좌우 배치 반전)이 정상 렌더링되는지 확인.
