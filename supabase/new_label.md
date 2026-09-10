1. 전체 Architecture

현재:

validateLabel(input)
       ↓
country별 if / rule
       ↓
isCompliant

상용 버전은 다음으로 바꾸는 것을 권합니다.

                    ┌──────────────────────┐
                    │   Product Profile    │
                    │ 제품 / 성분 / 제조국 │
                    │ 판매국 / 포장 / Claim│
                    └──────────┬───────────┘
                               ↓
                 ┌─────────────────────────┐
                 │ Jurisdiction Resolver   │
                 │ FDA / USDA / SAMR / CAA │
                 │ EU / GSO / UAE / etc.   │
                 └────────────┬────────────┘
                              ↓
                ┌──────────────────────────┐
                │ Regulatory Rule Registry │
                │ 법규 / 버전 / 시행일     │
                │ 적용범위 / 예외          │
                └────────────┬─────────────┘
                             ↓
       ┌─────────────────────┼─────────────────────┐
       ↓                     ↓                     ↓
 Ingredient Engine     Nutrition Engine       Claim Engine
       ↓                     ↓                     ↓
 Allergen Engine       Date/Storage          Additive Engine
       ↓                     ↓                     ↓
 Packaging/Layout      Origin Engine          Language Engine
       └─────────────────────┼─────────────────────┘
                             ↓
                    Compliance Decision
                             ↓
              ┌──────────────┼──────────────┐
              ↓              ↓              ↓
           CRITICAL        WARNING        PASS
              ↓
        Rule ID + 법규 근거
        수정 방법 + 증거
2. 먼저 공통 Rule Engine을 만든다
A. 제품 Scope 판정

최우선으로 추가

 일반 가공식품
 육류
 가금류
 수산물
 유제품
 음료
 주류
 건강기능/기능성 식품
 영유아 식품
 특수영양식
 dietary supplement
 frozen food
 ready-to-eat
 organic
 halal
 vegan/vegetarian
 allergen-free
 GMO 관련 제품
 온라인 판매용
 bulk food
 food-service

이 단계가 중요한 이유는 같은 국가에서도 제품 분류에 따라 적용 규정이 달라지기 때문입니다.

예를 들어 미국 FDA의 일반 식품과 USDA 관할 육류/가금류를 같은 Rule Set으로 처리하면 안 됩니다. FDA에는 식품별 Standards of Identity도 250개 이상 존재합니다.

3. 공통 Label Rule

모든 국가에 공통으로 넣을 Engine입니다.

Product identity
 식품명 존재
 법정 명칭 여부
 일반명/통상명 여부
 제품명이 실제 내용물과 일치
 오해 가능성
 브랜드명과 식품명 구분
 제품 유형 표시
 flavor/variant 표시
Ingredients
 성분표 존재
 중량순 배열
 compound ingredient 처리
 sub-ingredient 처리
 additive 표시
 processing aid 처리
 flavor 처리
 color 처리
 ingredient QUID 처리
 강조 성분 % 처리
 이름에 들어간 성분 % 처리
Net quantity
 순중량
 단위
 국가별 허용 단위
 net weight / volume 구분
 포장 형태와 일치
 최소 글자 크기
Date
 제조일
 유통기한
 소비기한
 best-before
 use-by
 date format
 날짜 위치
 batch/lot
 날짜와 보관조건 논리적 일치
Storage
 보관조건
 냉장/냉동
 개봉 후 보관
 개봉 후 소비기간
 조리/가열 필요 여부
Operator
 제조사
 포장업체
 수입자
 유통업체
 주소
 국가별 importer 요구사항
Origin
 제조국
 원산지
 primary ingredient origin
 origin claim
 misleading origin 여부
4. 미국 🇺🇸 — FDA / USDA Rule Pack

현재 코드보다 가장 크게 확장해야 하는 부분입니다.

FDA 공식 가이드 자체도 식품 라벨링을 매우 광범위한 영역으로 분류하고 있으며, 현재 Food Labeling Guide의 Nutrition 부분은 최신 요구사항 전체를 반영하지 않는다고 명시하고 있습니다. 따라서 단순히 하나의 FDA checklist로 끝내면 안 됩니다.

