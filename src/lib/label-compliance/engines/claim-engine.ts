import { ValidationInput, RedFlagItem } from '../types';

/**
 * Enterprise Claim & Marketing Compliance Engine
 * - US FDA 21 CFR 101 Subpart D: Nutrient Content Claims
 *   * Free (Fat-free, Sugar-free, Sodium-free, Calorie-free)
 *   * Low (Low-fat, Low-sodium, Low-calorie)
 *   * High / Excellent source (>= 20% DV) vs Good source (10-19% DV)
 * - China GB 7718-2025 Section 3.8: Absolute ban on "零添加", "不添加", "无添加", "0添加"
 * - Certifications: Halal certificate verification, Vegan recipe conflict check, Organic registration
 */

const ANIMAL_INGREDIENT_KEYWORDS = [
  '소고기', '쇠고기', '돼지고기', '돈육', '우육', '닭고기', '계육', '오리', 'beef', 'pork', 'chicken', 'duck',
  '우유', '치즈', '버터', '유청', 'milk', 'cheese', 'butter', 'whey',
  '계란', '달걀', '난백', '난황', 'egg',
  '생선', '새우', '게', '오징어', '멸치', '조개', 'fish', 'shrimp', 'crab', 'squid',
  '젤라틴', '돈지', '우지', 'gelatin', 'lard', 'tallow'
];

