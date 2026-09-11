import { ExportCountry, LabelIngredient } from '@/types/label';

export type ProductScopeCategory =
  | 'processed_general'       // 일반 가공식품
  | 'meat_cooked'             // 식육가공품 (소/돼지)
  | 'poultry'                 // 가금육 가공품 (닭/오리)
  | 'seafood'                 // 수산물 및 수산가공품
  | 'dairy'                   // 유가공품 (우유, 치즈)
  | 'beverage_non_alc'        // 비알코올 음료
  | 'alcohol_wine'            // 주류 및 조미주정
  | 'health_functional'       // 건강기능식품
  | 'frozen_foods'            // 냉동식품 (만두 등)
  | 'ready_to_eat'            // 즉석섭취/편의식 (RTE/RTH)
  | 'bakery'                  // 제과/제빵
  | 'sauces_condiments'       // 소스, 장류, 조미료
  | 'confectionery'           // 스낵, 캔디
  | 'noodles'                 // 면류 (라면, 건면)
  | 'kimchi_fermented'        // 김치, 절임, 발효식품
  | 'oil_fats'                // 식용유지류
  | 'canned_retort'           // 레토르트/통조림
  | 'special_diet'            // 특수용도식품 (영유아, 환자)
  | 'halal_food'              // 할랄 전용 식품
  | 'vegan_food';             // 비건/식물성 대체육

export interface JurisdictionResolution {
  country: ExportCountry;
  categoryScope: ProductScopeCategory;
  primaryAuthority: string;       // e.g. "USDA-FSIS", "US-FDA", "SAMR / GACC", "EC FIC / EFSA", "MoIAT / ESMA"
  secondaryAuthorities: string[]; // e.g. ["US Customs and Border Protection (CBP)"]
  applicableLaws: string[];
  requiresPreApproval: boolean;
  requiresFactoryRegistration: boolean;
  isExportRestricted: boolean;
  restrictionReason?: string;
  specialMandates: string[];
}

/**
 * Meat detection keywords for jurisdictional boundaries
 */
const RED_MEAT_KEYWORDS = ['소고기', '쇠고기', '돼지고기', '돈육', '우육', 'beef', 'pork', 'lard', '돈지', '우지'];
const POULTRY_KEYWORDS = ['닭고기', '계육', '오리고기', 'chicken', 'duck', 'poultry', 'turkey'];
const SEAFOOD_KEYWORDS = ['새우', '게', '오징어', '생선', '어육', 'shrimp', 'crab', 'squid', 'fish', 'tuna', 'salmon', 'clam', '조개'];

/**
 * Determine the exact scope category of a food item from its name, category, and ingredients
 */
export function resolveProductScope(
  categoryName: string,
  productName: string,
  ingredients: Array<Partial<LabelIngredient> & { ingredientNameKo: string; ratio?: number }>
): ProductScopeCategory {
  const combinedText = `${categoryName} ${productName} ${ingredients.map((i) => i.ingredientNameKo).join(' ')}`.toLowerCase();

  if (combinedText.includes('만두') || combinedText.includes('교자') || combinedText.includes('dumpling') || combinedText.includes('mandu')) {
    return 'frozen_foods';
  }
  if (combinedText.includes('김치') || combinedText.includes('kimchi') || combinedText.includes('깍두기')) {
    return 'kimchi_fermented';
  }
  if (combinedText.includes('주정') || combinedText.includes('미림') || combinedText.includes('소주') || combinedText.includes('alcohol') || combinedText.includes('wine')) {
    return 'alcohol_wine';
  }
  if (combinedText.includes('면') || combinedText.includes('라면') || combinedText.includes('noodle')) {
    return 'noodles';
  }
  if (combinedText.includes('비건') || combinedText.includes('대체육') || combinedText.includes('vegan') || combinedText.includes('plant-based')) {
    return 'vegan_food';
  }

  // Ingredient-based meat & seafood checks (Prioritize meat over condiments when meat is present)
  const hasRedMeat = ingredients.some((i) => RED_MEAT_KEYWORDS.some((k) => i.ingredientNameKo.toLowerCase().includes(k)));
  if (hasRedMeat) return 'meat_cooked';

  const hasPoultry = ingredients.some((i) => POULTRY_KEYWORDS.some((k) => i.ingredientNameKo.toLowerCase().includes(k)));
  if (hasPoultry) return 'poultry';

  const hasSeafood = ingredients.some((i) => SEAFOOD_KEYWORDS.some((k) => i.ingredientNameKo.toLowerCase().includes(k)));
  if (hasSeafood) return 'seafood';

  if (combinedText.includes('소스') || combinedText.includes('고추장') || combinedText.includes('된장') || combinedText.includes('간장') || combinedText.includes('sauce') || combinedText.includes('paste')) {
    return 'sauces_condiments';
  }

  return 'processed_general';
}