US-01 기본 표시
 Statement of Identity
 Net Quantity
 Nutrition Facts
 Ingredient Statement
 Manufacturer/Packer/Distributor
 Address
 Country of origin 관련 표시
 Label panel 위치
 Principal Display Panel
 Information Panel
US-02 Ingredients
 common/usual name
 descending order by weight
 compound ingredients
 sub-ingredients
 spices
 flavorings
 colors
 incidental additives
 processing aids
 certified color
 artificial/natural flavor
 ingredient abbreviation 제한
US-03 9 Major Allergens

현재 코드의 isAllergen boolean은 폐기하는 것을 권합니다.

대신:

allergenSources: [
  {
    jurisdiction: "US",
    allergen: "WHEAT",
    sourceIngredient: "wheat flour",
    declarationRequired: true
  }
]

로 가야 합니다.

검사:

 Milk
 Egg
 Fish
 Crustacean shellfish
 Tree nuts
 Peanuts
 Wheat
 Soy
 Sesame

FDA는 major allergen의 food source를 표시하도록 요구하며, tree nut/fish/shellfish는 종류까지 특정해야 합니다.

Contains
 Contains: 존재
 allergen source 정확성
 ingredient list와 consistency
 duplicate/누락
 sesame
 tree nut species
 fish species
 crustacean species
Advisory
 May contain
 shared equipment
 cross-contact
 advisory statement를 mandatory allergen declaration 대신 사용했는지 검사

FDA는 advisory allergen statement가 법정 mandatory declaration을 대체하는 용도로 사용되어서는 안 된다고 설명합니다.

US-04 Nutrition Facts
 Serving Size
 Servings per container
 Calories
 Total Fat
 Saturated Fat
 Trans Fat
 Cholesterol
 Sodium
 Total Carbohydrate
 Dietary Fiber
 Total Sugars
 Added Sugars
 Protein
 Vitamin D
 Calcium
 Iron
 Potassium
 %DV 계산
 rounding
 serving size 규칙
 package별 serving
 dual-column labeling
 small package exemption
 formatting

FDA의 최신 Nutrition Facts는 vitamin D, calcium, iron, potassium에 실제량과 %DV 표시를 요구하는 구조입니다.

US-05 Claims
 Free
 Low
 Reduced
 Light/Lite
 High
 Good source
 Healthy
 Sugar free
 Sodium free
 Fat free
 Gluten-free
 Organic
 Natural
 Made with
 health claim
 qualified health claim
 structure/function claim

FDA는 nutrient content claim, health claim, structure/function claim을 구분합니다.

US-06 USDA 분기
 meat/poultry 여부
 USDA jurisdiction
 FSIS label approval
 inspection legend
 safe handling
 raw meat labeling
 country of origin
 species
 percentage meat
 standards of identity

즉 현재의

ratio > 2%
→ USDA

같은 단순 rule은 실제 관할 판정 Engine으로 교체해야 합니다.

5. 중국 🇨🇳 — SAMR / GACC

중국은 반드시 2025/2026 Rule Pack으로 재설계하는 것을 권합니다.

GB 7718-2025는 기존 GB 7718-2011을 대체하면서 성분, 날짜, 제조자 정보, 순중량, 알레르겐, claims, 수입식품, digital label 등을 상당히 변경했습니다.

또한 2026년 SAMR의 설명에서도 GB 7718-2025 및 GB 28050-2025와 새로운 식품표지 감독 규정이 함께 언급됩니다.

CN-01 기본 표시
 제품명
 제품 유형
 ingredient list
 net content
 specification
 production date
 shelf life
 storage condition
 producer
 importer
 address
 contact
 food production license
 registration number
 country of origin
CN-02 Ingredients
 descending order
 compound ingredient
 additive
 food additive function category
 additive name
 additive INS
 allergen
 quantitative declaration
 ingredient classification
CN-03 Allergens
 wheat
 crustacean
 fish
 egg
 peanut
 soybean
 milk
 tree nuts
 allergen declaration format
 ingredient/allergen consistency
