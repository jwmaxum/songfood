import { ValidationInput, RedFlagItem } from '../types';

export function validateUAERules(input: ValidationInput): { critical: RedFlagItem[]; warnings: RedFlagItem[]; info: RedFlagItem[] } {
  const critical: RedFlagItem[] = [];
  const warnings: RedFlagItem[] = [];
  const info: RedFlagItem[] = [];

  // 1. [CRITICAL] 잔류 알코올(주정) 함량 검증 (UAE 0.05% 이하 기준)
  const alc = input.alcoholPercentage ?? 0;
  if (alc > 0.05) {
    critical.push({
      code: 'UAE-CRIT-ALCOHOL-LIMIT',
      field: 'alcoholPercentage',
      severity: 'critical',
      title: `UAE 잔류 알코올 허용 기준치 초과 (${alc}% > 0.05%)`,
      message: `장류/소스류의 잔류 알코올 함량(${alc}%)이 UAE 샤리아 식품 규정 상한선(0.05%)을 초과하여 세관 통관 및 할랄 인증이 즉시 거부됩니다.`,
      solution: '제조 공정 중 살균 및 감압 증류를 통해 잔류 알코올을 0.05% 이하로 낮추거나 무알콜 레시피로 전환하십시오.',
      lawReference: 'UAE.S 2055-1 / GSO 9:2022'
    });
  }

  // 2. [CRITICAL] 하람(Haram) 성분 원천 차단 (돼지고기, 돈육, 돈지 유래 성분)
  const haramKeywords = ['pork', 'pig', '돼지고기', '돈육', '돈지', 'lard', 'lard oil', 'bacon', 'ham'];
  for (const ing of input.ingredients) {
    const text = ((ing.ingredientNameKo || '') + ' ' + (ing.ingredientNameTarget || '')).toLowerCase();
    const isHaram = haramKeywords.some((k) => text.includes(k));
    if (isHaram) {
      critical.push({
        code: 'UAE-CRIT-HARAM-INGREDIENT',
        field: 'ingredients',
        severity: 'critical',
        title: `UAE 수입 금지 하람(Haram) 성분 감지: ${ing.ingredientNameKo || ing.ingredientNameTarget}`,
        message: '이슬람 샤리아 법률에 따라 돼지고기 및 그 파생 성분(돈지, 돼지 유래 젤라틴 등)은 UAE 전역에서 일반 유통 및 통관이 영구 금지됩니다.',
        solution: '해당 성분을 완전히 제거하고 100% 식물성 또는 할랄 인증 육류/유화제로 대체하십시오.',
        lawReference: 'UAE Federal Law No. 10 of 2015 on Food Safety'
      });
      break;
    }
  }

  // 3. [CRITICAL] 할랄(Halal) 인증 번호 및 서류 구비 검증
  const hasAnimalProduct = input.ingredients.some((ing) => {
    const text = ((ing.ingredientNameKo || '') + ' ' + (ing.ingredientNameTarget || '')).toLowerCase();
    return text.includes('meat') || text.includes('chicken') || text.includes('beef') || text.includes('gelatin') || text.includes('소고기') || text.includes('닭고기');
  });

  const halalCert = input.registrationNumbers?.halalCertNo;
  if (hasAnimalProduct && !halalCert) {
    critical.push({
      code: 'UAE-CRIT-HALAL-CERT-MISSING',
      field: 'registrationNumbers.halalCertNo',
      severity: 'critical',
      title: '동물성 원료 포함 품목 할랄(Halal) 인증 번호 누락',
      message: '육류 및 동물성 성분이 포함된 가공식품은 MoIAT 공인 할랄 인증 기관의 인증서 번호 표기가 법적 의무입니다.',
      solution: 'KMF 또는 UAE 인정 할랄 인증서 번호(예: UAE.S 2055-1 / KMF-HALAL-XXXX)를 입력하십시오.',
      lawReference: 'UAE Scheme for Halal Products (Cabinet Decision No. 10 of 2014)'
    });
  }

  // 4. [CRITICAL] 아랍어 언어 표기 필수
  const hasArabic = /[\u0600-\u06FF]/.test(input.productNameLocal);
  if (!hasArabic) {
    critical.push({
      code: 'UAE-CRIT-ARABIC-LANGUAGE',
      field: 'productNameLocal',
      severity: 'critical',
      title: '아랍어(العربية) 필수 표기 누락',
      message: 'GSO 9:2022 규정에 따라 UAE 유통 식품 라벨의 제품명 및 주요 표시는 아랍어가 주 언어(또는 영어와 대등 병기)로 표기되어야 합니다.',
      solution: '제품명 및 주요 정보를 공식 아랍어로 번역하여 병기하십시오.',
      lawReference: 'GSO 9:2022 Labelling of Prepackaged Foodstuffs Clause 4.1'
    });
  }

  // 5. [WARNING] 생산일자 + 소비기한 병기 포맷 (DD/MM/YYYY)
  if (!input.dateMarkingType || !input.dateMarkingType.includes('DD/MM/YYYY')) {
    warnings.push({
      code: 'UAE-WARN-DATE-FORMAT',
      field: 'dateMarkingType',
      severity: 'warning',
      title: 'UAE 날짜 표기 형식 (DD/MM/YYYY) 권장',
      message: 'GSO 표준은 일/월/연도 (DD/MM/YYYY) 순서의 생산일자 및 유효기한 병기를 규정합니다.',
      solution: '일자 표기 양식을 DD/MM/YYYY로 설정하십시오.'
    });
  }

  return { critical, warnings, info };
}
