/**
 * 송영민푸드 (Song Youngmin Food) 글로벌 식품 마스터 라벨링 시스템 타입 정의
 * 5대 수출 대상국: 미국(US), 중국(CN), 일본(JP), EU, UAE
 */

export type ExportCountry = 'US' | 'CN' | 'JP' | 'EU' | 'UAE';
export type TargetCountry = ExportCountry;

export type LabelStatus = 'draft' | 'review_pending' | 'warning' | 'compliant' | 'rejected';

export type BarcodeType = 'EAN-13' | 'UPC-A' | 'QR-Code' | 'GS1-128' | 'QR';

export interface ManufacturerInfo {
  name: string;
  nameEn?: string;
  address?: string;
  addressEn?: string;
  country?: string;
  tel?: string;
  email?: string;
}

export interface ImporterInfo {
  name?: string;
  address?: string;
  country?: string;
  licenseNumber?: string;
  contact?: string;
  buyerToFill?: boolean;
}

export interface RegistrationNumbers {
  gaccCode?: string;         // 중국 GACC 해외제조업체 18자리 등록번호
  gaccRegNo?: string;        // 별칭 호환
  fdaFce?: string;           // 미국 FDA 공장등록 (FCE / FFR)
  fdaFacilityNo?: string;    // 미국 FDA 시설번호 별칭 호환
  halalCertNo?: string;      // UAE / GSO 공인 할랄 인증 번호
  euEstablishmentNo?: string;// EU 작업장 등록번호
  euApprovalNo?: string;     // EU 작업장 승인번호 별칭 호환
  japanImportNoticeNo?: string;
}

export interface LabelIngredient {
  id?: string;
  labelId?: string;
  ingredientNameKo: string;
  ingredientNameTarget: string; // 수출국 현지 언어 표기명
  ratio: number;                // 배합비 중량 (%)
  subIngredients?: string;      // 복합원재료 하위 성분
  insOrENumber?: string;        // 식품첨가물 번호 (E621, INS 500 등)
  isAllergen: boolean;          // 대상국 기준 알레르겐 여부
  allergenCategory?: string;    // 참깨, 밀, 대두, 호두, 캐슈넛 등
  allergenOrigin?: string;      // 유래 원천
  isHighlyRefinedOil?: boolean; // 고도정제유 FALCPA 면제 여부
  displayOrder?: number;
  orderIndex?: number;          // 별칭 호환
}

export interface LabelNutrition {
  id?: string;
  labelId?: string;
  servingSizeG: number;         // 1회 섭취참고량 (g 또는 ml)
  servingSizeUnit?: string;     // 'g' | 'ml' | 'piece'
  servingSizeHousehold?: string;// 예: "4 pieces (120g)"
  servingsPerContainer?: number;// 총 내용량당 제공 횟수
  isDualColumn?: boolean;       // 미국 1회 제공량 vs 총 내용량 이중 열 표기

  // 기본 영양 성분 (1회 제공량 기준)
  caloriesKcal: number;
  caloriesKj?: number;          // EU 의무 표기 (1 kcal = 4.184 kJ)
  energyKj?: number;            // 별칭 호환
  totalFatG: number;
  saturatedFatG: number;
  transFatG?: number;           // 미국 필수
  cholesterolMg?: number;
  sodiumMg: number;
  saltEquivalentG?: number;     // 일본/EU 의무 (Na * 2.54 / 1000)
  totalCarbohydrateG: number;
  dietaryFiberG?: number;
  totalSugarsG: number;
  addedSugarsG?: number;        // 미국 필수
  proteinG: number;

  // 미량 영양소
  vitaminDMcg?: number;         // 미국 필수
  calciumMg?: number;
  ironMg?: number;
  potassiumMg?: number;         // 미국 필수

  // 권역별 특화 지표
  nrvPercentages?: Record<string, number>;     // 중국 GB 28050 NRV%
  trafficLightRatings?: {                      // UAE 신호등 라벨
    fat: 'green' | 'amber' | 'red';
    saturatedFat: 'green' | 'amber' | 'red';
    sugars: 'green' | 'amber' | 'red';
    salt: 'green' | 'amber' | 'red';
  };
  trafficLightColor?: any;
  dailyValuePercentages?: any;
}