CN-04 Nutrition
 energy
 protein
 fat
 carbohydrate
 sodium
 serving/100g basis
 NRV%
 rounding
 mandatory nutrition items
 nutrition claim threshold
CN-05 Claims

특히 중요합니다.

 零添加
 不添加
 无添加
 health claim
 nutrition claim
 misleading claim
 disease-related claim
 functional claim
 organic
 natural
 imported claim

현재 코드의

claimsBadges: ['零添加防腐剂']

하나로 끝내지 말고 Claim Dictionary + prohibited/conditional claim engine으로 만들어야 합니다.

CN-06 Imported Food
 overseas manufacturer
 China importer
 GACC registration
 registration number format
 registration applicability
 registered facility/category
 Chinese label
 Chinese mandatory information
 label consistency with customs documents
CN-07 Digital Label

GB 7718-2025에서 digital label이 새롭게 다뤄지고 있으므로:

 QR/digital label
 mandatory info accessibility
 physical label에 반드시 있어야 하는 정보
 digital label 내용 일치
 URL/QR 유효성
 consumer access
6. 일본 🇯🇵 — CAA

일본은 현재 코드의 saltEquivalentG만 검사하는 것은 매우 부족합니다.

CAA는 일본 판매 식품에 일본어 표시가 필요하다고 명시하고 있습니다.

JP-01 기본 표시
 일본어
 제품명
 ingredients
 additives
 net content
 expiration/best-before
 storage
 manufacturer
 seller
 importer
 origin
 production facility
 lot/batch
JP-02 Ingredients
 原材料名
 添加物
 compound ingredients
 percentage
 ingredient origin
 processed food ingredient origin
 country-of-origin rules

CAA는 가공식품의 원재료 원산지 표시 체계를 별도로 운영합니다.

JP-03 Allergens

필수/권장 allergen을 분리해서 데이터 모델링해야 합니다.

예:

allergenStatus: {
  mandatory: [...],
  recommended: [...],
  notApplicable: [...]
}

현재 CAA 자료상 mandatory에는 shrimp, crab, walnut, wheat, buckwheat, egg, milk, peanut이 포함되고, 별도의 recommended group도 존재합니다.

따라서

isAllergen: true

하나로는 일본 규제를 표현할 수 없습니다.

JP-04 Nutrition
 calories
 protein
 fat
 carbohydrate
 sodium
 salt equivalent
 표시 순서
 rounding
 per serving/per 100g
 nutrition claim
 health claim

일본은 sodium을 salt equivalent로 표시하는 체계이므로 현재 saltEquivalentG를 넣은 방향은 맞습니다.

JP-05 Date
 賞味期限
 消費期限
 date format
 date marking location
 storage condition consistency

두 날짜 개념을 하나의 dateMarkingType으로 단순화하지 말고 의미 자체를 Rule Engine에서 구분해야 합니다.

JP-06 Health/Functional
 Foods with Function Claims
 Foods for Specified Health Uses
 nutrient function claims
 disease-related wording
 claim notification/approval
 claim evidence
 required disclaimer

CAA는 Foods for Specified Health Uses 제도를 별도로 운영합니다.

7. EU 🇪🇺 — EU FIC + 국가별 Rule

EU는 특히 “EU 규정 = 끝”으로 만들면 안 됩니다.

EU Regulation 1169/2011이 핵심이지만, Member State별 추가 요구사항도 존재합니다.

EU-01 FIC 기본
 food name
 ingredients
 allergens
 QUID
 net quantity
 date
 storage
 operator
 origin
 instructions
 alcohol strength
 nutrition declaration

이 항목들은 Regulation 1169/2011 Article 9의 핵심 mandatory particulars입니다.

EU-02 Ingredient
 descending weight
 ingredient name
 compound ingredients
 category names
 additive
 flavor
 nano ingredient
 water
 carry-over additive
 processing aid
 QUID

특히 EU는 engineered nanomaterial을 ingredient list에서 명시하도록 하는 규칙도 있습니다.