/**
 * Calculate total red meat and poultry percentages from ingredients
 */
export function calculateMeatPercentages(
  ingredients: Array<Partial<LabelIngredient> & { ingredientNameKo: string }>
): { redMeatPct: number; poultryPct: number; hasPork: boolean; hasBeef: boolean } {
  let redMeatPct = 0;
  let poultryPct = 0;
  let hasPork = false;
  let hasBeef = false;

  for (const ing of ingredients) {
    const ko = ing.ingredientNameKo.toLowerCase();
    const ratio = ing.ratio || 0;

    if (ko.includes('돼지') || ko.includes('돈') || ko.includes('pork') || ko.includes('lard')) {
      redMeatPct += ratio;
      hasPork = true;
    } else if (ko.includes('소고기') || ko.includes('쇠고기') || ko.includes('우육') || ko.includes('beef')) {
      redMeatPct += ratio;
      hasBeef = true;
    }

    if (POULTRY_KEYWORDS.some((k) => ko.includes(k))) {
      poultryPct += ratio;
    }
  }

  return { redMeatPct, poultryPct, hasPork, hasBeef };
}

/**
 * Enterprise Jurisdiction Resolver: Automatically determine the primary authority,
 * applicable laws, pre-market approvals, and trade restriction boundaries.
 */
