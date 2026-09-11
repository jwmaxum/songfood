import { ExportCountry, FoodLabel, LabelIngredient } from '@/types/label';
import { RedFlagItem } from '../types';

export interface SubIngredientItem {
  nameKo?: string;
  name?: string;
  nameEn?: string;
  ratioInCompound?: number;
  ratio?: number;
  isAllergen?: boolean;
  allergenCategory?: string;
  insOrENumber?: string;
}

export interface IntelligentIngredient extends Omit<Partial<LabelIngredient>, 'subIngredients'> {
  name?: string;
  ingredientNameKo?: string;
  ingredientNameTarget?: string;
  ratio?: number;
  origin?: string;
  originCountry?: string;
  isCompound?: boolean;
  subIngredients?: SubIngredientItem[] | string;
  subIngredientsText?: string;
  allergenContained?: string;
  isProcessingAid?: boolean;
  isCarryOver?: boolean;
  function?: string;
  derivedFromAllergen?: string;
  disclosedOnLabel?: boolean;
}

export interface ProcessingAidItem {
  name: string;
  function?: string;
  derivedFromAllergen?: string;
  disclosedOnLabel?: boolean;
}

export interface IngredientIntelligenceOptions {
  countryCode?: string;
  country?: ExportCountry;
  productOrigin?: string;
  ingredients: IntelligentIngredient[];
  processingAids?: ProcessingAidItem[];
  rawIngredientsText?: string;
  originMarking?: string;
}

// Helper to normalize ingredient properties
function normalizeIngredient(ing: IntelligentIngredient): IntelligentIngredient {
  const nameKo = ing.ingredientNameKo || ing.name || '';
  const origin = ing.originCountry || ing.origin || '';
  return {
    ...ing,
    ingredientNameKo: nameKo,
    ingredientNameTarget: ing.ingredientNameTarget || nameKo,
    originCountry: origin,
  };
}

/**
 * 1. Validate Compound Ingredients 5% Rule
 * - Codex STAN 1-1985 / EU FIC 1169/2011 / KR / JP:
 *   Compound ingredient >= 5% ➔ Must declare all sub-ingredients.
 *   Compound ingredient < 5% ➔ May omit sub-ingredients UNLESS they contain allergens.
 */
