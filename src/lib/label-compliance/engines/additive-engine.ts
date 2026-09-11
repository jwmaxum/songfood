import { ValidationInput, RedFlagItem } from '../types';
import { validateAdditiveAuthorization } from './additive-authorization-engine';

/**
 * Additive & E-Number Compliance Engine
 * - EU: Commission Regulation (EU) 2022/63 - Complete prohibition of Titanium Dioxide (E171)
 * - US/EU: Synthetic azo dyes (FD&C Yellow No. 5 / Tartrazine E102, Allura Red E129 warnings)
 * - UAE: GSO 2055-1 non-halal animal derived additives (E120 Carmine, E441 Gelatin porcine, E920 L-cysteine porcine)
 * - CN: GB 2760 Standards for Uses of Food Additives
 */
export function validateAdditives(input: ValidationInput): {
  critical: RedFlagItem[];
  warnings: RedFlagItem[];
  info: RedFlagItem[];
} {
  const critical: RedFlagItem[] = [];
  const warnings: RedFlagItem[] = [];
  const info: RedFlagItem[] = [];

  for (const ing of input.ingredients) {
    const nameKo = (ing.ingredientNameKo || '').toLowerCase();
    const nameEn = (ing.ingredientNameEn || '').toLowerCase();
    const eNum = (ing.eNumber || '').toUpperCase().trim();

    // 1. EU Titanium Dioxide (E171) Ban
    const isTitaniumDioxide =
      eNum === 'E171' ||
      nameKo.includes('이산화티타늄') ||
      nameKo.includes('티타늄디옥사이드') ||
      nameEn.includes('titanium dioxide') ||
      nameEn.includes('e171');

    if (isTitaniumDioxide) {
      if (input.country === 'EU') {
        critical.push({
          code: 'EU-CRIT-ADDITIVE-E171',
          field: 'ingredients',
          severity: 'critical',
          title: 'EU 전면 금지 첨가물: 이산화티타늄 (E171)',
          message: `이산화티타늄(Titanium Dioxide, E171)은 유전독성(Genotoxicity) 우려로 인해 EU 전역에서 식품 첨가물 사용이 전면 금지되었습니다.`,
          solution: '포뮬레이션에서 이산화티타늄을 전면 제거하고 탄산칼슘(E170) 또는 쌀전분 등 대체 착색료로 변경하십시오.',
          lawReference: 'Commission Regulation (EU) 2022/63 / Regulation (EC) No 1333/2008',
          ruleId: 'EU-ADD-E171-BAN',
          whyProblem: 'EFSA 과학패널의 유전독성 판정에 따라 EU 역내 수입 및 유통 시 적발 즉시 전량 폐기 및 리콜 대상입니다.',
          howToFix: '원재료 배합비에서 이산화티타늄(E171)을 삭제하고 천연 착색 성분으로 포뮬레이션을 수정하십시오.',
          authority: 'EFSA / European Commission'
        });
      } else {
        warnings.push({
          code: 'COMMON-WARN-ADDITIVE-E171',
          field: 'ingredients',
          severity: 'warning',
          title: '글로벌 규제 강화 성분: 이산화티타늄 (E171)',
          message: '이산화티타늄은 EU에서 전면 금지되었으며, 타국가에서도 규제 검토가 진행 중입니다.',
          solution: '해외 수출 규제 확산에 대비하여 대체 성분 적용을 권고합니다.',
          lawReference: 'Global Food Additive Regulatory Trends',
          ruleId: 'GLOBAL-ADD-E171',
          whyProblem: '글로벌 주요 식품 안전 규제기관에서 사용 규제를 검토 중인 성분입니다.',
          howToFix: '친환경/천연 대체제로 포뮬레이션 전환을 검토하십시오.',
          authority: 'National Food Authority'
        });
      }
    }

    // 2. UAE / GCC Haram Additives
    if (input.country === 'UAE') {
      // Porcine or Uncertified Gelatin
      const isGelatin = nameKo.includes('젤라틴') || nameEn.includes('gelatin') || eNum === 'E441';
      if (isGelatin) {
        critical.push({
          code: 'UAE-CRIT-ADDITIVE-GELATIN',
          field: 'ingredients',
          severity: 'critical',
          title: '할랄 인증 젤라틴 확인 필수: 젤라틴 (E441)',
          message: '젤라틴(Gelatin)은 돼지 유래(Porcine) 가능성이 있어 UAE 할랄 인증 기관(HCB)의 증빙이 없으면 통관 불가합니다.',
          solution: '반드시 할랄 공인 도축 소 유래 젤라틴 또는 한천(Agar), 펙틴(Pectin) 등 식물성 대체 원료를 사용하고 증명서를 첨부하십시오.',
          lawReference: 'GSO 2055-1 / UAE Cabinet Resolution on Halal Control',
          ruleId: 'UAE-ADD-HALAL-GELATIN',
          whyProblem: '돼지 유래 성분(포크 젤라틴)은 이슬람 샤리아 율법상 절대 금지(Haram) 성분입니다.',
          howToFix: '원재료 명세서에 "Bovine Halal Gelatin" 인증 번호를 기재하거나 식물성 겔화제로 교체하십시오.',
          authority: 'MoIAT / ESMA'
        });
      }

      // Carmine (E120) - Cochineal insect dye
      const isCarmine = nameKo.includes('카민') || nameKo.includes('코치닐') || nameEn.includes('carmine') || nameEn.includes('cochineal') || eNum === 'E120';
      if (isCarmine) {
        warnings.push({
          code: 'UAE-WARN-ADDITIVE-CARMINE',
          field: 'ingredients',
          severity: 'warning',
          title: '곤충 유래 색소 할랄 확인 요망: 코치닐/카민 (E120)',
          message: '코치닐/카민 색소는 연지벌레에서 추출된 원료로 일부 GCC/할랄 학파에서 섭취를 제한합니다.',
          solution: '수출 전 바이어 및 할랄 인증기관과 협의하여 파프리카 추출색소(E160c) 또는 비트레드(E162) 등 대체 색소를 적용하십시오.',
          lawReference: 'GSO 2055-1 Halal Requirements',
          ruleId: 'UAE-ADD-CARMINE',
          whyProblem: '곤충 유래 성분에 대한 이슬람 법학파(마즈하브) 간 할랄 인정 기준 차이가 존재합니다.',
          howToFix: '식물성 천연 색소로 대체하거나 할랄 적합 승인서를 사전 확보하십시오.',
          authority: 'MoIAT / Dubai Municipality'
        });
      }
    }

    // 3. EU Southampton Six Azo Dyes (Warning mandatory in EU)
    // E102 (Tartrazine), E104 (Quinoline Yellow), E110 (Sunset Yellow), E122 (Carmoisine), E124 (Ponceau 4R), E129 (Allura Red)
    const southamptonDyes = ['E102', 'E104', 'E110', 'E122', 'E124', 'E129'];
    const isSouthamptonDye =
      southamptonDyes.includes(eNum) ||
      nameKo.includes('황색4호') ||
      nameKo.includes('황색5호') ||
      nameKo.includes('적색40호') ||
      nameEn.includes('tartrazine') ||
      nameEn.includes('allura red') ||
      nameEn.includes('sunset yellow');

    if (isSouthamptonDye) {
      if (input.country === 'EU') {
        warnings.push({
          code: 'EU-WARN-SOUTHAMPTON-DYE',
          field: 'ingredients',
          severity: 'warning',
          title: '어린이 주의 문구 의무 색소: 사우스햄튼 6대 타르색소',
          message: '타르색소(황색4호, 5호, 적색40호 등) 사용 시 라벨에 어린이 행동 및 주의력 영향 경고문 표기가 의무화되어 있습니다.',
          solution: '라벨에 "may have an adverse effect on activity and attention in children" 경고 문구를 인쇄하거나 천연 색소로 변경하십시오.',
          lawReference: 'Regulation (EC) No 1333/2008 Annex V',
          ruleId: 'EU-ADD-AZO-WARNING',
          whyProblem: 'EU는 해당 색소 섭취 시 어린이 ADHD 유발 가능성 경고문이 없을 경우 유통을 금지합니다.',
          howToFix: '법정 주의문구를 라벨에 추가하거나 치자색소/파프리카추출물 등으로 포뮬레이션을 변경하십시오.',
          authority: 'EFSA'
        });
      }
    }
  }

  // 4. Detailed Additive Authorization Matrix & Max Level Checks (Phase 13)
  try {
    const authFlags = validateAdditiveAuthorization({
      id: 'temp',
      productId: 'temp',
      country: input.country,
      version: 1,
      status: 'draft',
      productCategoryLocal: input.productCategory,
      ingredients: input.ingredients.map((ing) => ({
        ingredientNameKo: ing.ingredientNameKo || '',
        ingredientNameTarget: ing.ingredientNameEn || ing.ingredientNameKo || '',
        ratio: (ing as any).ratio ?? (ing as any).percentage ?? 0,
        isAllergen: false,
        insOrENumber: ing.eNumber,
      })),
    });

    for (const flag of authFlags) {
      if (flag.severity === 'critical') {
        critical.push(flag);
      } else if (flag.severity === 'warning') {
        warnings.push(flag);
      } else {
        info.push(flag);
      }
    }
  } catch (err) {
    // Non-blocking fallback
  }

  return { critical, warnings, info };
}