export interface ComplianceViolation {
  code: string;
  field: string;
  severity: 'critical' | 'warning';
  message: string;
  solution: string;
}

export interface LabelComplianceLog {
  id?: string;
  labelId?: string;
  jurisdiction: string;         // 'FDA', 'USDA-FSIS', 'GACC', 'CAA', 'EFSA', 'MoIAT'
  isCompliant: boolean;
  score: number;                // 0 ~ 100
  criticalErrors: ComplianceViolation[];
  warnings: ComplianceViolation[];
  checkedAt?: string;
}

export type DateFormatType = 'YYYY/MM/DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';

export interface BlockHeaderData {
  hsCode?: string;
  productNameKo?: string;
  productNameEn?: string;
  productNameTarget?: string;
  legalProductType?: string;
}

export interface BlockPdpData {
  netWeightG?: number;
  netWeightCustom?: string;
  claimHighlights?: string[];
  certifications?: string[];
}

export interface BlockInfoPanelData {
  containsAllergensStatement?: string;
  mayContainStatement?: string;
  storageConditionKo?: string;
  storageConditionTarget?: string;
  manufacturerName?: string;
  importerDistributorText?: string;
}

export interface BlockDatingData {
  dateFormat?: DateFormatType;
  shelfLifeDays?: number;
  lotFormatTemplate?: string;
}

export interface BlockBarcodeData {
  barcodeType?: BarcodeType;
  barcodeNumber?: string;
  recyclingMarks?: string[];
  registrationNumbers?: {
    fdaFacilityNo?: string;
    gaccRegNo?: string;
    halalCertNo?: string;
    euApprovalNo?: string;
  };
}

export interface FoodLabel {
  id: string;
  productId: string;
  country: ExportCountry;
  version: number;
  status: LabelStatus;

  // 1. Header Block
  hsCode?: string;
  productNameLocal?: string;
  productNameEn?: string;
  productCategoryLocal?: string;

  // 2. PDP Block (주표시면)
  netWeightG?: number;
  netWeightOz?: number;
  packageAreaCm2?: number;      // 포장 표면적 (EU 폰트 0.9mm / 1.2mm 판정용)
  isShelfStable?: boolean;      // 상온보관 여부
  claimsBadges?: string[];      // ['Vegan', 'Halal', 'Non-GMO', 'No Added MSG']
  servingSuggestion?: string;   // 조리예

  // 3. Information Panel Block (정보표시면)
  storageInstructions?: string;
  cookingInstructions?: string;
  manufacturerInfo?: ManufacturerInfo;
  importerInfo?: ImporterInfo;
  registrationNumbers?: RegistrationNumbers;
  alcoholPercentage?: number;   // 잔류 알코올 함량 (%)

  // 4. Dating & Lot Block
  dateMarkingType?: string;     // 'MM/DD/YYYY' | 'YYYY/MM/DD' | 'DD/MM/YYYY'
  dateMarkingText?: string;
  shelfLifeMonths?: number;

  // 5. Barcode & Package
  barcodeType?: BarcodeType;
  barcodeNumber?: string;
  packagingMaterial?: string;
  recyclingSymbols?: string[];

  // 6대 표준 블록 구조체 (Studio 에디터)
  header?: BlockHeaderData;
  pdp?: BlockPdpData;
  informationPanel?: BlockInfoPanelData;
  datingLot?: BlockDatingData;
  barcodeMarking?: BlockBarcodeData;

  // 연관 관계
  ingredients?: LabelIngredient[];
  nutrition?: LabelNutrition;
  compliance?: LabelComplianceLog;

  createdAt?: string;
  updatedAt?: string;
}

export interface LabelSummaryItem {
  id: string;
  productId: string;
  productNameKo: string;
  productNameEn: string;
  productImage: string;
  category: string;
  countryLabels: Record<ExportCountry, {
    labelId?: string;
    status: LabelStatus;
    score: number;
    hasCritical: boolean;
  }>;
}