EU-03 Allergens
 cereals containing gluten
 crustaceans
 eggs
 fish
 peanuts
 soybeans
 milk
 nuts
 celery
 mustard
 sesame
 sulphur dioxide/sulphites
 lupin
 molluscs

그리고:

 ingredient list 내 allergen 강조
 bold
 font/style
 color/background
 Contains rule
 cross-contact advisory

EU에서는 allergen을 ingredient list에서 명확하게 구별되도록 강조해야 합니다.

EU-04 Nutrition
 energy kJ
 energy kcal
 fat
 saturates
 carbohydrate
 sugars
 protein
 salt
 per 100g/100ml
 optional nutrients
 rounding
 reference intake

EU는 sodium보다 salt를 중심으로 처리해야 하므로, 미국의 sodiumMg와 동일한 데이터 필드로 처리하면 안 됩니다.

EU-05 Origin
 country of origin
 place of provenance
 primary ingredient origin
 origin mismatch
 meat-specific origin
 fish origin
 honey
 olive oil
 beef
 fruit/vegetables

EU는 특정 식품군에 별도의 origin rule도 존재합니다.

EU-06 Additives

현재 코드의:

E171 → blocked

는 좋은 시작이지만 너무 단순합니다.

필요한 것은:

Additive Database
 ├── E-number
 ├── name
 ├── functional class
 ├── authorized food category
 ├── maximum level
 ├── quantum satis
 ├── restricted
 ├── prohibited
 ├── conditions
 └── effective date

즉 “E-number가 존재하는가?”가 아니라 “이 제품 category에서 이 농도로 허용되는가?”를 검사해야 합니다.

8. UAE 🇦🇪 — GSO / MOIAT / Halal

UAE는 GSO 9를 중심으로 별도 Rule Pack을 만들어야 합니다.

UAE MOIAT 공식 자료에서도 UAE.S GSO 9를 Labelling of Prepackaged Food Stuffs로 명시하고 있으며, Halal에 대해서는 UAE.S 2055-1 등을 별도로 관리합니다.

UAE-01 기본 표시
 product name
 ingredients
 net weight
 production date
 expiry date
 storage
 manufacturer
 importer
 country of origin
 lot/batch
 Arabic labeling
 required bilingual information
UAE-02 Ingredients
 ingredient order
 additive
 flavor
 color
 compound ingredient
 allergen
 source
 prohibited ingredient
UAE-03 Halal

현재 코드의

돼지고기 → HARAM

은 너무 단순합니다.

실제 엔진은:

Ingredient
      ↓
Animal-derived?
      ↓
Species?
      ↓
Slaughter method?
      ↓
Processing aid?
      ↓
Alcohol?
      ↓
Cross-contamination?
      ↓
Halal certification requirement?

으로 가야 합니다.

검사:

 pork
 pork derivatives
 lard
 gelatin source
 animal enzymes
 meat-derived flavor
 blood-derived ingredients
 alcohol
 ethanol carrier
 cross contamination
 halal certification
 halal logo
 certification validity

UAE에는 Halal food와 certification body에 관한 별도 standards가 존재합니다.

UAE-04 Arabic
 Arabic mandatory information
 translation consistency
 product name
 ingredient translation
 allergen translation
 net quantity
 storage
 date
 importer
 country of origin

번역 자체도 Compliance rule로 만들어야 합니다.

9. 공통 Claim Engine — 반드시 별도 개발

이게 실제 상용 제품에서 상당히 중요합니다.

예:

"NO SUGAR"
"LOW FAT"
"ORGANIC"
"NATURAL"
"HEALTHY"
"PREMIUM"
"ZERO"
"NO ADDITIVES"
"NO PRESERVATIVES"
"HALAL"
"VEGAN"
"GLUTEN FREE"
"NON GMO"
"KETO"
"PROTEIN"

이런 표현을 단순 문자열 blacklist로 처리하면 안 됩니다.

Claim Engine
interface ClaimRule {
  claim: string;
  jurisdiction: string;
  productScope: string[];
  threshold?: Condition[];
  requiredEvidence?: Evidence[];
  prohibited?: boolean;
  requiredDisclaimer?: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
}

