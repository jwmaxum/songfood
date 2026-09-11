import { ValidationInput, RedFlagItem } from '../types';

export function validateEURules(input: ValidationInput): { critical: RedFlagItem[]; warnings: RedFlagItem[]; info: RedFlagItem[] } {
  const critical: RedFlagItem[] = [];
  const warnings: RedFlagItem[] = [];
  const info: RedFlagItem[] = [];

  // 1. [CRITICAL] E171 (이산화티타늄 Titanium Dioxide) 금지 첨가물 검출
  for (const ing of input.ingredients) {
    const eNum = (ing.insOrENumber || '').toUpperCase();
    const name = ((ing.ingredientNameTarget || '') + ' ' + (ing.ingredientNameKo || '')).toLowerCase();

    if (eNum.includes('E171') || eNum.includes('171') || name.includes('titanium') || name.includes('이산화티타늄')) {
      critical.push({
        code: 'EU-CRIT-BANNED-E171',
        field: 'ingredients',
        severity: 'critical',
        title: 'EU 역내 사용 금지 식품첨가물 감지: E171 (이산화티타늄)',
        message: 'EU 집행위원회(EC) Regulation (EU) 2022/63에 따라 이산화티타늄(E171)은 유전독성 우려로 2022년 8월부터 유럽연합 전역에서 식품 첨가가 전면 금지되었습니다.',
        solution: '배합 레시피에서 E171을 완전히 배제하고 대체 천연 원료를 적용하십시오.',
        lawReference: 'Commission Regulation (EU) 2022/63 amending Annexes II and III to Regulation (EC) No 1333/2008'
      });
      break;
    }
  }

  // 2. [CRITICAL] 열량 kJ 및 kcal 동시 듀얼 표기
  if (input.nutrition) {
    if (!input.nutrition.caloriesKj || input.nutrition.caloriesKj <= 0) {
      critical.push({
        code: 'EU-CRIT-ENERGY-DUAL',
        field: 'nutrition.caloriesKj',
        severity: 'critical',
        title: 'EU 영양선언 kJ / kcal 듀얼 표기 누락',
        message: 'EU FIC Regulation No 1169/2011에 따라 에너지는 kJ과 kcal 두 단위를 반드시 나란히 병기해야 합니다.',
        solution: `열량 ${input.nutrition.caloriesKcal || 0} kcal와 함께 ${Math.round((input.nutrition.caloriesKcal || 0) * 4.184)} kJ을 동시 표기하십시오.`,
        lawReference: 'Regulation (EU) No 1169/2011 Annex XIII'
      });
    }
  }

  // 3. [CRITICAL] 14대 알레르겐 시각적 강조 (Bold / Underline) 여부
  // 원재료 목록 중 알레르겐이 존재하는 경우 강조 태그가 있는지 확인
  const allergensInIngredients = input.ingredients.filter((i) => i.isAllergen);
  if (allergensInIngredients.length > 0) {
    const rawText = input.rawText || '';
    const hasHtmlHighlight = /<b[^>]*>.*?<\/b>|<strong[^>]*>.*?<\/strong>|\*\*.*?\*\*/i.test(rawText);

    // 안내문구가 없거나 시각적 강조 태그가 전혀 없는 경우 경고/크리티컬
    if (rawText && !hasHtmlHighlight) {
      critical.push({
        code: 'EU-CRIT-ALLERGEN-HIGHLIGHT',
        field: 'ingredients',
        severity: 'critical',
        title: 'EU 14대 알레르겐 시각적 강조(Bold) 누락',
        message: 'EU 법령은 알레르겐 성분을 주변 텍스트와 뚜렷이 구별되는 활자(볼드체, 배경 음영, 글자 색상)로 직접 강조할 것을 의무화합니다.',
        solution: '원재료명 목록 내 알레르겐 원료를 볼드체(<b>Wheat</b> 등)로 포맷팅하십시오.',
        lawReference: 'Regulation (EU) No 1169/2011 Article 21(1)(b)'
      });
    }
  }

  // 4. [WARNING] 포장 면적 대비 활자 크기 (x-height) 조건
  if (input.packageAreaCm2) {
    if (input.packageAreaCm2 >= 80) {
      info.push({
        code: 'EU-INFO-X-HEIGHT-12',
        field: 'packageAreaCm2',
        severity: 'info',
        title: '포장 면적 80cm² 이상: 최소 글자 높이 1.2mm 적용',
        message: `포장 면적이 ${input.packageAreaCm2}cm²로 80cm² 이상이므로 필수 표기 활자의 x-height가 1.2mm 이상이어야 합니다.`,
        solution: '인쇄 시 폰트 크기가 규격에 부합하는지 패키징 검수를 진행하십시오.'
      });
    } else {
      info.push({
        code: 'EU-INFO-X-HEIGHT-09',
        field: 'packageAreaCm2',
        severity: 'info',
        title: '소형 포장재 활자 크기 완화 (0.9mm)',
        message: `포장 면적이 ${input.packageAreaCm2}cm²(< 80cm²)이므로 x-height 최소 규격이 0.9mm로 완화 적용됩니다.`,
        solution: '소형 패키징 레이아웃을 최적화하십시오.'
      });
    }
  }

  // 5. [WARNING] 라면/스프 2-CE 및 산화에틸렌(EO) 규제 주의
  const category = (input.productCategory || '').toLowerCase();
  if (category.includes('면') || category.includes('라면') || category.includes('ramen') || category.includes('noodle')) {
    warnings.push({
      code: 'EU-WARN-ETHYLENE-OXIDE',
      field: 'category',
      severity: 'warning',
      title: 'EU 산화에틸렌(EO) / 2-CE 정밀 시험성적서 구비 권고',
      message: '유럽연합은 라면 스프 및 건더기 원료의 2-클로로에탄올(2-CE) 검출 기준을 극도로 엄격히 규제(최대잔류한도 미만)하고 있습니다.',
      solution: '공인 시험기관의 EO/2-CE 불검출 성적서를 통관 서류로 첨부하십시오.'
    });
  }

  return { critical, warnings, info };
}
