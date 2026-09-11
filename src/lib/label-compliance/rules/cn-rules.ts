import { ValidationInput, RedFlagItem } from '../types';

export function validateCNRules(input: ValidationInput): { critical: RedFlagItem[]; warnings: RedFlagItem[]; info: RedFlagItem[] } {
  const critical: RedFlagItem[] = [];
  const warnings: RedFlagItem[] = [];
  const info: RedFlagItem[] = [];

  // 1. [CRITICAL] GACC 18자리 해외제조업체 등록번호 검증
  const gaccCode = input.registrationNumbers?.gaccCode || '';
  const gaccRegex = /^[A-Z0-9]{18}$/;

  if (!gaccCode) {
    critical.push({
      code: 'CN-CRIT-GACC-MISSING',
      field: 'registrationNumbers.gaccCode',
      severity: 'critical',
      title: '중국 GACC 18자리 해외공장 등록번호 누락',
      message: '해관총서령 제248호(2022년 시행)에 따라 중국으로 수출되는 모든 수입식품의 내부/외부 포장에는 18자리 GACC 등록번호 표기가 법적 필수입니다.',
      solution: '중국 단일창구(Single Window)에서 발급된 18자리 유효 번호(예: CKOR24092601009988)를 라벨에 표기하십시오.',
      lawReference: 'GACC Decree No. 248 (2022) Article 15'
    });
  } else if (!gaccRegex.test(gaccCode)) {
    critical.push({
      code: 'CN-CRIT-GACC-INVALID',
      field: 'registrationNumbers.gaccCode',
      severity: 'critical',
      title: 'GACC 등록번호 규격 불일치 (18자리 영문/숫자 필수)',
      message: `입력된 등록번호 "${gaccCode}"는 표준 18자리 포맷과 일치하지 않습니다. 통관 시 시스템 불일치로 거부됩니다.`,
      solution: '영문 대문자 및 숫자로 조합된 정확한 18자리 등록번호를 입력하십시오.',
      lawReference: 'GACC Decree No. 248'
    });
  }

  // 2. [CRITICAL] GB 7718-2025 무첨가('零添加', '不添加') 금지 문구 스크리닝
  const bannedKeywords = ['零添加', '不添加', '无添加', '0添加'];
  const fullTextToCheck = [
    input.productNameLocal,
    input.rawText || '',
    input.storageInstructions || '',
    ...(input.claimsBadges || [])
  ].join(' ');

  for (const kw of bannedKeywords) {
    if (fullTextToCheck.includes(kw)) {
      critical.push({
        code: 'CN-CRIT-NO-ADDITIVE-CLAIM',
        field: 'claimsBadges',
        severity: 'critical',
        title: `중국 신규 규정 위반: "${kw}"(무첨가) 문구 사용 금지`,
        message: 'GB 7718-2025 개정 식품안전국가표준에 따라, 식품 라벨 및 홍보 문구에 "零添加(첨가물 제로)", "不添加(무첨가)" 등의 표현 사용이 전면 금지됩니다.',
        solution: `"${kw}" 문구를 삭제하고 사실에 부합하는 원재료 배합 및 영양성분 정보만 기술하십시오.`,
        lawReference: 'GB 7718-2025 식품안전국가표준 예포장식품표시통칙'
      });
      break;
    }
  }

  // 3. [CRITICAL] 생산일자 + 보존기한 병기 검증
  if (!input.dateMarkingType || !input.dateMarkingType.includes('YYYY/MM/DD')) {
    warnings.push({
      code: 'CN-WARN-DATE-FORMAT',
      field: 'dateMarkingType',
      severity: 'warning',
      title: '중국 날짜 표기 형식 (YYYY/MM/DD) 준수 권장',
      message: '중국 식품안전법은 연/월/일(YYYY/MM/DD) 순서 표기를 기본 원칙으로 규정합니다.',
      solution: '생산일자(生产日期) 및 보존기한(保质期)을 YYYY/MM/DD 포맷으로 병기하십시오.'
    });
  }

  // 4. [CRITICAL] GB 28050 영양성분 에너지 단위(kJ) 검증
  if (input.nutrition) {
    if (!input.nutrition.caloriesKj || input.nutrition.caloriesKj <= 0) {
      critical.push({
        code: 'CN-CRIT-ENERGY-KJ',
        field: 'nutrition.caloriesKj',
        severity: 'critical',
        title: '중국 영양성분표 에너지 단위(kJ) 누락',
        message: '중국 GB 28050 규정상 영양성분표의 에너지는 kcal가 아닌 kJ(킬로줄)을 기본 단위로 표기해야 합니다.',
        solution: `열량 ${input.nutrition.caloriesKcal || 0} kcal에 대해 약 ${Math.round((input.nutrition.caloriesKcal || 0) * 4.184)} kJ로 자동 환산하여 표기하십시오.`,
        lawReference: 'GB 28050-2011 식품안전국가표준 예포장식품영양표시통칙'
      });
    }
  }

  // 5. [WARNING] 중국어 간체 언어 여부
  const hasChinese = /[\u4e00-\u9fa5]/.test(input.productNameLocal);
  if (!hasChinese) {
    critical.push({
      code: 'CN-CRIT-LANGUAGE',
      field: 'productNameLocal',
      severity: 'critical',
      title: '중국어 간체(规范汉字) 필수 표기 누락',
      message: '중국 수입식품 라벨은 공식 간체 중국어로 표기되어야 하며, 외국어 단독 표기는 통관이 불가능합니다.',
      solution: '제품명 및 원재료명을 중국어 간체로 변환하여 라벨을 작성하십시오.',
      lawReference: '중화인민공화국 식품안전법 제97조'
    });
  }

  return { critical, warnings, info };
}
