import { FoodLabel } from '@/types/label';
import {
  generateAutoFixPatches,
  applyPatchesToLabel,
} from '../lib/label-compliance/engines/auto-fix-engine';
import { runBatchReevaluation } from '../lib/label-compliance/engines/batch-reevaluation-engine';
import { RedFlagItem } from '../lib/label-compliance/types';

describe('Auto-Fix & Batch Re-evaluation Engine (Phase 16)', () => {
  describe('1. Auto-Fix Patch Generator (generateAutoFixPatches)', () => {
    it('중국 라벨에 零添加 클레임이 존재할 경우 자동 제거 패치를 생성해야 함', () => {
      const label: FoodLabel = {
        id: 'label-cn-fix',
        productId: 'prod-dumpling',
        country: 'CN',
        version: 1,
        status: 'warning',
        pdp: {
          claimHighlights: ['100% 猪肉', '零添加防腐剂', '手工制作'],
        },
      };

      const redFlags: RedFlagItem[] = [
        {
          code: 'CN-CRIT-NO-ADDITIVE-CLAIM',
          field: 'pdp.claimHighlights',
          severity: 'critical',
          title: '[CN] 零添加 불법 클레임 금지',
          message: '중국 GB 7718-2025에 따라 零添加 표기는 불법입니다.',
          solution: '클레임에서 해당 문구를 삭제하십시오.',
        },
      ];

      const patches = generateAutoFixPatches(label, redFlags);
      expect(patches.length).toBe(1);
      expect(patches[0].targetField).toBe('pdp.claimHighlights');
      expect(patches[0].afterValue).toEqual(['100% 猪肉', '手工制作']);
      expect(patches[0].afterValue).not.toContain('零添加防腐剂');
    });

    it('일본 라벨의 나트륨(mg)에 대해 식염상당량(g) 자동 계산 패치를 생성해야 함', () => {
      const label: FoodLabel = {
        id: 'label-jp-salt',
        productId: 'prod-dumpling',
        country: 'JP',
        version: 1,
        status: 'warning',
        nutrition: {
          servingSizeG: 100,
          caloriesKcal: 200,
          totalFatG: 5,
          saturatedFatG: 2,
          sodiumMg: 400, // 400 * 2.54 / 1000 = 1.016 -> 1.02g
          totalCarbohydrateG: 20,
          totalSugarsG: 2,
          proteinG: 8,
        },
      };

      const redFlags: RedFlagItem[] = [
        {
          code: 'JP-CRIT-SALT-EQUIVALENT',
          field: 'nutrition.saltEquivalentG',
          severity: 'critical',
          title: '[JP] 식염상당량 표기 의무',
          message: '식염상당량이 누락되었습니다.',
          solution: '나트륨을 식염상당량으로 환산하여 기재하십시오.',
        },
      ];

      const patches = generateAutoFixPatches(label, redFlags);
      expect(patches.length).toBe(1);
      expect(patches[0].targetField).toBe('nutrition.saltEquivalentG');
      expect(patches[0].afterValue).toBe(1.02);
    });

    it('EU 라벨의 열량(kcal)에 대해 에너지 kJ 자동 환산 병기 패치를 생성해야 함', () => {
      const label: FoodLabel = {
        id: 'label-eu-energy',
        productId: 'prod-dumpling',
        country: 'EU',
        version: 1,
        status: 'warning',
        nutrition: {
          servingSizeG: 100,
          caloriesKcal: 200, // 200 * 4.184 = 837 kJ
          totalFatG: 5,
          saturatedFatG: 2,
          sodiumMg: 300,
          totalCarbohydrateG: 20,
          totalSugarsG: 2,
          proteinG: 8,
        },
      };

      const redFlags: RedFlagItem[] = [
        {
          code: 'EU-CRIT-ENERGY-DUAL',
          field: 'nutrition.caloriesKj',
          severity: 'critical',
          title: '[EU] 에너지 kJ 표기 의무',
          message: '에너지 kJ가 누락되었습니다.',
          solution: 'kJ 단위를 병기하십시오.',
        },
      ];

      const patches = generateAutoFixPatches(label, redFlags);
      expect(patches.length).toBe(1);
      expect(patches[0].targetField).toBe('nutrition.caloriesKj');
      expect(patches[0].afterValue).toBe(837);
    });

    it('미국 알레르겐 Contains 문구를 표준 대문자 포맷으로 정규화하는 패치를 생성해야 함', () => {
      const label: FoodLabel = {
        id: 'label-us-contains',
        productId: 'prod-dumpling',
        country: 'US',
        version: 1,
        status: 'warning',
        informationPanel: {
          containsAllergensStatement: 'contains wheat, soy.',
        },
      };

      const redFlags: RedFlagItem[] = [
        {
          code: 'US-CRIT-ALLERGEN-CONTAINS',
          field: 'informationPanel.containsAllergensStatement',
          severity: 'critical',
          title: '[US] 알레르겐 CONTAINS 박스 정규화',
          message: '표준 CONTAINS 대문자 포맷이 아닙니다.',
          solution: 'CONTAINS 대문자 포맷으로 교정하십시오.',
        },
      ];

      const patches = generateAutoFixPatches(label, redFlags);
      expect(patches.length).toBe(1);
      expect(patches[0].targetField).toBe('informationPanel.containsAllergensStatement');
      expect(patches[0].afterValue).toBe('CONTAINS: WHEAT, SOY..');
    });
  });

  describe('2. Patch Applicator (applyPatchesToLabel)', () => {
    it('선택된 패치를 안전하게 적용하여 새로운 FoodLabel을 생성해야 함 (불변성 유지)', () => {
      const originalLabel: FoodLabel = {
        id: 'label-apply-test',
        productId: 'prod-1',
        country: 'JP',
        version: 1,
        status: 'warning',
        nutrition: {
          servingSizeG: 100,
          caloriesKcal: 200,
          totalFatG: 5,
          saturatedFatG: 2,
          sodiumMg: 400,
          totalCarbohydrateG: 20,
          totalSugarsG: 2,
          proteinG: 8,
        },
      };

      const patches = [
        {
          id: 'patch-salt-1',
          redFlagCode: 'JP-CRIT-SALT-EQUIVALENT',
          targetField: 'nutrition.saltEquivalentG',
          title: '식염상당량 주입',
          description: '1.02g 주입',
          beforeValue: undefined,
          afterValue: 1.02,
          diffSummary: '미표기 -> 1.02g',
          isRecommended: true,
        },
      ];

      const result = applyPatchesToLabel(originalLabel, patches, ['patch-salt-1']);
      expect(result.appliedCount).toBe(1);
      expect(result.patchedLabel.nutrition?.saltEquivalentG).toBe(1.02);
      // 원본 객체는 오염되지 않아야 함
      expect(originalLabel.nutrition?.saltEquivalentG).toBeUndefined();
    });
  });

  describe('3. Batch Re-evaluation Engine (runBatchReevaluation)', () => {
    it('여러 국가의 라벨 컬렉션을 일괄 재평가하고 종합 영향도 리포트를 산출해야 함', () => {
      const labels: FoodLabel[] = [
        {
          id: 'lbl-1-us',
          productId: 'prod-1',
          country: 'US',
          version: 1,
          status: 'compliant',
          header: { productNameKo: '왕교자', legalProductType: 'Frozen Dumplings' },
          pdp: { netWeightG: 1000 },
          ingredients: [
            { ingredientNameKo: '돼지고기', ingredientNameTarget: 'Pork', ratio: 30, isAllergen: false }, // 미국 소고기/돼지고기 2% 초과
          ],
        },
        {
          id: 'lbl-2-cn',
          productId: 'prod-2',
          country: 'CN',
          version: 1,
          status: 'compliant',
          header: { productNameKo: '김치', legalProductType: 'Pickled Veg' },
          pdp: { claimHighlights: ['零添加'] }, // 중국 GB 7718 위반
        },
        {
          id: 'lbl-3-jp',
          productId: 'prod-3',
          country: 'JP',
          version: 1,
          status: 'compliant',
          header: { productNameKo: '불고기양념' },
          nutrition: { servingSizeG: 100, caloriesKcal: 150, totalFatG: 2, saturatedFatG: 0, sodiumMg: 500, totalCarbohydrateG: 30, totalSugarsG: 15, proteinG: 3 },
        },
      ];

      const report = runBatchReevaluation(labels, {
        rulePackVersion: 'v2.5 (2026 Q3 Enterprise Edition)',
      });

      expect(report.totalLabelsEvaluated).toBe(3);
      expect(report.rulePackVersion).toContain('v2.5');
      expect(report.countryDistribution.US.total).toBe(1);
      expect(report.countryDistribution.CN.total).toBe(1);
      expect(report.countryDistribution.JP.total).toBe(1);
      expect(report.results.length).toBe(3);
      // 자동 수정 패치 생성 여부 확인
      const cnResult = report.results.find((r) => r.country === 'CN');
      expect(cnResult?.availablePatches.length).toBeGreaterThanOrEqual(1);
    });
  });
});
