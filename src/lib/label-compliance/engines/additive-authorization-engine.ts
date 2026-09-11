import { ExportCountry, FoodLabel, LabelIngredient } from '@/types/label';
import { RedFlagItem, ValidationInput } from '../types';
import additiveDb from '../data/additive-matrix-db.json';

export interface AdditiveAuthorizationEntry {
  insOrENumber: string;
  canonicalName: string;
  nameKo: string;
  functionalClass: string;
  jurisdiction: ExportCountry;
  authorizedCategories: string[];
  isQuantumSatis: boolean;
  maxLevelPpm: number;
  status: 'AUTHORIZED' | 'RESTRICTED' | 'PROHIBITED';
  labelingRequirement: string;
  regulationSource: string;
}

const ADDITIVE_MATRIX: AdditiveAuthorizationEntry[] = additiveDb as AdditiveAuthorizationEntry[];

/**
 * Normalizes an additive code or name for searching in the matrix
 */
export function normalizeAdditiveCode(input: string): string {
  if (!input) return '';
  const trimmed = input.trim().toUpperCase();

  // Handle formats like "INS 202" -> "E202", "INS202" -> "E202", "E-202" -> "E202"
  const match = trimmed.match(/(?:INS|E)[\s-]?([0-9]{3,4}[A-Z]?)/i);
  if (match) {
    return `E${match[1]}`;
  }
  return trimmed;
}

/**
 * Lookup an additive in the authorization matrix by INS/E-number or name
 */
export function lookupAdditive(
  query: string,
  country: ExportCountry
): AdditiveAuthorizationEntry | null {
  if (!query) return null;
  const normalizedCode = normalizeAdditiveCode(query);

  return (
    ADDITIVE_MATRIX.find((entry) => {
      if (entry.jurisdiction !== country) return false;

      // 1. Match by normalized E/INS number
      if (entry.insOrENumber.toUpperCase() === normalizedCode) return true;

      // 2. Match by canonical name or Korean name
      const qLower = query.toLowerCase();
      if (
        entry.canonicalName.toLowerCase() === qLower ||
        entry.nameKo.toLowerCase() === qLower ||
        entry.nameKo.includes(query) ||
        qLower.includes(entry.canonicalName.toLowerCase())
      ) {
        return true;
      }

      return false;
    }) || null
  );
}

/**
 * Determine broad category key from food product legal type
 */
export function mapFoodCategory(categoryText?: string): string {
  if (!categoryText) return 'general';
  const c = categoryText.toLowerCase();

  if (/만두|교자|dumpling/i.test(c)) return 'dumplings';
  if (/소스|장류|드레싱|양념|sauce|paste|condiment/i.test(c)) return 'sauces';
  if (/라면|국수|면류|noodle|pasta/i.test(c)) return 'noodles';
  if (/김치|절임|장아찌|kimchi|pickle/i.test(c)) return 'pickles';
  if (/스낵|과자|snack|chip/i.test(c)) return 'snacks';
  if (/음료|차|beverage|drink|tea/i.test(c)) return 'beverages';
  if (/제과|제빵|빵|떡|bakery|cake/i.test(c)) return 'bakery';
  if (/육|소시지|햄|meat|pork|beef/i.test(c)) return 'meat';

  return 'general';
}

/**
 * Validates additives against the 5-country authorization matrix, food categories, and max ppm levels.
 */