판정:

Claim 발견
   ↓
국가
   ↓
제품 category
   ↓
영양성분
   ↓
성분
   ↓
threshold
   ↓
증빙
   ↓
허용 / 조건부 / 금지

FDA에서도 nutrient-content claims가 특정 영양 기준을 만족해야 하는 구조이므로 이런 방식이 적합합니다.

10. Ingredient Intelligence Engine

현재 코드에서 가장 크게 바꿀 부분 중 하나입니다.

현재:

{
  ingredientNameKo,
  ingredientNameTarget,
  ratio,
  isAllergen
}

보다는:

{
  id,
  canonicalName,
  localNames: {},
  scientificName,
  category,
  percentage,
  origin,
  
  allergens: {
    US: [],
    EU: [],
    CN: [],
    JP: [],
    UAE: []
  },

  additives: [],
  
  animalDerived: true,
  animalSpecies: "pork",
  
  halalStatus: "haram",
  
  regulatoryStatus: {
    US: {},
    EU: {},
    CN: {},
    JP: {},
    UAE: {}
  }
}

형태가 좋습니다.

11. Regulatory Database

이게 핵심입니다.

코드 안에:

if (country === 'EU' && ingredient === 'E171')

같은 것을 계속 늘리면 유지보수 불가능합니다.

대신:

Regulatory Database
│
├── jurisdictions
│
├── regulations
│
├── rules
│
├── allergens
│
├── additives
│
├── nutrition
│
├── claims
│
├── translations
│
├── exemptions
│
└── effective_dates

로 분리합니다.

12. Rule 데이터 구조

제가 권하는 핵심 구조는 이것입니다.

interface ComplianceRule {
  id: string;

  jurisdiction:
    | 'US'
    | 'CN'
    | 'JP'
    | 'EU'
    | 'UAE';

  authority: string;

  regulation: string;

  version: string;

  effectiveFrom: string;
  effectiveTo?: string;

  priority: number;

  scope: {
    productCategories?: string[];
    packagingTypes?: string[];
    salesChannels?: string[];
  };

  condition: RuleCondition;

  severity:
    | 'CRITICAL'
    | 'ERROR'
    | 'WARNING'
    | 'INFO';

  action: RuleAction;

  evidence: {
    sourceUrl: string;
    citation: string;
  };
}

그러면 결과가 단순히:

isCompliant: false

가 아니라:

{
  "ruleId": "EU-FIC-ALLERGEN-001",
  "severity": "CRITICAL",
  "status": "FAIL",
  "message": "Milk allergen is not emphasized in ingredient list",
  "regulation": "EU Regulation 1169/2011 Article 21",
  "evidence": "...",
  "fix": "Emphasize the allergen name in the ingredient list"
}

가 됩니다.

13. 최종 Compliance 결과 구조

상용 서비스라면 이 정도가 좋습니다.

interface ComplianceResult {
  status:
    | 'PASS'
    | 'PASS_WITH_WARNINGS'
    | 'FAIL'
    | 'REVIEW_REQUIRED';

  score: number;

  jurisdiction: string;

  regulationVersion: string;

  criticalErrors: ComplianceFinding[];

  errors: ComplianceFinding[];

  warnings: ComplianceFinding[];

  passedRules: ComplianceFinding[];

  reviewRequired: ComplianceFinding[];

  missingInformation: string[];

  recommendedFixes: Fix[];

  evidence: Evidence[];

  evaluatedAt: string;
}

특히 REVIEW_REQUIRED를 별도로 만드는 것을 강력하게 권합니다.

AI나 규칙 엔진이 모든 법률적 판단을 자동화하면 안 되기 때문입니다.

14. 라벨 이미지 자체도 검사해야 함

현재 코드에는 이 부분이 없습니다.

상용 제품이라면 최종적으로:

제품 데이터
      ↓
Rule Engine
      ↓
Compliance
      ↓
Label Artwork
      ↓
OCR / Vision
      ↓
실제 인쇄 라벨 검사

가 되어야 합니다.