export function validateClaims(input: ValidationInput): {
  critical: RedFlagItem[];
  warnings: RedFlagItem[];
  info: RedFlagItem[];
} {
  const critical: RedFlagItem[] = [];
  const warnings: RedFlagItem[] = [];
  const info: RedFlagItem[] = [];

  const rawText = `${input.rawText || ''} ${(input.claimsBadges || []).join(' ')} ${input.productNameLocal || ''} ${input.productNameEn || ''}`.toLowerCase();
  const nut = input.nutrition;

  // =========================================================================
  // 1. CHINA GB 7718-2025: Absolute prohibition of Zero-Additive Claims
  // =========================================================================
  if (input.country === 'CN') {
    const forbiddenCnClaims = [
      { kw: '零添加', desc: '무첨가 (零添加)' },
      { kw: '不添加', desc: '불첨가 (不添加)' },
      { kw: '无添加', desc: '무첨가 (无添加)' },
      { kw: '0添加', desc: '0첨가 (0添加)' },
      { kw: '不含防腐剂', desc: '방부제 무첨가 (不含防腐剂)' },
      { kw: '不含色素', desc: '색소 무첨가 (不含色素)' },
      { kw: '零防腐剂', desc: '무방부제 (零防腐剂)' },
    ];

    for (const claim of forbiddenCnClaims) {
      if (rawText.includes(claim.kw)) {
        critical.push({
          code: 'CN-CRIT-CLAIM-ZERO-ADDITIVE-GB7718',
          field: 'claimsBadges',
          severity: 'critical',
          title: `중국 GB 7718-2025 전면 금지 소구: "${claim.desc}"`,
          message: `중국 신규 식품라벨총칙 GB 7718-2025 제3.8조에 따라 "零添加", "不添加" 등 무첨가 소구 문구는 소비자를 오도하는 기만적 마케팅으로 규정되어 전면 금지되었습니다.`,
          solution: `라벨 주표시면, 정보표시면, 홍보 문구에서 "${claim.kw}" 및 관련 무첨가 주장을 완전히 삭제하십시오.`,
          lawReference: 'GB 7718-2025 Section 3.8 / SAMR Enforcement Decree',
          ruleId: 'CN-CLAIM-ZERO-ADD-BAN',
          whyProblem: '신규 GB 7718 표준은 첨가물 무첨가 표기를 소비자에 대한 공포 마케팅 및 불공정 경쟁 행위로 규정하여 입항 즉시 통관 차단 및 회수 명령을 내립니다.',
          howToFix: '패키지 디자인 판권 및 마케팅 카피에서 "零添加" 단어를 모두 제거하십시오.',
          authority: 'SAMR / GACC'
        });
      }
    }
  }

  // =========================================================================
  // 2. US FDA 21 CFR 101 Subpart D & Global Nutrient Content Claims
  // =========================================================================

  // 2.1 Sugar-Free / Zero Sugar Claim (FDA: < 0.5g per serving, CODEX: <= 0.5g per 100g)
  const isClaimingSugarFree =
    rawText.includes('무설탕') ||
    rawText.includes('sugar free') ||
    rawText.includes('zero sugar') ||
    rawText.includes('sugar-free') ||
    rawText.includes('无糖');

  if (isClaimingSugarFree && nut) {
    const sugars = nut.totalSugarsG ?? (nut as any).sugarsG ?? 0;
    if (sugars >= 0.5) {
      critical.push({
        code: input.country === 'US' ? 'US-CRIT-CLAIM-SUGAR-FREE-EXCEEDED' : 'COMMON-CRIT-CLAIM-SUGAR-FREE-EXCEEDED',
        field: 'nutrition',
        severity: 'critical',
        title: `무설탕(Sugar-Free) 강조 기준 초과 (당류: ${sugars}g / 기준치: < 0.5g)`,
        message: `무설탕 표시 기준(21 CFR 101.60(c))은 1회 제공량당 당류 0.5g 미만이어야 하나, 현재 영양성분표상 당류 함량이 ${sugars}g입니다.`,
        solution: '무설탕(Sugar-Free/0 Sugar) 강조 표시를 삭제하거나 당류 함량을 0.5g 미만으로 줄이십시오.',
        lawReference: '21 CFR 101.60(c) / CODEX CAC/GL 23-1997',
        ruleId: 'US-CLAIM-SUGAR-FREE',
        whyProblem: '영양성분표상 수치와 상충되는 무설탕 표기는 FDA에서 기만적 오도(Misleading/Misbranding)로 규정합니다.',
        howToFix: '라벨 강조 배지에서 "무설탕 / Sugar-Free" 문구를 즉시 삭제하십시오.',
        authority: input.country === 'US' ? 'US FDA' : 'National Food Authority'
      });
    }
  }

  // 2.2 Fat-Free / Zero Fat Claim (FDA: < 0.5g per serving)
  const isClaimingFatFree =
    rawText.includes('무지방') ||
    rawText.includes('fat free') ||
    rawText.includes('fat-free') ||
    rawText.includes('zero fat') ||
    rawText.includes('无脂肪');

  if (isClaimingFatFree && nut) {
    const totalFat = nut.totalFatG ?? 0;
    if (totalFat >= 0.5) {
      critical.push({
        code: input.country === 'US' ? 'US-CRIT-CLAIM-FAT-FREE-EXCEEDED' : 'COMMON-CRIT-CLAIM-FAT-FREE-EXCEEDED',
        field: 'nutrition',
        severity: 'critical',
        title: `무지방(Fat-Free) 강조 기준 초과 (지방: ${totalFat}g / 기준치: < 0.5g)`,
        message: `무지방 표시 기준(21 CFR 101.62(b))은 1회 제공량당 지방 0.5g 미만이어야 하나, 현재 지방 함량이 ${totalFat}g입니다.`,
        solution: '무지방(Fat-Free) 강조 표시를 삭제하거나 제품 포뮬레이션을 조정하십시오.',
        lawReference: '21 CFR 101.62(b)(1)',
        ruleId: 'US-CLAIM-FAT-FREE',
        whyProblem: '지방이 검출되는데 무지방으로 허위 강조하는 행위는 FDA 경고서한(Warning Letter) 및 수입 보류 대상입니다.',
        howToFix: '라벨에서 "Fat-Free" 소구를 제거하십시오.',
        authority: input.country === 'US' ? 'US FDA' : 'National Food Authority'
      });
    }
  }

  // 2.3 Low-Fat Claim (FDA: <= 3g per RACC/serving, CODEX: <= 3g per 100g)
  const isClaimingLowFat =
    rawText.includes('저지방') ||
    rawText.includes('low fat') ||
    rawText.includes('low-fat') ||
    rawText.includes('低脂');

  if (isClaimingLowFat && nut) {
    const totalFat = nut.totalFatG ?? 0;
    if (totalFat > 3.0) {
      critical.push({
        code: input.country === 'US' ? 'US-CRIT-CLAIM-LOW-FAT-EXCEEDED' : 'COMMON-CRIT-CLAIM-LOW-FAT-EXCEEDED',
        field: 'nutrition',
        severity: 'critical',
        title: `저지방(Low-Fat) 강조 기준 초과 (지방: ${totalFat}g / 기준치: <= 3.0g)`,
        message: `저지방 표시 기준(21 CFR 101.62(b)(2))은 1회 제공량(100g)당 지방 3.0g 이하이어야 하나, 현재 지방 함량이 ${totalFat}g입니다.`,
        solution: '저지방(Low-Fat) 강조 표시를 삭제하거나 원재료의 유지류 함량을 낮추십시오.',
        lawReference: '21 CFR 101.62(b)(2) / CODEX Guidelines',
        ruleId: 'US-CLAIM-LOW-FAT',
        whyProblem: '법정 기준치(3g)를 초과한 상태에서의 저지방 표기는 부당 표시행위로 처벌받습니다.',
        howToFix: '"저지방" 소구를 제거하십시오.',
        authority: input.country === 'US' ? 'US FDA' : 'National Food Authority'
      });
    }
  }

  // 2.4 Sodium-Free / Zero-Sodium Claim (FDA: < 5mg per serving)
  const isClaimingSodiumFree =
    rawText.includes('무염') ||
    rawText.includes('sodium free') ||
    rawText.includes('sodium-free') ||
    rawText.includes('salt free') ||
    rawText.includes('无钠');

  if (isClaimingSodiumFree && nut) {
    const sodium = nut.sodiumMg ?? 0;
    if (sodium >= 5) {
      critical.push({
        code: input.country === 'US' ? 'US-CRIT-CLAIM-SODIUM-FREE-EXCEEDED' : 'COMMON-CRIT-CLAIM-SODIUM-FREE-EXCEEDED',
        field: 'nutrition',
        severity: 'critical',
        title: `무염/무나트륨(Sodium-Free) 기준 초과 (나트륨: ${sodium}mg / 기준치: < 5mg)`,
        message: `무나트륨 표시 기준(21 CFR 101.61(b)(1))은 1회 제공량당 나트륨 5mg 미만이어야 하나, 현재 ${sodium}mg이 함유되어 있습니다.`,
        solution: '무나트륨 강조 표시를 삭제하십시오.',
        lawReference: '21 CFR 101.61(b)(1)',
        ruleId: 'US-CLAIM-SODIUM-FREE',
        whyProblem: '고혈압 환자 등 건강 위해 요소를 오도할 수 있어 엄격 처벌됩니다.',
        howToFix: '"Sodium-Free / 무염" 강조 표시를 삭제하십시오.',
        authority: input.country === 'US' ? 'US FDA' : 'National Food Authority'
      });
    }
  }

  // 2.5 Low-Sodium Claim (FDA: <= 140mg per RACC/serving)
  const isClaimingLowSodium =
    rawText.includes('저염') ||
    rawText.includes('low sodium') ||
    rawText.includes('low-sodium') ||
    rawText.includes('低钠');

  if (isClaimingLowSodium && nut) {
    const sodium = nut.sodiumMg ?? 0;
    if (sodium > 140) {
      critical.push({
        code: input.country === 'US' ? 'US-CRIT-CLAIM-LOW-SODIUM-EXCEEDED' : 'COMMON-CRIT-CLAIM-LOW-SODIUM-EXCEEDED',
        field: 'nutrition',
        severity: 'critical',
        title: `저염/저나트륨(Low-Sodium) 기준 초과 (나트륨: ${sodium}mg / 기준치: <= 140mg)`,
        message: `저나트륨 표시 기준(21 CFR 101.61(b)(4))은 1회 제공량당 나트륨 140mg 이하이어야 하나, 현재 ${sodium}mg입니다.`,
        solution: '저염(Low Sodium) 표시를 삭제하거나 레시피의 식염/간장 함량을 감량하십시오.',
        lawReference: '21 CFR 101.61(b)(4)',
        ruleId: 'US-CLAIM-LOW-SODIUM',
        whyProblem: '140mg 초과 제품에 저염 표기 시 미국 통관 불합격 조치됩니다.',
        howToFix: '"Low Sodium" 배지를 삭제하십시오.',
        authority: input.country === 'US' ? 'US FDA' : 'National Food Authority'
      });
    }
  }

  // 2.6 Calorie-Free / Zero-Calorie Claim (FDA: < 5 kcal per serving)
  const isClaimingCalorieFree =
    rawText.includes('0칼로리') ||
    rawText.includes('zero calorie') ||
    rawText.includes('calorie free') ||
    rawText.includes('calorie-free') ||
    rawText.includes('0卡');

  if (isClaimingCalorieFree && nut) {
    const cal = nut.caloriesKcal ?? 0;
    if (cal >= 5) {
      critical.push({
        code: 'US-CRIT-CLAIM-ZERO-CALORIE-EXCEEDED',
        field: 'nutrition',
        severity: 'critical',
        title: `제로 칼로리(Calorie-Free) 기준 초과 (열량: ${cal}kcal / 기준치: < 5kcal)`,
        message: `제로 칼로리 기준(21 CFR 101.60(b)(1))은 1회 제공량당 5kcal 미만이어야 하나, 현재 ${cal}kcal입니다.`,
        solution: '제로 칼로리(0 Calorie) 강조 표시를 삭제하십시오.',
        lawReference: '21 CFR 101.60(b)(1)',
        ruleId: 'US-CLAIM-CALORIE-FREE',
        whyProblem: '허위 칼로리 강조는 중대한 소비자 기만 행위입니다.',
        howToFix: '0 칼로리 배지를 삭제하십시오.',
        authority: 'US FDA'
      });
    }
  }

  // 2.7 High-Protein / Excellent Source of Protein (FDA: >= 20% DV = >= 10g per serving)
  const isClaimingHighProtein =
    rawText.includes('고단백') ||
    rawText.includes('high protein') ||
    rawText.includes('excellent source of protein') ||
    rawText.includes('高蛋白');

  if (isClaimingHighProtein && nut) {
    const protein = nut.proteinG ?? 0;
    // FDA Daily Value for protein is 50g -> 20% DV is 10g
    if (protein < 10) {
      warnings.push({
        code: 'US-WARN-CLAIM-HIGH-PROTEIN-UNMET',
        field: 'nutrition',
        severity: 'warning',
        title: `고단백(High Protein / Excellent Source) 기준 미달 (단백질: ${protein}g / 기준치: >= 10g)`,
        message: `미 FDA 기준 'High / Excellent Source of Protein'(21 CFR 101.54(b))은 1회 제공량당 1일 영양성분기준치(%DV)의 20% 이상(10g 이상)이어야 합니다. 현재 ${protein}g으로 미달합니다 (10~19%는 'Good Source'만 허용).`,
        solution: `단백질 함량을 10g 이상으로 높이거나, 강조 문구를 "Good source of protein"(5g~9.9g 사이일 때)으로 수정하십시오.`,
        lawReference: '21 CFR 101.54(b) / 21 CFR 101.54(c)',
        ruleId: 'US-CLAIM-HIGH-PROTEIN',
        whyProblem: '미달된 영양소에 대해 High 표기를 사용하면 FDA 표시 위반 시정명령을 받게 됩니다.',
        howToFix: '"High Protein"을 "Good Source of Protein"으로 변경하십시오.',
        authority: 'US FDA'
      });
    }
  }

  // =========================================================================
  // 3. Special Dietary & Certification Claims Verification
  // =========================================================================

  // 3.1 Vegan Claim vs Animal Ingredients Conflict Check
  const isClaimingVegan =
    rawText.includes('비건') ||
    rawText.includes('vegan') ||
    rawText.includes('plant-based') ||
    rawText.includes('100% 식물성') ||
    rawText.includes('纯素');

  if (isClaimingVegan) {
    const animalConflictIng = input.ingredients.find((ing) => {
      const name = (ing.ingredientNameKo || '').toLowerCase();
      const target = (ing.ingredientNameTarget || (ing as any).ingredientNameEn || '').toLowerCase();
      return ANIMAL_INGREDIENT_KEYWORDS.some((k) => name.includes(k) || target.includes(k));
    });

    if (animalConflictIng) {
      critical.push({
        code: 'COMMON-CRIT-CLAIM-VEGAN-ANIMAL-CONFLICT',
        field: 'claimsBadges',
        severity: 'critical',
        title: `비건(Vegan) 클레임과 동물성 원재료 배합 충돌 ("${animalConflictIng.ingredientNameKo}")`,
        message: `제품에 비건(Vegan/Plant-based) 강조 표시가 적용되었으나, 원재료 목록에 동물성 원료("${animalConflictIng.ingredientNameKo}")가 검출되었습니다.`,
        solution: '비건 인증/소구 표시를 삭제하거나 동물성 원료를 100% 식물성 대체 원료로 변경하십시오.',
        lawReference: 'ISO 23662:2021 (Definitions and technical criteria for foods suitable for vegetarians or vegans)',
        ruleId: 'GLOBAL-CLAIM-VEGAN-CONFLICT',
        whyProblem: '비건 소비자에 대한 기만 표시이자 현지 비건 인증 단체 및 소비자원 고발 사유입니다.',
        howToFix: '비건 배지를 즉시 삭제하거나 포뮬레이션에서 동물성 성분을 전면 배제하십시오.',
        authority: 'Regulatory Authority / Certification Bodies'
      });
    }
  }

  // 3.2 Halal Claim Verification for UAE/GCC
  const isClaimingHalal =
    rawText.includes('할랄') ||
    rawText.includes('halal') ||
    rawText.includes('حلال');

  if (isClaimingHalal && input.country === 'UAE') {
    const halalCert = input.registrationNumbers?.halalCertNo;
    if (!halalCert || halalCert.trim().length === 0) {
      warnings.push({
        code: 'UAE-WARN-CLAIM-HALAL-CERT-MISSING',
        field: 'registrationNumbers',
        severity: 'warning',
        title: 'UAE/GCC 공인 할랄 인증서 번호(Halal Cert No) 등록 필요',
        message: '라벨에 HALAL 마크 또는 강조 표시가 포함되어 있으나, MoIAT 공인 할랄 인증 번호가 시스템에 등록되지 않았습니다.',
        solution: 'UAE 세관 제출용 HCB 할랄 인증서 번호(예: HALAL-KMF-2026-...)를 라벨 스펙에 등록하십시오.',
        lawReference: 'GSO 2055-1 Section 7 (Halal Food Marking Requirements)',
        ruleId: 'UAE-CLAIM-HALAL-CERT',
        whyProblem: '인증 번호가 증빙되지 않은 할랄 표시는 UAE 통관 시 위조 마크로 의심받을 수 있습니다.',
        howToFix: '라벨 등록번호란에 할랄 인증 번호를 기재하십시오.',
        authority: 'MoIAT / ESMA'
      });
    }
  }

  // 3.3 Organic Claim Verification
  const isClaimingOrganic =
    rawText.includes('유기농') ||
    rawText.includes('organic') ||
    rawText.includes('유기재배') ||
    rawText.includes('有机');

  if (isClaimingOrganic) {
    info.push({
      code: 'GLOBAL-INFO-CLAIM-ORGANIC-CERT',
      field: 'claimsBadges',
      severity: 'info',
      title: '유기농(Organic) 라벨링 현지 동등성 인증서 구비 권고',
      message: '해외 유기농(USDA Organic, EU Organic 등) 표기는 수입국 인증 기관의 동등성 증명서(NAQS 동등성 인정서 등)가 필요합니다.',
      solution: '수출 전 국립농산물품질관리원(NAQS) 발급 한-미/한-EU 유기농 동등성 인증서를 확보하십시오.',
      lawReference: '7 CFR Part 205 (National Organic Program) / Regulation (EU) 2018/848',
      ruleId: 'GLOBAL-CLAIM-ORGANIC',
      whyProblem: '미공인 유기농 로고 인쇄 제품은 통관 보류 및 유기농 명칭 삭제 명령 대상입니다.',
      howToFix: '유기농 인증서 번호와 인증기관명을 라벨에 기재하십시오.',
      authority: 'National Organic Program / EC'
    });
  }

  return { critical, warnings, info };
}
