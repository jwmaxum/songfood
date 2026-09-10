import { ValidationInput, RedFlagItem } from '../types';
import { matchAllergen } from '../allergens-registry';

export function validateUSRules(input: ValidationInput): { critical: RedFlagItem[]; warnings: RedFlagItem[]; info: RedFlagItem[] } {
  const critical: RedFlagItem[] = [];
  const warnings: RedFlagItem[] = [];
  const info: RedFlagItem[] = [];

  // 1. [CRITICAL] 육류 원료 배합비 판별 (USDA-FSIS 관할 및 수입제한 여부)
  const meatKeywords = ['beef', 'pork', '소고기', '쇠고기', '돼지고기', '돈육', '우육'];
  let totalMeatRatio = 0;

  for (const ing of input.ingredients) {
    const ko = (ing.ingredientNameKo || '').toLowerCase();
    const target = (ing.ingredientNameTarget || '').toLowerCase();
    const isMeat = meatKeywords.some((k) => ko.includes(k) || target.includes(k));
    if (isMeat) {
      totalMeatRatio += ing.ratio || 0;
    }
  }

  if (totalMeatRatio >= 2.0) {
    critical.push({
      code: 'US-CRIT-USDA-MEAT',
      field: 'ingredients',
      severity: 'critical',
      title: '육류 2% 초과 (USDA-FSIS 관할 인허가 필수)',
      message: `육류 배합비가 ${totalMeatRatio}%로 2% 기준치를 초과하여 FDA가 아닌 USDA-FSIS 관할 대상입니다. 한국산 우육·돈육 가공품은 미 농무부 위생협정 미체결로 통관이 금지되거나 반송될 위험이 매우 높습니다.`,
      solution: '수출용 라인업을 수산물(새우 등) 또는 식물성 비건(두부/야채) 만두로 교체하거나 육류 함량을 2% 미만으로 조정하십시오.',
      lawReference: 'USDA 9 CFR 317 / FDA-USDA Jurisdictional Boundary'
    });
  } else if (totalMeatRatio > 0) {
    warnings.push({
      code: 'US-WARN-MEAT-TRACE',
      field: 'ingredients',
      severity: 'warning',
      title: '미량 육류 원료 감지 (< 2%)',
      message: `육류 배합비(${totalMeatRatio}%)가 2% 미만으로 FDA 관할 범위 내이나, 동물성 원료 출처 증명서가 요구될 수 있습니다.`,
      solution: 'USDA 면제 기준 충족 서류 및 수산물/식물성 원료 증명서를 준비하십시오.'
    });
  }

  // 2. [CRITICAL] FALCPA 9대 알레르겐 및 'Contains' 박스 검증
  const detectedAllergens = new Set<string>();
  for (const ing of input.ingredients) {
    const match = matchAllergen(ing.ingredientNameTarget || ing.ingredientNameKo, 'US');
    if (match) {
      detectedAllergens.add(match.categoryKo);
    }
  }

  // 알레르겐이 검출되었으나 'Contains' 문구 또는 원재료 강조가 누락된 경우
  const rawUpper = (input.rawText || '').toUpperCase();
  const containsUpper = (input.storageInstructions || '').toUpperCase();
  const hasContainsBox = rawUpper.includes('CONTAINS:') || containsUpper.includes('CONTAINS:');

  if (detectedAllergens.size > 0 && !hasContainsBox) {
    critical.push({
      code: 'US-CRIT-ALLERGEN-CONTAINS',
      field: 'ingredients',
      severity: 'critical',
      title: '미국 FALCPA 9대 알레르겐 표기 누락',
      message: `라벨에 알레르기 유발성분(${Array.from(detectedAllergens).join(', ')})이 감지되었으나 'CONTAINS:' 박스 또는 명시적 표기가 누락되었습니다.`,
      solution: `라벨 Information Panel 하단에 "CONTAINS: ${Array.from(detectedAllergens).map(a => a.toUpperCase()).join(', ')}." 문구를 필수 추가하십시오.`,
      lawReference: 'FDA 21 U.S.C. 343(w) / FALCPA & FASTER Act 2023'
    });
  }

  // 참깨(Sesame) 특화 검사 (2023 FASTER Act)
  if (detectedAllergens.has('참깨') && !rawUpper.includes('SESAME') && !containsUpper.includes('SESAME')) {
    critical.push({
      code: 'US-CRIT-SESAME-CALLOUT',
      field: 'allergens',
      severity: 'critical',
      title: '참깨(Sesame) 9대 의무 알레르겐 누락 (FASTER Act)',
      message: '2023년 1월 발효된 FASTER Act에 따라 참깨(Sesame)는 미국 9대 법정 의무 알레르겐입니다. 표기 누락 시 즉각 통관 압류 대상입니다.',
      solution: 'CONTAINS 박스에 SESAME을 명시적으로 추가하십시오.',
      lawReference: 'FASTER Act of 2021 (Effective Jan 1, 2023)'
    });
  }

  // 3. [CRITICAL] 미 FDA 2016 영양성분 필수 항목 검증
  if (input.nutrition) {
    if (input.nutrition.addedSugarsG === undefined || input.nutrition.addedSugarsG === null) {
      critical.push({
        code: 'US-CRIT-ADDED-SUGARS',
        field: 'nutrition',
        severity: 'critical',
        title: '미국 FDA 첨가당(Added Sugars) 표기 누락',
        message: '미국 2016 개정 Nutrition Facts 규격에 따라 "Includes [X]g Added Sugars" 표기는 법적 의무 사항입니다.',
        solution: '첨가당 수치를 기입하십시오 (0g인 경우 "Includes 0g Added Sugars 0%").',
        lawReference: 'FDA 21 CFR 101.9(c)(6)(iii)'
      });
    }

    if (input.nutrition.vitaminDMcg === undefined || input.nutrition.potassiumMg === undefined) {
      critical.push({
        code: 'US-CRIT-MICRO-NUTRIENTS',
        field: 'nutrition',
        severity: 'critical',
        title: '비타민 D 및 칼륨(Potassium) 필수 표기 누락',
        message: '신규 Nutrition Facts 규정은 비타민A/C 대신 비타민D(mcg)와 칼륨(mg) 표기를 강제합니다.',
        solution: '비타민D와 칼륨의 절대 함량 및 %DV를 명시하십시오.',
        lawReference: 'FDA 21 CFR 101.9(c)(8)'
      });
    }
  }

  // 4. [WARNING] 순중량 oz 단위 병기 여부
  if (!input.netWeightOz && input.netWeightG) {
    warnings.push({
      code: 'US-WARN-NET-WEIGHT-OZ',
      field: 'netWeightOz',
      severity: 'warning',
      title: '순중량 온스(oz) 단위 병기 권장',
      message: '미국 FPLA 규정에 따라 식품 포장 전면(PDP)에는 미터법(g)과 야드파운드법(oz 또는 fl oz)을 반드시 병기해야 합니다.',
      solution: `순중량 ${input.netWeightG}g에 대해 약 ${(input.netWeightG * 0.035274).toFixed(1)} OZ를 병기하십시오.`,
      lawReference: 'Fair Packaging and Labeling Act (FPLA) 16 CFR 500.6'
    });
  }

  // 5. [WARNING] 일자 표기 포맷
  if (input.dateMarkingType && !input.dateMarkingType.includes('MM/DD/YYYY') && !input.dateMarkingType.includes('Month DD')) {
    warnings.push({
      code: 'US-WARN-DATE-FORMAT',
      field: 'dateMarkingType',
      severity: 'warning',
      title: '미국 날짜 표기 형식 (MM/DD/YYYY) 권장',
      message: `현재 지정된 일자 포맷(${input.dateMarkingType})은 미국 소비자 기준 혼동을 유발할 수 있습니다.`,
      solution: '미국 표준인 MM/DD/YYYY 또는 "Best If Used By: Month DD, YYYY" 형식을 권장합니다.'
    });
  }

  return { critical, warnings, info };
}
