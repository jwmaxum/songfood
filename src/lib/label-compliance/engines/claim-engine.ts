import { ValidationInput, RedFlagItem } from '../types';

/**
 * Claim & Marketing Engine
 * - CN GB 7718-2025: Absolute prohibition of zero-additive claims ("零添加", "不添加", "不含防腐剂")
 * - US/EU/JP Nutrition Claims:
 *   - Sugar-free: <= 0.5g sugar / 100g
 *   - Low-fat: <= 3g fat / 100g
 *   - High-protein: >= 10g protein (or >= 20% NRV)
 */
export function validateClaims(input: ValidationInput): {
  critical: RedFlagItem[];
  warnings: RedFlagItem[];
  info: RedFlagItem[];
} {
  const critical: RedFlagItem[] = [];
  const warnings: RedFlagItem[] = [];
  const info: RedFlagItem[] = [];

  const rawText = `${input.rawText || ''} ${(input.claimsBadges || []).join(' ')} ${input.productNameLocal || ''}`.toLowerCase();

  // 1. CHINA GB 7718-2025: Absolute prohibition of Zero Additive Claims
  if (input.country === 'CN') {
    const forbiddenCnClaims = [
      { kw: '零添加', desc: '무첨가 (零添加)' },
      { kw: '不添加', desc: '불첨가 (不添加)' },
      { kw: '不含防腐剂', desc: '방부제 무첨가 (不含防腐剂)' },
      { kw: '无添加', desc: '무첨가 (无添加)' },
      { kw: '0添加', desc: '0첨가 (0添加)' },
    ];

    for (const claim of forbiddenCnClaims) {
      if (rawText.includes(claim.kw)) {
        critical.push({
          code: 'CN-CRIT-CLAIM-ZERO-ADDITIVE-GB7718',
          field: 'claimsBadges',
          severity: 'critical',
          title: `중국 GB 7718-2025 전면 금지 소구: "${claim.desc}"`,
          message: `중국 신규 식품라벨총칙 GB 7718-2025에 따라 "零添加", "不添加" 등 무첨가 소구 문구는 소비자를 오도하는 기만적 마케팅으로 규정되어 전면 금지되었습니다.`,
          solution: `라벨 및 패키지, 홍보 문구에서 "${claim.kw}" 및 관련 무첨가 주장을 완전히 삭제하십시오.`,
          lawReference: 'GB 7718-2025 Section 3.8 / SAMR Enforcement Rules',
          ruleId: 'CN-CLAIM-ZERO-ADD-BAN',
          whyProblem: '신규 GB 7718 표준은 첨가물 무첨가 표기를 소비자에 대한 공포 마케팅 및 불공정 경쟁 행위로 엄격 차단합니다.',
          howToFix: '패키지 디자인 판권 및 마케팅 카피에서 "零添加" 단어를 모두 제거하십시오.',
          authority: 'SAMR / GACC'
        });
      }
    }
  }

  // 2. Sugar-Free / Zero-Sugar Claim Verification against Nutrition Facts
  const claimsSugarFree =
    rawText.includes('무설탕') ||
    rawText.includes('sugar free') ||
    rawText.includes('zero sugar') ||
    rawText.includes('无糖');

  if (claimsSugarFree && input.nutrition) {
    const sugars = input.nutrition.totalSugarsG ?? (input.nutrition as any).sugarsG ?? 0;
    if (sugars > 0.5) {
      critical.push({
        code: 'COMMON-CRIT-CLAIM-SUGAR-FREE-EXCEEDED',
        field: 'nutrition',
        severity: 'critical',
        title: `무설탕(Sugar-Free) 강조 기준 초과 (당류: ${sugars}g / 기준: <= 0.5g)`,
        message: `무설탕 표시 기준은 100g당 당류 0.5g 이하이나, 현재 영양성분표상 당류 함량이 ${sugars}g입니다.`,
        solution: '무설탕(Sugar-Free/0 Sugar) 강조 표시를 삭제하거나 당류 함량을 기준치 이하로 줄이십시오.',
        lawReference: 'CODEX Guidelines for Use of Nutrition Claims (CAC/GL 23-1997)',
        ruleId: 'GLOBAL-CLAIM-SUGAR-FREE',
        whyProblem: '영양성분표상 당류 함량이 법적 무설탕 기준을 초과하면 허위/과대 표시로 간주됩니다.',
        howToFix: '라벨 강조 배지에서 "무설탕 / Sugar-Free" 문구를 삭제하십시오.',
        authority: 'National Food Authority'
      });
    }
  }

  // 3. Low-Fat Claim Verification
  const claimsLowFat =
    rawText.includes('저지방') ||
    rawText.includes('low fat') ||
    rawText.includes('低脂');

  if (claimsLowFat && input.nutrition) {
    const totalFat = input.nutrition.totalFatG ?? 0;
    if (totalFat > 3.0) {
      warnings.push({
        code: 'COMMON-WARN-CLAIM-LOW-FAT-EXCEEDED',
        field: 'nutrition',
        severity: 'warning',
        title: `저지방(Low Fat) 강조 기준 초과 (지방: ${totalFat}g / 기준: <= 3.0g)`,
        message: `고형 식품의 저지방 표시 기준은 100g당 3g 이하이나, 현재 지방 함량이 ${totalFat}g입니다.`,
        solution: '저지방 강조 표시를 삭제하거나 제품 지방 함량을 재조정하십시오.',
        lawReference: 'CODEX Nutrition Claims / 21 CFR 101.62',
        ruleId: 'GLOBAL-CLAIM-LOW-FAT',
        whyProblem: '지방 기준치 초과 시 수입국 표시 위반 경고 조치를 받을 수 있습니다.',
        howToFix: '"저지방" 소구를 제거하십시오.',
        authority: 'National Food Authority'
      });
    }
  }

  return { critical, warnings, info };
}
