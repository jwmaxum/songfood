import { ValidationInput, RedFlagItem } from '../types';

export function validateJPRules(input: ValidationInput): { critical: RedFlagItem[]; warnings: RedFlagItem[]; info: RedFlagItem[] } {
  const critical: RedFlagItem[] = [];
  const warnings: RedFlagItem[] = [];
  const info: RedFlagItem[] = [];

  // 1. [CRITICAL] 식염상당량(食塩相当量) 환산 표기 검증
  if (input.nutrition) {
    if (input.nutrition.saltEquivalentG === undefined || input.nutrition.saltEquivalentG === null) {
      const calculated = Number((((input.nutrition.sodiumMg || 0) * 2.54) / 1000).toFixed(2));
      critical.push({
        code: 'JP-CRIT-SALT-EQUIVALENT',
        field: 'nutrition.saltEquivalentG',
        severity: 'critical',
        title: '일본 영양성분 식염상당량(食塩相当量) 누락',
        message: '일본 식품표시법상 나트륨(mg) 단독 표기는 인정되지 않으며, 반드시 "식염상당량(g)"으로 환산하여 표기해야 합니다.',
        solution: `나트륨 ${input.nutrition.sodiumMg}mg에 대한 식염상당량 ${calculated}g을 영양표시란에 기재하십시오.`,
        lawReference: '일본 식품표시법 제3조 / 식품표시기준'
      });
    }
  }

  // 2. [CRITICAL] 추정성·가능성 알레르겐 표기 차단
  const rawText = (input.rawText || '') + (input.storageInstructions || '');
  const forbiddenPhrases = ['入っているかもしれない', '混入している可能性がある', '들어 있을지도 모름', '들어있을 수 있음'];

  for (const phrase of forbiddenPhrases) {
    if (rawText.includes(phrase)) {
      critical.push({
        code: 'JP-CRIT-POSSIBLE-ALLERGEN',
        field: 'allergens',
        severity: 'critical',
        title: '일본 소비자청 금지 표현: 추정성 알레르겐 표기',
        message: '일본 식품표시법은 "들어 있을지도 모름" 등 모호한 가능성 표시를 법적으로 엄격히 금지합니다.',
        solution: '원재료명 뒤에 명확한 괄호 표기(例: 小麦・大豆を含む) 또는 사실에 근거한 동일 라인 제조 공정 안내문으로 수정하십시오.',
        lawReference: '일본 소비자청 알레르기 표시 Q&A 3-1'
      });
      break;
    }
  }

  // 3. [CRITICAL] 8대 특정원재료 + 2025 캐슈넛(カシューナッツ) 의무화 검사
  const mandatory8plus1 = [
    { name: 'えび', label: '새우(えび)' },
    { name: 'かに', label: '게(かに)' },
    { name: 'くるみ', label: '호두(くるみ)' },
    { name: '小麦', label: '밀(小麦)' },
    { name: 'そば', label: '메밀(そば)' },
    { name: '卵', label: '계란(卵)' },
    { name: '乳', label: '우유(乳成分)' },
    { name: '落花生', label: '땅콩(落花生)' },
    { name: 'カシューナッツ', label: '캐슈넛(カシューナッツ - 2025 의무화)' }
  ];

  for (const ing of input.ingredients) {
    const target = ing.ingredientNameTarget || '';
    const ko = ing.ingredientNameKo || '';
    for (const item of mandatory8plus1) {
      if (target.includes(item.name) || ko.includes(item.label.split('(')[0])) {
        // 알레르겐 플래그 체크
        if (!ing.isAllergen) {
          warnings.push({
            code: 'JP-WARN-MANDATORY-ALLERGEN',
            field: 'ingredients',
            severity: 'warning',
            title: `일본 특정원재료 의무 품목 감지: ${item.label}`,
            message: `성분 "${target || ko}"는 일본 소비자청 법정 의무 알레르겐 대상입니다.`,
            solution: `라벨 알레르겐 강조 또는 "一部に${item.name}を含む" 표기를 확인하십시오.`
          });
        }
      }
    }
  }

  // 4. [WARNING] 기한 표시 구분 (상미기한 vs 소비기한)
  if (!input.dateMarkingText?.includes('賞味期限') && !input.dateMarkingText?.includes('消費期限')) {
    warnings.push({
      code: 'JP-WARN-EXPIRY-TYPE',
      field: 'dateMarkingText',
      severity: 'warning',
      title: '일본 기한 표시 용어 (賞味期限 또는 消費期限) 권장',
      message: '품질유지기한은 "賞味期限(상미기한)", 부패 변질이 쉬운 식품은 "消費期限(소비기한)" 용어로 명문화해야 합니다.',
      solution: '냉동만두 및 가공식품은 "賞味期限：枠外裏面下部に記載" 형식 사용을 권장합니다.'
    });
  }

  return { critical, warnings, info };
}