export function validateCompoundIngredients(
  target: FoodLabel | IntelligentIngredient[],
  secondArg?: ExportCountry | IntelligentIngredient[] | string
): RedFlagItem[] {
  const flags: RedFlagItem[] = [];

  let country: string = 'US';
  let rawIngredients: IntelligentIngredient[] = [];

  if (Array.isArray(target)) {
    rawIngredients = target;
    if (typeof secondArg === 'string') {
      country = secondArg;
    }
  } else {
    country = target.country;
    if (Array.isArray(secondArg)) {
      rawIngredients = secondArg;
    } else {
      rawIngredients = (target.ingredients as IntelligentIngredient[]) || [];
    }
  }

  const ingredients = rawIngredients.map(normalizeIngredient);

  for (const ing of ingredients) {
    const isCompound =
      Boolean(ing.isCompound) ||
      (Array.isArray(ing.subIngredients) && ing.subIngredients.length > 0) ||
      Boolean(ing.subIngredientsText) ||
      /양념|소스|간장|혼합|베이스|씨즈닝|시즈닝|분말|curry|sauce|paste|seasoning|powder/i.test(
        ing.ingredientNameKo || ''
      );

    if (!isCompound) continue;

    const ratio = ing.ratio ?? 0;
    const subList = Array.isArray(ing.subIngredients) ? ing.subIngredients : [];
    const hasSubList = subList.length > 0;
    const hasSubText = Boolean(
      (typeof ing.subIngredients === 'string' && ing.subIngredients.trim().length > 0) ||
      (ing.subIngredientsText && ing.subIngredientsText.trim().length > 0)
    );
    const hasExplicitSub = hasSubList || hasSubText;

    // Rule A: Compound ingredient >= 5% requires sub-ingredient declaration
    if (ratio >= 5.0 && !hasExplicitSub) {
      flags.push({
        code: 'COMMON-CRIT-COMPOUND-SUB-INGREDIENT-MISSING',
        field: 'ingredients.subIngredients',
        severity: 'critical',
        title: `[${country}] 5% 이상 복합원재료 하위 성분 미전개: ${ing.ingredientNameKo}`,
        message: `완제품 배합비 5% 이상인 복합원재료 "${ing.ingredientNameKo}"(${ratio}%)는 하위 구성 원재료(Sub-ingredients)를 라벨에 반드시 괄호 전개 표기하여야 합니다.`,
        solution: `"${ing.ingredientNameKo}"의 하위 배합 원재료를 괄호(예: "${ing.ingredientNameKo}[원료A, 원료B...]")로 명시하십시오.`,
        lawReference: 'CODEX STAN 1-1985 Section 4.2.1.3 / EU FIC Regulation 1169/2011 Annex VII Part E',
        ruleId: 'GLOBAL-COMPOUND-5PCT-RULE',
        whyProblem: '복합원재료가 5% 이상일 경우 소비자의 알 권리와 안전을 위해 구성 성분 전개가 전 세계 공통 의무입니다.',
        howToFix: '원재료 관리자 화면에서 해당 복합원재료의 하위 성분 목록을 입력하십시오.',
        authority: country,
      });
    }

    // Rule B: Compound ingredient < 5% MUST STILL declare allergens if present
    if (ratio < 5.0) {
      const hasAllergenInSub =
        Boolean(ing.allergenContained && ing.allergenContained.trim().length > 0) ||
        subList.some((s) => s.isAllergen) ||
        /대두|밀|우유|계란|새우|게|참깨|땅콩|호두|soy|wheat|milk|egg|sesame/i.test(
          typeof ing.subIngredients === 'string' ? ing.subIngredients : ing.subIngredientsText || ''
        );

      if (hasAllergenInSub && !hasExplicitSub) {
        flags.push({
          code: 'COMMON-CRIT-COMPOUND-ALLERGEN-SUB-MANDATORY',
          field: 'ingredients.subIngredients',
          severity: 'critical',
          title: `[${country}] 5% 미만 복합원재료 내 알레르겐 성분 누락: ${ing.ingredientNameKo}`,
          message: `복합원재료 "${ing.ingredientNameKo}"의 배합비(${ratio}%)가 5% 미만이라도, 하위 성분에 법정 알레르겐이 포함되어 있다면 전개 표기가 법적으로 강제됩니다.`,
          solution: `복합원재료 내 함유된 알레르겐 유래 성분을 명시하거나 Contains 고지란에 반영하십시오.`,
          lawReference: 'FALCPA 2004 / EU FIC 1169/2011 Article 21 / GB 7718-2025',
          ruleId: 'GLOBAL-COMPOUND-ALLERGEN-EXCEPTION',
          whyProblem: '5% 룰 면제 조항은 알레르겐 표시 의무에 우선할 수 없습니다.',
          howToFix: '하위 성분 중 알레르겐 성분을 라벨 원재료란에 명시하십시오.',
          authority: country,
        });
      }
    }
  }

  return flags;
}

/**
 * 2. Validate Processing Aids & Carry-Over Additives
 * - Processing aids are exempt from labeling UNLESS derived from major allergens.
 */