검사 항목:

 필수 정보가 실제 라벨에 존재
 ingredient list 누락
 allergen 강조
 글자 크기
 nutrition panel
 위치
 contrast
 날짜
 net quantity
 Arabic/Chinese/Japanese text
 OCR 오류
 artwork와 master data 불일치

EU의 경우 mandatory information의 표시와 글자 크기/배치까지 규정의 중요한 부분입니다.

15. 제가 추천하는 개발 Phase
Phase 1 — Core

공통 Engine

 Product model
 Ingredient model
 Nutrition model
 Allergen model
 Additive model
 Claim model
 Label model
 Rule model
 Rule evaluator
 severity
 evidence
 effective date
Phase 2 — 5개 국가
🇺🇸 US
 FDA
 USDA/FSIS
 Nutrition Facts
 9 allergens
 ingredient
 claims
 additives
 standards of identity
🇨🇳 CN
 GB 7718-2025
 GB 28050-2025
 SAMR
 GACC
 imported food
 allergens
 additives
 nutrition
 claims
 digital label
🇯🇵 JP
 CAA
 Food Labeling Standards
 allergen
 nutrition
 salt equivalent
 ingredient origin
 date
 functional claims
 FOSHU
🇪🇺 EU
 1169/2011
 Annex II allergens
 nutrition
 QUID
 additives
 origin
 claims
 nano
 Member State rules
🇦🇪 UAE
 GSO 9
 Arabic
 ingredient
 nutrition
 allergens
 origin
 dates
 Halal
 alcohol
 importer
 certification
16. 그리고 반드시 넣어야 할 “법규 변경 감지”

이 기능이 상용 서비스와 단순 개발 프로젝트를 구분하는 핵심입니다.

예를 들어:

2026-09-01
GB 7718 rule active

       ↓

2026-10-01
new amendment detected

       ↓

Rule Registry
       ↓
affected rules identified
       ↓
existing tests automatically re-run
       ↓
"37 products potentially affected"
       ↓
Compliance team review

즉:

effectiveFrom
effectiveTo
supersedes
supersededBy
source
lastVerified

가 모든 Rule에 있어야 합니다.

중국처럼 실제로 2025년 개정 표준과 2026년 감독 규정이 함께 변화하는 시장에서는 특히 중요합니다.

17. 최종적으로 제가 추천하는 DB 구조
regulations
├── regulation_id
├── jurisdiction
├── authority
├── title
├── version
├── effective_from
├── effective_to
└── source_url

rules
├── rule_id
├── regulation_id
├── category
├── severity
├── condition_json
├── action_json
├── effective_from
└── effective_to

ingredients
├── ingredient_id
├── canonical_name
├── aliases
├── category
└── regulatory_properties

allergens
├── allergen_id
├── jurisdiction
├── mandatory
├── recommended
└── declaration_rule

additives
├── additive_id
├── INS/E_number
├── jurisdiction
├── food_category
├── max_level
├── restriction
└── effective_date

claims
├── claim_id
├── phrase
├── jurisdiction
├── category
├── threshold
├── required_evidence
└── prohibited

translations
├── ingredient
├── country
├── language
└── approved_term
18. 핵심적으로 현재 코드에서 바꿔야 할 것

현재:

isAllergen: boolean

→

allergensByJurisdiction

현재:

country: 'US'

→

jurisdiction: {
  country: 'US',
  authority: 'FDA',
  productCategory: 'conventional_food',
  market: 'retail'
}

현재:

E171 → blocked

→

additive authorization matrix

현재:

alcoholPercentage > 0.05

→

alcoholRule(productCategory, ingredientSource,
            processingMethod, claim, jurisdiction)

현재:

score: 100

→

PASS
PASS_WITH_WARNINGS
FAIL
REVIEW_REQUIRED

그리고 각 오류마다 반드시 법적 근거를 반환:

Rule ID
↓
Regulation
↓
Article / Section
↓
현재 라벨의 문제
↓
왜 문제인지
↓
수정 방법
↓
출처

이렇게 만들어야 실제 기업에서 QA/RA팀이 사용할 수 있습니다.