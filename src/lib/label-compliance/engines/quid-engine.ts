import { ValidationInput, RedFlagItem } from '../types';

/**
 * QUID (Quantitative Ingredient Declaration) Engine
 * EU Regulation (EU) No 1169/2011 Article 22:
 * Where an ingredient appears in the name of the food or is usually associated with that name by the consumer,
 * or is emphasised on the labelling in words, pictures or graphics, the quantity of that ingredient (%) must be stated.
 */
export function validateQuid(input: ValidationInput): {
  critical: RedFlagItem[];
  warnings: RedFlagItem[];
  info: RedFlagItem[];
} {
  const critical: RedFlagItem[] = [];
  const warnings: RedFlagItem[] = [];
  const info: RedFlagItem[] = [];

  const productNameCombined = `${input.productNameLocal || ''} ${input.productNameEn || ''}`.toLowerCase();

  // Core ingredients to check if mentioned in product name
  const notableKeywords = [
    { ko: '김치', en: 'kimchi' },
    { ko: '돼지고기', en: 'pork' },
    { ko: '소고기', en: 'beef' },
    { ko: '닭고기', en: 'chicken' },
    { ko: '새우', en: 'shrimp' },
    { ko: '오징어', en: 'squid' },
    { ko: '치즈', en: 'cheese' },
    { ko: '마늘', en: 'garlic' },
    { ko: '버섯', en: 'mushroom' },
    { ko: '두부', en: 'tofu' },
    { ko: '참깨', en: 'sesame' },
    { ko: '참기름', en: 'sesame oil' },
    { ko: '인삼', en: 'ginseng' },
    { ko: '홍삼', en: 'red ginseng' },
    { ko: '고추장', en: 'gochujang' },
  ];

  for (const kw of notableKeywords) {
    const isNamed = productNameCombined.includes(kw.ko) || (kw.en && productNameCombined.includes(kw.en));
    if (!isNamed) continue;

    // Find matching ingredient in ingredients list
    const matchedIng = input.ingredients.find(
      (ing) =>
        ing.ingredientNameKo.toLowerCase().includes(kw.ko) ||
        (ing.ingredientNameEn && ing.ingredientNameEn.toLowerCase().includes(kw.en))
    );

    if (matchedIng) {
      const hasRatio = matchedIng.ratio !== undefined && matchedIng.ratio !== null && matchedIng.ratio > 0;
      if (!hasRatio) {
        if (input.country === 'EU') {
          critical.push({
            code: 'EU-CRIT-QUID-MISSING',
            field: 'ingredients',
            severity: 'critical',
            title: `QUID(원재료 함량 %) 표기 누락: ${kw.ko}`,
            message: `제품명("${input.productNameLocal}")에 원재료("${kw.ko}")가 명시되었으나, 배합비(%)가 원재료명 또는 원재료 목록에 표기되지 않았습니다.`,
            solution: `EU FIC 1169/2011 Article 22에 따라 제품명에 포함된 원재료 "${kw.ko}"의 백분율(%)을 원재료명 바로 옆 또는 원재료 목록에 필수 표기하십시오 (예: "${kw.ko} 25%").`,
            lawReference: 'EU Regulation No 1169/2011 Article 22 (QUID)',
            ruleId: 'EU-QUID-ART22',
            whyProblem: 'EU 소비자기본정보법(FIC)에 의거, 제품명에 포함된 원재료의 함량을 소비자가 알 수 없으면 오도(Misleading)로 간주되어 통관 보류 조치됩니다.',
            howToFix: `원재료 목록에서 "${kw.ko}" 표기 뒤에 정확한 배합 비율(예: "${kw.ko} (28%)")을 기재하십시오.`,
            authority: 'EC FIC (DG SANTE)'
          });
        } else {
          warnings.push({
            code: 'COMMON-WARN-QUID-RECOMMENDED',
            field: 'ingredients',
            severity: 'warning',
            title: `원재료 백분율(%) 표기 권장: ${kw.ko}`,
            message: `제품명에 강조된 원재료 "${kw.ko}"의 함량(%)이 누락되어 있습니다.`,
            solution: `소비자 신뢰도 향상 및 통관 규정 대응을 위해 제품명에 포함된 주요 원재료의 함량(%)을 기재할 것을 권장합니다.`,
            lawReference: 'CODEX STAN 1-1985 Section 5.1 / Global QUID Standards',
            ruleId: 'GLOBAL-QUID-REC',
            whyProblem: '수입국 식품당국 심사관이 제품명과 실제 원재료 함량 간의 일치 여부를 검토할 때 소명 요청이 발생할 수 있습니다.',
            howToFix: `주요 원재료 "${kw.ko}"의 함량 비율을 원재료 목록에 명시하십시오.`,
            authority: 'National Food Authority'
          });
        }
      }
    }
  }

  return { critical, warnings, info };
}