export function validateProcessingAids(
  target: FoodLabel | ProcessingAidItem[] | IntelligentIngredient[],
  arg2?: string | IntelligentIngredient[],
  arg3?: string
): RedFlagItem[] {
  const flags: RedFlagItem[] = [];

  let aids: Array<ProcessingAidItem | IntelligentIngredient> = [];
  let rawText = '';
  let country = 'US';

  if (Array.isArray(target)) {
    aids = target as Array<ProcessingAidItem | IntelligentIngredient>;
    if (typeof arg2 === 'string') rawText = arg2;
    if (typeof arg3 === 'string') country = arg3;
  } else {
    country = target.country;
    if (Array.isArray(arg2)) {
      aids = arg2;
    } else {
      aids = (target.ingredients as IntelligentIngredient[]) || [];
    }
    rawText = JSON.stringify(target);
  }

  for (const aid of aids) {
    const aidName = ('name' in aid ? aid.name : aid.ingredientNameKo) || '';
    const aidDerived = aid.derivedFromAllergen || '';
    const isProcessingAid =
      ('isProcessingAid' in aid ? aid.isProcessingAid : true) ||
      Boolean(aid.function && /여과|탈색|소포|추출|촉매|조제/i.test(aid.function));

    if (!isProcessingAid) continue;

    const isAllergenDerived =
      aidDerived.trim().length > 0 ||
      ('isAllergen' in aid && aid.isAllergen) ||
      /난백|달걀|계란|우유|카제인|밀|소맥|대두|egg|milk|casein|wheat|lysozyme/i.test(aidName);

    const isDisclosed =
      Boolean(aid.disclosedOnLabel) ||
      (rawText.length > 0 &&
        (rawText.toLowerCase().includes(aidName.toLowerCase()) ||
          (aidDerived && rawText.toLowerCase().includes(aidDerived.toLowerCase()))));

    if (isAllergenDerived && !isDisclosed) {
      flags.push({
        code: 'COMMON-CRIT-PROCESSING-AID-ALLERGEN-UNDISCLOSED',
        field: 'ingredients.processingAid',
        severity: 'critical',
        title: `[${country}] 알레르겐 유래 가공조제 고지 누락: ${aidName}`,
        message: `가공조제(Processing Aid)는 통상 라벨 표기가 면제되나, 법정 알레르겐 유래 성분(${aidName})인 경우 라벨 고지 의무가 절대 면제되지 않습니다.`,
        solution: `원재료명 또는 Contains 알레르겐 고지란에 "${aidName}"(${aidDerived || '알레르겐 유래'})를 고지하십시오.`,
        lawReference: 'Codex STAN 1-1985 / 21 CFR 101.100(a)(3) / EU FIC Art. 20',
        ruleId: 'GLOBAL-PROCESSING-AID-ALLERGEN-MANDATORY',
        whyProblem: '가공조제라도 알레르겐 단백질이 미량 잔류할 수 있어 아나필락시스를 유발할 수 있습니다.',
        howToFix: '원재료 또는 알레르겐 표시란에 해당 가공조제 명칭을 기재하십시오.',
        authority: country,
      });
    } else if (!isAllergenDerived) {
      flags.push({
        code: 'COMMON-INFO-PROCESSING-AID-EXEMPTION',
        field: 'ingredients.processingAid',
        severity: 'info',
        title: `[${country}] 가공조제 표기 면제 인정: ${aidName}`,
        message: `알레르겐과 무관한 일반 가공조제("${aidName}")는 최종 제품에 기술적 잔류 효과가 없으므로 라벨 원재료 표기가 면제됩니다.`,
        solution: '별도의 추가 조치가 필요하지 않습니다.',
        lawReference: 'Codex STAN 1-1985 Section 4.2.4.2',
        ruleId: 'GLOBAL-PROCESSING-AID-EXEMPTION',
        whyProblem: '단순 안내 정보입니다.',
        howToFix: '조치 불필요',
        authority: country,
      });
    }
  }

  return flags;
}

/**
 * 3. Validate Country of Origin Labeling (COOL)
 * - JP: Japan CAA Primary Ingredient (No. 1 by weight) Country of Origin Labeling mandatory.
 * - EU: Article 26 Primary Ingredient Origin Mismatch warning.
 * - US: 19 U.S.C. 1304 "Product of Korea" marking.
 */