export function resolveJurisdiction(params: {
  country: ExportCountry;
  productName: string;
  categoryName?: string;
  ingredients: Array<Partial<LabelIngredient> & { ingredientNameKo: string }>;
  netWeightG?: number;
}): JurisdictionResolution {
  const { country, productName, categoryName = '', ingredients } = params;
  const scope = resolveProductScope(categoryName, productName, ingredients);
  const { redMeatPct, poultryPct, hasPork } = calculateMeatPercentages(ingredients);

  // 1. UNITED STATES (US)
  if (country === 'US') {
    // USDA-FSIS Boundary: >= 2% cooked red meat / poultry or >= 3% raw meat
    const isUsdaBound = redMeatPct >= 2.0 || poultryPct >= 2.0;

    if (isUsdaBound) {
      return {
        country: 'US',
        categoryScope: scope,
        primaryAuthority: 'USDA-FSIS (Food Safety and Inspection Service)',
        secondaryAuthorities: ['US Customs and Border Protection (CBP)', 'FDA (for non-meat ingredients)'],
        applicableLaws: [
          'Federal Meat Inspection Act (FMIA) - 21 U.S.C. 601',
          'Poultry Products Inspection Act (PPIA) - 21 U.S.C. 451',
          '9 CFR Part 317 (Labeling, Marking Devices, and Containers)',
        ],
        requiresPreApproval: true,
        requiresFactoryRegistration: true,
        isExportRestricted: true,
        restrictionReason: `Meat ratio (${redMeatPct.toFixed(1)}%) >= 2.0% falls under USDA-FSIS jurisdiction. South Korea currently lacks an equivalence agreement for meat slaughterhouses with USDA-FSIS. Commercial import to US will be seized/rejected at port of entry.`,
        specialMandates: [
          'USDA FSIS Label Sketch Pre-Approval (Form 7234-1)',
          'USDA Establishment Number Inspection Legend',
          'Country of Origin Statement in PDP bottom 30%',
        ],
      };
    }

    // US-FDA Jurisdiction (< 2% meat or seafood / vegetable)
    return {
      country: 'US',
      categoryScope: scope,
      primaryAuthority: 'US FDA (Center for Food Safety and Applied Nutrition)',
      secondaryAuthorities: ['US CBP (Customs)', 'FTC (Advertising & Packaging)'],
      applicableLaws: [
        'Federal Food, Drug, and Cosmetic Act (FD&C Act) - 21 U.S.C. 301',
        'Food Allergen Labeling and Consumer Protection Act (FALCPA 2004)',
        'Food Allergy Safety, Treatment, Education, and Research Act (FASTER Act 2021/2023 - Sesame)',
        'FDA 2016 Nutrition Facts Labeling Final Rule (21 CFR 101.9)',
      ],
      requiresPreApproval: false,
      requiresFactoryRegistration: true,
      isExportRestricted: false,
      specialMandates: [
        'FDA Food Facility Registration (FFRN 11-digit) required prior to shipment',
        'Prior Notice of Imported Foods (PN) filed with FDA & CBP',
        'CONTAINS: box mandatory for 9 major allergens (FASTER Act Sesame included)',
        'Net quantity declaration in dual units (oz and g) in lower 30% of PDP',
      ],
    };
  }

  // 2. CHINA (CN)
  if (country === 'CN') {
    const isGaccHighRisk = ['frozen_foods', 'meat_cooked', 'seafood', 'dairy', 'noodles', 'kimchi_fermented'].includes(scope);

    return {
      country: 'CN',
      categoryScope: scope,
      primaryAuthority: 'GACC (General Administration of Customs China) & SAMR',
      secondaryAuthorities: ['National Health Commission (NHC)'],
      applicableLaws: [
        'GACC Decree No. 248 (Provisions on Registration of Overseas Manufacturers)',
        'GACC Decree No. 249 (Administrative Measures on Import and Export Food Safety)',
        'GB 7718-2025 (General Standard for the Labeling of Prepackaged Foods)',
        'GB 28050-2025 (Standard for Nutrition Labeling of Prepackaged Foods)',
      ],
      requiresPreApproval: isGaccHighRisk,
      requiresFactoryRegistration: true,
      isExportRestricted: false,
      specialMandates: [
        '18-digit GACC overseas manufacturer registration code must be printed on inner and outer packaging',
        'GB 7718-2025: Absolute prohibition of zero-additive claims ("零添加", "不添加")',
        'GB 28050: Mandatory energy in kJ and 5 core nutrient NRV% table',
        'Mandatory Simplified Chinese with Chinese national standard character set',
      ],
    };
  }

  // 3. JAPAN (JP)
  if (country === 'JP') {
    return {
      country: 'JP',
      categoryScope: scope,
      primaryAuthority: 'Consumer Affairs Agency (CAA, 消費者庁)',
      secondaryAuthorities: ['MHLW (Ministry of Health, Labour and Welfare)', 'MAFF (Ministry of Agriculture, Forestry and Fisheries)'],
      applicableLaws: [
        'Food Labeling Act (食品表示法, Act No. 70 of 2013)',
        'Food Sanitation Act (食品衛生法)',
        'CAA Allergen Labeling Standards (8 Specific Raw Materials + 2025 Cashew Nut)',
      ],
      requiresPreApproval: false,
      requiresFactoryRegistration: false,
      isExportRestricted: false,
      specialMandates: [
        'Mandatory salt equivalent (食塩相当量 = Na * 2.54 / 1000) declaration instead of raw sodium',
        'Strict ban on speculative allergen warnings ("入っているかもしれない")',
        'Mandatory 8 allergens + Cashew nut 2025 mandatory transition',
        'Japanese font size >= 8pt (or 5.5pt for display area < 150cm²)',
      ],
    };
  }

  // 4. EUROPEAN UNION (EU)
  if (country === 'EU') {
    return {
      country: 'EU',
      categoryScope: scope,
      primaryAuthority: 'European Commission (DG SANTE) & EFSA',
      secondaryAuthorities: ['National Member State Customs & Food Safety Inspectorates'],
      applicableLaws: [
        'Regulation (EU) No 1169/2011 on Food Information to Consumers (FIC)',
        'Regulation (EC) No 1333/2008 on Food Additives',
        'Commission Regulation (EU) 2022/63 (Titanium Dioxide E171 Ban)',
        'Regulation (EC) No 178/2002 (General Food Law)',
      ],
      requiresPreApproval: false,
      requiresFactoryRegistration: true,
      isExportRestricted: false,
      specialMandates: [
        'Complete prohibition of E171 (Titanium Dioxide) in food formulations',
        'Dual energy declaration in kJ and kcal per 100g / 100ml',
        '14 major allergens emphasized in ingredients list using contrasting font/bold',
        'QUID (Quantitative Ingredient Declaration, Article 22) for highlighted components',
        'Minimum x-height: 1.2mm (or 0.9mm for packaging < 80cm²)',
      ],
    };
  }

  // 5. UNITED ARAB EMIRATES & GCC (UAE)
  return {
    country: 'UAE',
    categoryScope: scope,
    primaryAuthority: 'Ministry of Industry and Advanced Technology (MoIAT) & ESMA',
    secondaryAuthorities: ['Dubai Municipality Food Safety Department', 'GCC Standardization Organization (GSO)'],
    applicableLaws: [
      'GSO 2055-1 (Halal Food General Requirements)',
      'GSO 9/2013 (Labeling of Prepackaged Foodstuffs)',
      'UAE Cabinet Resolution on Traffic Light Nutrition Labeling',
      'UAE Sharia Alcohol Threshold Standard (Max 0.05% residual)',
    ],
    requiresPreApproval: true,
    requiresFactoryRegistration: true,
    isExportRestricted: hasPork,
    restrictionReason: hasPork
      ? 'Pork and porcine-derived ingredients are strictly forbidden (Haram) in the UAE/GCC Halal food chain.'
      : undefined,
    specialMandates: [
      'Alcohol content must strictly remain <= 0.05% residual (GSO 2055-1)',
      'MoIAT recognized Halal Certification Body (HCB) certificate number',
      'Arabic language mandatory with natural Right-to-Left (RTL) reading layout',
      '4-nutrient traffic light front-of-pack indicator (Red/Amber/Green)',
    ],
  };
}
