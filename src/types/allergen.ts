import { ExportCountry } from './label';

export type AllergenCategory =
  | 'WHEAT'
  | 'SOY'
  | 'SESAME'
  | 'TREE_NUT'
  | 'PEANUT'
  | 'MILK'
  | 'EGG'
  | 'FISH'
  | 'CRUSTACEAN'
  | 'MOLLUSC'
  | 'CELERY'
  | 'MUSTARD'
  | 'LUPIN'
  | 'SULPHITE'
  | 'BUCKWHEAT'
  | 'PORK'
  | 'BEEF'
  | 'CHICKEN'
  | 'PEACH'
  | 'TOMATO'
  | 'WALNUT'
  | 'CASHEW';

export interface AllergenSourceItem {
  jurisdiction: ExportCountry;
  allergenKey: AllergenCategory | string; // 예: 'WHEAT', 'SESAME', 'TREE_NUT'
  sourceIngredientNameKo: string;         // 원천 한국어 원재료명 (예: '소맥분', '탈지대두')
  sourceIngredientNameTarget?: string;    // 수출국 표기명 (예: 'Wheat Flour', 'De-fatted Soybean')
  specificSpeciesRequired?: boolean;     // 견과류/어류/갑각류 구체 수종 명시 필요 여부 (21 CFR 101.4)
  speciesNameEn?: string;                // 구체 어종/수종 영문명 (예: 'Walnut', 'Almond', 'Atlantic Salmon', 'Crab')
  declarationRequired: boolean;          // 해당 국가 법정 의무 표기 대상 여부
  emphasisType: 'CONTAINS_BOX' | 'BOLD_IN_LIST' | 'SPECIFIC_RAW_MATERIAL' | 'STANDARD';
}

export interface AllergenDeclarationAudit {
  declaredContains: string[];             // 정식 선언된 알레르겐 (Contains 목록)
  declaredAdvisory: string[];             // 교차오염 주의문구 (May Contain 목록)
  unDeclaredFromIngredients: AllergenSourceItem[]; // 원재료에서 검출되었으나 미선언된 항목
  illegalAdvisoryReplacements: string[];  // 원재료에 배합되었는데 May Contain으로 위장한 항목
  isFullyCompliant: boolean;
}