export function validateCountryOfOrigin(
  target: FoodLabel | IntelligentIngredient[],
  arg2?: string | IntelligentIngredient[],
  arg3?: string,
  arg4?: string,
  arg5?: string
): RedFlagItem[] {
  const flags: RedFlagItem[] = [];

  let country = 'US';
  let rawIngredients: IntelligentIngredient[] = [];
  let productOrigin = 'KR';
  let rawText = '';
  let originMarking = '';

  if (Array.isArray(target)) {
    rawIngredients = target;
    if (typeof arg2 === 'string') country = arg2;
    if (typeof arg3 === 'string') productOrigin = arg3;
    if (typeof arg4 === 'string') rawText = arg4;
    if (typeof arg5 === 'string') originMarking = arg5;
  } else {
    country = target.country;
    if (Array.isArray(arg2)) {
      rawIngredients = arg2;
    } else {
      rawIngredients = (target.ingredients as IntelligentIngredient[]) || [];
    }
    rawText = JSON.stringify(target);
    originMarking = rawText;
  }

  if (rawIngredients.length === 0) return flags;

  const ingredients = rawIngredients.map(normalizeIngredient);
  const sorted = [...ingredients].sort((a, b) => (b.ratio || 0) - (a.ratio || 0));
  const primaryIng = sorted[0];

  // --- A. Japan (JP) CAA Primary Ingredient Origin Rule ---
  if (country === 'JP') {
    const origin = (primaryIng.originCountry || primaryIng.origin || '').trim();
    const primaryName = `${primaryIng.ingredientNameTarget || ''} ${primaryIng.ingredientNameKo || ''}`.toLowerCase();

    // Check if origin is explicitly stated in origin field OR in primary ingredient text (e.g. "豚肉(韓国産)")
    const hasOriginInPrimary =
      origin.length > 0 ||
      /国産|韓国産|外国産|中国産|アメリカ産|豪州産|korean?|japanese?|chinese/i.test(primaryName);

    const hasOriginInRaw =
      Boolean(rawText && /韓国産|国産|外国産|中国産|アメリカ産|豪州産/i.test(rawText));

    const hasOriginDeclared = hasOriginInPrimary || hasOriginInRaw;

    if (!hasOriginDeclared) {
      flags.push({
        code: 'JP-CRIT-PRIMARY-INGREDIENT-ORIGIN-MISSING',
        field: 'ingredients.originCountry',
        severity: 'critical',
        title: `[JP] 일본 식품표시법 제3조 위반: 1위 주원재료 원산지 표기 누락 (${primaryIng.ingredientNameKo})`,
        message: `일본 소비자청(CAA) 가공식품 원재료 원산지 표시제에 따라, 배합비 1위 원재료인 "${primaryIng.ingredientNameKo}"(${primaryIng.ratio}%)는 원재료명 옆에 원산지(예: "${primaryIng.ingredientNameKo}(韓国産)" 또는 "(国産)")를 의무적으로 표기해야 합니다.`,
        solution: `1위 원재료란에 원산지 국가(예: "${primaryIng.ingredientNameKo}(韓国産)")를 괄호 명시하십시오.`,
        lawReference: '일본 소비자청 식품표시법 시행규칙 제3조 (가공식품 원재료 원산지 표시)',
        ruleId: 'JP-CAA-PRIMARY-INGREDIENT-COOL',
        whyProblem: '일본으로 수출되는 모든 가공식품은 배합비 1위 원료의 원산지 미표기 시 세관 통관 거부 및 회수 조치됩니다.',
        howToFix: '원재료란의 1위 원료에 원산지 국가명을 기재하십시오.',
        authority: '일본 소비자청 (CAA)',
      });
    }
  }

  // --- B. EU Article 26(3) Primary Ingredient Origin Mismatch Rule ---
  if (country === 'EU') {
    const primaryOrigin = (primaryIng.originCountry || '').toUpperCase();
    const isMismatch =
      primaryOrigin &&
      !['KR', 'KOREA', '한국', '한국산'].includes(primaryOrigin) &&
      (primaryIng.ratio || 0) >= 50.0;

    if (isMismatch) {
      flags.push({
        code: 'EU-WARN-PRIMARY-INGREDIENT-ORIGIN-MISMATCH',
        field: 'ingredients.originCountry',
        severity: 'warning',
        title: `[EU] 주원재료 원산지 불일치 고지 권고: ${primaryIng.ingredientNameKo} (${primaryIng.originCountry})`,
        message: `완제품 원산지는 한국(${productOrigin})이나, 배합비 50% 이상인 주원재료(${primaryIng.ingredientNameKo})의 원산지가 "${primaryIng.originCountry}"로 상이합니다. Regulation (EU) 2018/775에 따라 주원료의 원산지를 병기하여야 합니다.`,
        solution: `라벨 하단에 "The primary ingredient (${primaryIng.ingredientNameKo}) does not originate from Korea" 또는 실제 원산지를 명시하십시오.`,
        lawReference: 'Regulation (EU) No 1169/2011 Article 26(3) & Implementing Regulation (EU) 2018/775',
        ruleId: 'EU-FIC-ARTICLE-26-ORIGIN-MISMATCH',
        whyProblem: '주원료 원산지와 완제품 원산지가 불일치할 때 고지하지 않으면 소비자 오인 유발로 간주됩니다.',
        howToFix: '주원재료의 실제 원산지를 라벨에 명시하십시오.',
        authority: 'European Commission',
      });
    }
  }

  // --- C. USA 19 U.S.C. 1304 Country of Origin Marking ---
  if (country === 'US') {
    const rawAll = (originMarking + ' ' + rawText).toLowerCase();
    const hasOriginMarking =
      rawAll.includes('product of korea') ||
      rawAll.includes('made in korea') ||
      rawAll.includes('korean');

    if (!hasOriginMarking) {
      flags.push({
        code: 'US-INFO-COUNTRY-OF-ORIGIN-MARKING-RECOMMENDED',
        field: 'blocks.header',
        severity: 'info',
        title: '[US] 미국 세관 19 U.S.C. 1304 원산지 마킹 확인 권고: "Product of Korea"',
        message: '미국 관세법에 따라 수입식품의 주표시면(PDP) 또는 정보표시면에 "Product of Korea"가 눈에 띄는 영문 폰트로 명시되어야 합니다.',
        solution: '라벨 하단 또는 정보표시면에 "Product of Korea"를 명기하십시오.',
        lawReference: '19 U.S.C. 1304 / 19 CFR Part 134',
        ruleId: 'US-CBP-COUNTRY-OF-ORIGIN-MARKING',
        whyProblem: '원산지 마킹 누락 시 미국 세관(CBP) 입항 검사에서 보류(Notice to Redeliver)될 수 있습니다.',
        howToFix: '라벨 하단에 "Product of Korea" 문구를 추가하십시오.',
        authority: 'US Customs and Border Protection (CBP)',
      });
    }
  }

  return flags;
}

/**
 * Comprehensive Ingredient Intelligence Validator
 */
export function validateIngredientIntelligence(
  input: FoodLabel | IngredientIntelligenceOptions,
  customIngredients?: IntelligentIngredient[]
): RedFlagItem[] {
  if ('ingredients' in input && !('productId' in input)) {
    const opts = input as IngredientIntelligenceOptions;
    const country = (opts.country || opts.countryCode || 'US') as ExportCountry;
    const flags: RedFlagItem[] = [];
    flags.push(...validateCompoundIngredients(opts.ingredients, country));
    if (opts.processingAids) {
      flags.push(...validateProcessingAids(opts.processingAids, opts.rawIngredientsText || '', country));
    }
    flags.push(
      ...validateCountryOfOrigin(
        opts.ingredients,
        country,
        opts.productOrigin || 'KR',
        opts.rawIngredientsText || '',
        opts.originMarking || ''
      )
    );
    return flags;
  }

  const label = input as FoodLabel;
  return [
    ...validateCompoundIngredients(label, customIngredients),
    ...validateProcessingAids(label, customIngredients),
    ...validateCountryOfOrigin(label, customIngredients),
  ];
}