export function validateAdditiveAuthorization(
  label: FoodLabel,
  input?: ValidationInput
): RedFlagItem[] {
  const flags: RedFlagItem[] = [];
  const country = label.country;
  const rawIngredients = label.ingredients || input?.ingredients || [];
  const legalCategory =
    label.productCategoryLocal ||
    label.header?.legalProductType ||
    input?.productCategory ||
    '';
  const mappedCategory = mapFoodCategory(legalCategory);

  for (const ing of rawIngredients) {
    const nameKo = ing.ingredientNameKo || '';
    const nameTarget = (ing as any).ingredientNameTarget || (ing as any).ingredientNameEn || '';
    const rawName = `${nameKo} ${nameTarget}`;
    const eCode = (ing as any).insOrENumber || (ing as any).eNumber || rawName;

    const entry = lookupAdditive(eCode, country);
    if (!entry) {
      continue;
    }

    // 1. Check if additive is PROHIBITED in target jurisdiction
    if (entry.status === 'PROHIBITED') {
      flags.push({
        code: `${country}-CRIT-ADDITIVE-PROHIBITED`,
        field: 'ingredients',
        severity: 'critical',
        title: `[${country}] 전면 금지 식품첨가물 사용 적발: ${entry.nameKo} (${entry.insOrENumber})`,
        message: `${entry.canonicalName} (${entry.insOrENumber})은(는) ${country} 규정상 식품에 사용이 전면 금지된 첨가물입니다. 통관 시 즉각 압류/반송 처리됩니다.`,
        solution: `해당 첨가물(${entry.canonicalName})을 완전히 배제하거나 허용된 대체 첨가물로 레시피를 변경하십시오.`,
        lawReference: entry.regulationSource,
        ruleId: `${country}-ADD-PROHIBITED-${entry.insOrENumber}`,
        whyProblem: `${entry.canonicalName}은(는) 해당 권역에서 식품 안전 위해 우려로 식품용 사용이 전면 금지되었습니다.`,
        howToFix: '원재료 배합비에서 해당 성분을 삭제하고 천연 대체재 또는 인가된 성분으로 교체하십시오.',
        authority: country,
      });
      continue;
    }

    // 2. Check if authorized for this specific food category
    const isCategoryAuthorized =
      entry.authorizedCategories.includes('all') ||
      entry.authorizedCategories.includes(mappedCategory) ||
      (mappedCategory === 'dumplings' && entry.authorizedCategories.includes('meat'));

    if (!isCategoryAuthorized && entry.authorizedCategories.length > 0) {
      flags.push({
        code: `${country}-CRIT-ADDITIVE-UNAUTHORIZED-CATEGORY`,
        field: 'ingredients',
        severity: 'critical',
        title: `[${country}] 미인가 식품 범주 첨가물 사용: ${entry.nameKo} (${entry.insOrENumber})`,
        message: `${entry.canonicalName}은(는) ${legalCategory || mappedCategory} 식품 유형에 사용 인가(Authorized)가 승인되지 않았습니다. 인가된 범주: [${entry.authorizedCategories.join(', ')}]`,
        solution: `해당 식품유형에 인가된 적합 첨가물로 교체하거나 사용을 중단하십시오.`,
        lawReference: entry.regulationSource,
        ruleId: `${country}-ADD-UNAUTH-CAT-${entry.insOrENumber}`,
        whyProblem: '식품공전상 승인되지 않은 식품 유형에 첨가물 사용 시 불법 첨가물 사용으로 처벌 대상입니다.',
        howToFix: '해당 제품 범주에 허용된 첨가물 목록을 확인하고 대체하십시오.',
        authority: country,
      });
    }

    // 3. Check Maximum Concentration Limit (PPM / mg/kg)
    // 1% ratio = 10,000 ppm
    const ratioPercent = ing.ratio ?? (ing as any).percentage ?? 0;
    const actualPpm = ratioPercent * 10000;

    if (!entry.isQuantumSatis && entry.maxLevelPpm > 0 && actualPpm > entry.maxLevelPpm) {
      flags.push({
        code: `${country}-CRIT-ADDITIVE-MAX-LEVEL-EXCEEDED`,
        field: 'ingredients.ratio',
        severity: 'critical',
        title: `[${country}] 첨가물 최대 허용 한도 초과: ${entry.nameKo} (${entry.insOrENumber})`,
        message: `${entry.canonicalName}의 배합비(${ratioPercent}% = ${actualPpm} ppm)가 ${country} 법정 최대 허용치(${entry.maxLevelPpm} ppm, ${(entry.maxLevelPpm / 10000).toFixed(4)}%)를 초과하였습니다.`,
        solution: `첨가물 배합비를 ${(entry.maxLevelPpm / 10000).toFixed(4)}% 이하(${entry.maxLevelPpm} ppm 미만)로 하향 조정하십시오.`,
        lawReference: entry.regulationSource,
        ruleId: `${country}-ADD-MAX-EXCEEDED-${entry.insOrENumber}`,
        whyProblem: '일일섭취허용량(ADI) 초과 우려로 법정 사용기준 상한선을 넘으면 통관 거부됩니다.',
        howToFix: `배합비를 ${(entry.maxLevelPpm / 10000).toFixed(4)}% 이하로 조정하십시오.`,
        authority: country,
      });
    }

    // 4. Check Mandatory Functional Class Name Declaration (용도명 병기 여부)
    const targetText = (nameTarget || nameKo).toLowerCase();
    const classWords = entry.functionalClass.toLowerCase().split(/[\s()/]+/);
    const hasClassMention = classWords.some((w) => w.length > 2 && targetText.includes(w));

    if (
      (country === 'EU' || country === 'JP' || country === 'CN') &&
      entry.status === 'AUTHORIZED' &&
      !hasClassMention &&
      (entry.functionalClass.includes('보존료') || entry.functionalClass.includes('감미료'))
    ) {
      flags.push({
        code: `${country}-WARN-ADDITIVE-FUNCTION-MISSING`,
        field: 'ingredients',
        severity: 'warning',
        title: `[${country}] 첨가물 법정 용도명 병기 누락 권고: ${entry.nameKo}`,
        message: `${entry.canonicalName}은(는) 원재료명란에 단순 성분명 외에 용도명(예: "${entry.labelingRequirement}")을 함께 병기하여야 합니다.`,
        solution: `원재료란 표기를 "${entry.labelingRequirement}" 형식으로 수정하십시오.`,
        lawReference: entry.regulationSource,
        ruleId: `${country}-ADD-FUNC-MISSING-${entry.insOrENumber}`,
        whyProblem: '소비자 정보 제공 규정에 따라 주요 기능성 첨가물은 용도명 표기가 의무적입니다.',
        howToFix: `원재료란에 "${entry.labelingRequirement}" 형태로 용도명을 명시하십시오.`,
        authority: country,
      });
    }

    // 5. Special warnings (e.g. Aspartame Phenylketonurics warning in US/EU)
    if (entry.insOrENumber === 'E951') {
      const allText = JSON.stringify(label).toUpperCase();
      if (!allText.includes('PHENYLALANINE') && !allText.includes('페닐알라닌')) {
        flags.push({
          code: `${country}-CRIT-ASPARTAME-WARNING-MISSING`,
          field: 'informationPanel',
          severity: 'critical',
          title: `[${country}] 아스파탐 페닐알라닌 함유 경고문구 누락`,
          message:
            '아스파탐 사용 식품은 페닐케톤뇨증 환자를 위한 의무 경고문구("PHENYLKETONURICS: CONTAINS PHENYLALANINE" 또는 "Contains a source of phenylalanine")를 명시해야 합니다.',
          solution: '라벨 정보표시면에 페닐알라닌 함유 경고문구를 규격 폰트로 명시하십시오.',
          lawReference: entry.regulationSource,
          ruleId: `${country}-ADD-ASPARTAME-WARN`,
          whyProblem: '페닐케톤뇨증 환자의 안전을 위해 페닐알라닌 유래 경고 표시가 법적으로 강제됩니다.',
          howToFix: '정보표시면에 "PHENYLKETONURICS: CONTAINS PHENYLALANINE"을 표기하십시오.',
          authority: country,
        });
      }
    }
  }

  return flags;
}
