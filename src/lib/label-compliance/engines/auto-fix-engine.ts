import { FoodLabel } from '@/types/label';
import { RedFlagItem } from '../types';

export interface LabelPatchItem {
  id: string;
  ruleId?: string;
  redFlagCode: string;
  targetField: string; // 예: "pdp.claimHighlights", "nutrition.saltEquivalentG"
  title: string;
  description: string;
  beforeValue: any;
  afterValue: any;
  diffSummary: string;
  isRecommended: boolean;
}

export interface PatchApplicationResult {
  patchedLabel: FoodLabel;
  appliedCount: number;
  appliedPatchIds: string[];
}

/**
 * 1. Generate 1-Click Auto-Fix Patches based on Red-Flag violations
 */
export function generateAutoFixPatches(
  label: FoodLabel,
  redFlags: RedFlagItem[]
): LabelPatchItem[] {
  const patches: LabelPatchItem[] = [];

  for (const rf of redFlags) {
    const code = rf.code;

    // --- Rule 1: CN GB 7718-2025 "零添加" / "不添加" Illegal Marketing Claim ---
    if (code === 'CN-CRIT-NO-ADDITIVE-CLAIM' || code === 'CN-CRIT-ZERO-ADDITIVE' || /零添加|不添加/i.test(rf.message)) {
      const currentClaims = label.pdp?.claimHighlights || [];
      const cleanedClaims = currentClaims.filter((c) => !/零添加|不添加|zero additive/i.test(c));

      if (cleanedClaims.length !== currentClaims.length) {
        patches.push({
          id: `patch-${code}-${Date.now()}-claims`,
          ruleId: 'CN-GB7718-2025-NO-ADDITIVE-CLAIM',
          redFlagCode: code,
          targetField: 'pdp.claimHighlights',
          title: '[CN] 불법 마케팅 문구("零添加 / 不添加") 자동 삭제',
          description: '중국 GB 7718-2025 전면 금지 조항에 따라, 라벨 클레임에서 해당 문구를 자동 제거합니다.',
          beforeValue: currentClaims,
          afterValue: cleanedClaims,
          diffSummary: `클레임 목록에서 "${currentClaims.find((c) => /零添加|不添加/i.test(c)) || '零添加'}" 삭제`,
          isRecommended: true,
        });
      }
    }

    // --- Rule 2: JP Salt Equivalent (食塩相当量) Calculation ---
    if (code === 'JP-CRIT-SALT-EQUIVALENT' || code.includes('SALT-EQUIVALENT')) {
      const sodiumMg = label.nutrition?.sodiumMg || 0;
      // Salt Equivalent (g) = Sodium (mg) * 2.54 / 1000
      const calculatedSaltG = Number(((sodiumMg * 2.54) / 1000).toFixed(2));
      const currentSaltG = label.nutrition?.saltEquivalentG;

      if (currentSaltG !== calculatedSaltG) {
        patches.push({
          id: `patch-${code}-salt-calc`,
          ruleId: 'JP-CAA-SALT-EQUIVALENT-MANDATORY',
          redFlagCode: code,
          targetField: 'nutrition.saltEquivalentG',
          title: '[JP] 나트륨 기준 식염상당량(g) 자동 계산 및 주입',
          description: `일본 소비자청 규정에 따라, 나트륨 ${sodiumMg}mg을 식염상당량 ${calculatedSaltG}g으로 자동 환산 주입합니다.`,
          beforeValue: currentSaltG ?? '미표기',
          afterValue: calculatedSaltG,
          diffSummary: `식염상당량: ${currentSaltG ?? '0'}g ➔ ${calculatedSaltG}g 자동 환산 주입`,
          isRecommended: true,
        });
      }
    }

    // --- Rule 3: EU Energy kJ & kcal Dual Declaration ---
    if (code === 'EU-CRIT-ENERGY-DUAL' || code.includes('ENERGY-KJ')) {
      const kcal = label.nutrition?.caloriesKcal || 0;
      // 1 kcal = 4.184 kJ
      const calculatedKj = Math.round(kcal * 4.184);
      const currentKj = label.nutrition?.caloriesKj;

      if (!currentKj || currentKj === 0) {
        patches.push({
          id: `patch-${code}-energy-kj`,
          ruleId: 'EU-FIC-ENERGY-DUAL-DECLARATION',
          redFlagCode: code,
          targetField: 'nutrition.caloriesKj',
          title: '[EU] 에너지 단위 kJ 자동 환산 병기 주입',
          description: `Regulation No 1169/2011에 따라, 열량 ${kcal} kcal을 에너지 ${calculatedKj} kJ로 자동 환산하여 병기합니다.`,
          beforeValue: currentKj ?? '미표기',
          afterValue: calculatedKj,
          diffSummary: `에너지(kJ): ${currentKj ?? '미표기'} ➔ ${calculatedKj} kJ 주입`,
          isRecommended: true,
        });
      }
    }

    // --- Rule 4: US Allergen CONTAINS Box Formatting ---
    if (code === 'US-CRIT-ALLERGEN-CONTAINS' || code.includes('ALLERGEN-CONTAINS')) {
      const currentStmt = label.informationPanel?.containsAllergensStatement || '';
      // Ensure "CONTAINS: " uppercase format
      let formattedStmt = currentStmt.trim();
      if (!formattedStmt.toUpperCase().startsWith('CONTAINS:')) {
        formattedStmt = `CONTAINS: ${formattedStmt.replace(/^contains:?\s*/i, '').toUpperCase()}.`;
      }

      if (formattedStmt !== currentStmt) {
        patches.push({
          id: `patch-${code}-contains-format`,
          ruleId: 'US-FDA-FALCPA-CONTAINS-BOX',
          redFlagCode: code,
          targetField: 'informationPanel.containsAllergensStatement',
          title: '[US] 미 FDA 규격 "CONTAINS: ..." 대문자 표준 포맷 자동 정규화',
          description: 'FALCPA 및 FASTER Act 권고 규격에 맞추어 알레르겐 고지문구를 표준 대문자 포맷으로 정형화합니다.',
          beforeValue: currentStmt || '(공백)',
          afterValue: formattedStmt,
          diffSummary: `Contains 문구 표준화: "${currentStmt || '누락'}" ➔ "${formattedStmt}"`,
          isRecommended: true,
        });
      }
    }

    // --- Rule 5: UAE Date Format Standard (DD/MM/YYYY) ---
    if (code.includes('DATE-FORMAT') || (label.country === 'UAE' && label.datingLot?.dateFormat !== 'DD/MM/YYYY')) {
      const currentFormat = label.datingLot?.dateFormat || 'YYYY/MM/DD';
      if (currentFormat !== 'DD/MM/YYYY') {
        patches.push({
          id: `patch-${code}-uae-date-format`,
          ruleId: 'UAE-GSO-DATE-FORMATTING',
          redFlagCode: code,
          targetField: 'datingLot.dateFormat',
          title: '[UAE] GSO 표준 유통기한 일자 표기(DD/MM/YYYY) 자동 변환',
          description: '걸프표준화기구(GSO 150-1) 표준에 따라 일자 표기 형식을 DD/MM/YYYY로 자동 변환합니다.',
          beforeValue: currentFormat,
          afterValue: 'DD/MM/YYYY',
          diffSummary: `일자 표기 포맷: ${currentFormat} ➔ DD/MM/YYYY 자동 변환`,
          isRecommended: true,
        });
      }
    }

    // --- Rule 6: US Country of Origin Marking (19 U.S.C. 1304) ---
    if (code.includes('ORIGIN-MARKING') && label.country === 'US') {
      const currentNote = label.informationPanel?.importerDistributorText || '';
      if (!currentNote.toLowerCase().includes('product of korea')) {
        const afterText = currentNote ? `${currentNote}\nProduct of Korea` : 'Product of Korea';
        patches.push({
          id: `patch-${code}-origin-marking`,
          ruleId: 'US-CBP-COUNTRY-OF-ORIGIN',
          redFlagCode: code,
          targetField: 'informationPanel.importerDistributorText',
          title: '[US] 미국 세관 관세법 원산지 마킹("Product of Korea") 자동 주입',
          description: '19 U.S.C. 1304 규정에 따라 정보표시면에 "Product of Korea" 표기를 자동 삽입합니다.',
          beforeValue: currentNote || '(공백)',
          afterValue: afterText,
          diffSummary: '라벨 하단에 "Product of Korea" 원산지 증명 표기 추가',
          isRecommended: true,
        });
      }
    }
  }

  // Deduplicate patches by targetField
  const seenFields = new Set<string>();
  return patches.filter((p) => {
    if (seenFields.has(p.targetField)) return false;
    seenFields.add(p.targetField);
    return true;
  });
}

/**
 * 2. Apply Selected Patches to FoodLabel safely (Immutable)
 */
export function applyPatchesToLabel(
  originalLabel: FoodLabel,
  patches: LabelPatchItem[],
  selectedPatchIds?: string[]
): PatchApplicationResult {
  // Deep clone label
  const patched: FoodLabel = JSON.parse(JSON.stringify(originalLabel));
  const appliedIds: string[] = [];

  for (const patch of patches) {
    if (selectedPatchIds && !selectedPatchIds.includes(patch.id)) {
      continue;
    }

    const fieldPath = patch.targetField.split('.');
    if (fieldPath.length === 2) {
      const [block, key] = fieldPath;
      if (!(patched as any)[block]) {
        (patched as any)[block] = {};
      }
      (patched as any)[block][key] = patch.afterValue;
      appliedIds.push(patch.id);
    }
  }

  return {
    patchedLabel: patched,
    appliedCount: appliedIds.length,
    appliedPatchIds: appliedIds,
  };
}
