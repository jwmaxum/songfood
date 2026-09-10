import { validateLabel } from '../lib/label-compliance';

describe('글로벌 5대 권역 식품 라벨 컴플라이언스 엔진 (ComplianceRuleEngine)', () => {

  describe('1. 미국 (US FDA / USDA) 규제 검증', () => {
    test('육류 배합비 2% 초과 시 USDA 관할 경고(US-CRIT-USDA-MEAT) 발생', () => {
      const result = validateLabel({
        country: 'US',
        productNameLocal: 'Pork Mandu',
        netWeightG: 400,
        ingredients: [
          { ingredientNameKo: '돼지고기', ingredientNameTarget: 'Pork', ratio: 25.0, isAllergen: false, displayOrder: 1 },
          { ingredientNameKo: '밀가루', ingredientNameTarget: 'Wheat Flour', ratio: 75.0, isAllergen: true, displayOrder: 2 }
        ],
        nutrition: {
          servingSizeG: 100,
          caloriesKcal: 200,
          totalFatG: 5,
          saturatedFatG: 1,
          sodiumMg: 400,
          totalCarbohydrateG: 25,
          totalSugarsG: 2,
          addedSugarsG: 0,
          proteinG: 10,
          vitaminDMcg: 0,
          potassiumMg: 150
        },
        rawText: 'CONTAINS: WHEAT.'
      });

      expect(result.isCompliant).toBe(false);
      expect(result.criticalErrors.some(e => e.code === 'US-CRIT-USDA-MEAT')).toBe(true);
    });

    test('알레르겐 성분 감지되었으나 CONTAINS 박스 누락 시 에러 발생', () => {
      const result = validateLabel({
        country: 'US',
        productNameLocal: 'Vegetable Dumplings',
        netWeightG: 400,
        ingredients: [
          { ingredientNameKo: '참깨', ingredientNameTarget: 'Sesame oil', ratio: 5.0, isAllergen: true, displayOrder: 1 },
          { ingredientNameKo: '밀가루', ingredientNameTarget: 'Wheat flour', ratio: 95.0, isAllergen: true, displayOrder: 2 }
        ],
        nutrition: {
          servingSizeG: 100,
          caloriesKcal: 180,
          totalFatG: 3,
          saturatedFatG: 0.5,
          sodiumMg: 350,
          totalCarbohydrateG: 30,
          totalSugarsG: 2,
          addedSugarsG: 0,
          proteinG: 6,
          vitaminDMcg: 0,
          potassiumMg: 100
        },
        rawText: '' // CONTAINS 누락
      });

      expect(result.isCompliant).toBe(false);
      expect(result.criticalErrors.some(e => e.code === 'US-CRIT-ALLERGEN-CONTAINS')).toBe(true);
      expect(result.criticalErrors.some(e => e.code === 'US-CRIT-SESAME-CALLOUT')).toBe(true);
    });

    test('미국 완전 적합 라벨은 100점 통과', () => {
      const result = validateLabel({
        country: 'US',
        productNameLocal: 'Vegetable & Shrimp Mandu',
        netWeightG: 480,
        netWeightOz: 16.9,
        dateMarkingType: 'MM/DD/YYYY',
        ingredients: [
          { ingredientNameKo: '밀가루', ingredientNameTarget: 'Wheat Flour', ratio: 50.0, isAllergen: true, displayOrder: 1 },
          { ingredientNameKo: '새우', ingredientNameTarget: 'Shrimp', ratio: 20.0, isAllergen: true, displayOrder: 2 },
          { ingredientNameKo: '참기름', ingredientNameTarget: 'Sesame Oil', ratio: 5.0, isAllergen: true, displayOrder: 3 },
          { ingredientNameKo: '양배추', ingredientNameTarget: 'Cabbage', ratio: 25.0, isAllergen: false, displayOrder: 4 }
        ],
        nutrition: {
          servingSizeG: 120,
          caloriesKcal: 220,
          totalFatG: 6,
          saturatedFatG: 1,
          sodiumMg: 460,
          totalCarbohydrateG: 32,
          totalSugarsG: 3,
          addedSugarsG: 1,
          proteinG: 9,
          vitaminDMcg: 0,
          potassiumMg: 180
        },
        rawText: 'CONTAINS: WHEAT, CRUSTACEAN SHELLFISH (SHRIMP), SESAME.'
      });

      expect(result.isCompliant).toBe(true);
      expect(result.criticalErrors.length).toBe(0);
      expect(result.score).toBe(100);
    });
  });

  describe('2. 중국 (China SAMR / GACC) 규제 검증', () => {
    test('GACC 18자리 등록번호 누락 시 차단', () => {
      const result = validateLabel({
        country: 'CN',
        productNameLocal: '韩式鲜蔬水饺',
        netWeightG: 480,
        registrationNumbers: {}, // GACC 누락
        ingredients: [
          { ingredientNameKo: '밀가루', ingredientNameTarget: '小麦粉', ratio: 100.0, isAllergen: true, displayOrder: 1 }
        ],
        nutrition: {
          servingSizeG: 100,
          caloriesKcal: 200,
          caloriesKj: 836,
          totalFatG: 5,
          saturatedFatG: 1,
          sodiumMg: 400,
          totalCarbohydrateG: 30,
          totalSugarsG: 2,
          proteinG: 8
        }
      });

      expect(result.isCompliant).toBe(false);
      expect(result.criticalErrors.some(e => e.code === 'CN-CRIT-GACC-MISSING')).toBe(true);
    });

    test('GB 7718-2025 무첨가(零添加) 마케팅 문구 사용 시 차단', () => {
      const result = validateLabel({
        country: 'CN',
        productNameLocal: '韩式水饺',
        claimsBadges: ['零添加防腐剂'], // 금지 문구
        netWeightG: 480,
        registrationNumbers: { gaccCode: 'CKOR24092601009988' },
        ingredients: [
          { ingredientNameKo: '밀가루', ingredientNameTarget: '小麦粉', ratio: 100.0, isAllergen: true, displayOrder: 1 }
        ],
        nutrition: {
          servingSizeG: 100,
          caloriesKcal: 200,
          caloriesKj: 836,
          totalFatG: 5,
          saturatedFatG: 1,
          sodiumMg: 400,
          totalCarbohydrateG: 30,
          totalSugarsG: 2,
          proteinG: 8
        }
      });

      expect(result.isCompliant).toBe(false);
      expect(result.criticalErrors.some(e => e.code === 'CN-CRIT-NO-ADDITIVE-CLAIM')).toBe(true);
    });
  });

  describe('3. 일본 (Japan 소비자청 CAA) 규제 검증', () => {
    test('나트륨 대비 식염상당량 미표기 시 에러 발생', () => {
      const result = validateLabel({
        country: 'JP',
        productNameLocal: '韓国プレミアム餃子',
        netWeightG: 480,
        ingredients: [
          { ingredientNameKo: '밀가루', ingredientNameTarget: '小麦粉', ratio: 100.0, isAllergen: true, displayOrder: 1 }
        ],
        nutrition: {
          servingSizeG: 100,
          caloriesKcal: 200,
          totalFatG: 5,
          saturatedFatG: 1,
          sodiumMg: 400,
          // saltEquivalentG 누락
          totalCarbohydrateG: 30,
          totalSugarsG: 2,
          proteinG: 8
        }
      });

      expect(result.isCompliant).toBe(false);
      expect(result.criticalErrors.some(e => e.code === 'JP-CRIT-SALT-EQUIVALENT')).toBe(true);
    });

    test('추정성 알레르겐 표기("들어 있을지도 모름") 시 차단', () => {
      const result = validateLabel({
        country: 'JP',
        productNameLocal: '韓国プレミアム餃子',
        netWeightG: 480,
        rawText: '本製品には小麦が入っているかもしれない。',
        ingredients: [
          { ingredientNameKo: '밀가루', ingredientNameTarget: '小麦粉', ratio: 100.0, isAllergen: true, displayOrder: 1 }
        ],
        nutrition: {
          servingSizeG: 100,
          caloriesKcal: 200,
          totalFatG: 5,
          saturatedFatG: 1,
          sodiumMg: 400,
          saltEquivalentG: 1.02,
          totalCarbohydrateG: 30,
          totalSugarsG: 2,
          proteinG: 8
        }
      });

      expect(result.isCompliant).toBe(false);
      expect(result.criticalErrors.some(e => e.code === 'JP-CRIT-POSSIBLE-ALLERGEN')).toBe(true);
    });
  });

  describe('4. 유럽연합 (EU EFSA / EC) 규제 검증', () => {
    test('EU 전면 금지 첨가물 E171(이산화티타늄) 감지 시 즉시 차단', () => {
      const result = validateLabel({
        country: 'EU',
        productNameLocal: 'Korean Dumplings',
        netWeightG: 480,
        ingredients: [
          { ingredientNameKo: '착색료', ingredientNameTarget: 'Titanium dioxide', insOrENumber: 'E171', ratio: 1.0, isAllergen: false, displayOrder: 1 },
          { ingredientNameKo: '밀가루', ingredientNameTarget: 'Wheat flour', ratio: 99.0, isAllergen: true, displayOrder: 2 }
        ],
        nutrition: {
          servingSizeG: 100,
          caloriesKcal: 200,
          caloriesKj: 836,
          totalFatG: 5,
          saturatedFatG: 1,
          sodiumMg: 400,
          saltEquivalentG: 1.0,
          totalCarbohydrateG: 30,
          totalSugarsG: 2,
          proteinG: 8
        }
      });

      expect(result.isCompliant).toBe(false);
      expect(result.criticalErrors.some(e => e.code === 'EU-CRIT-BANNED-E171')).toBe(true);
    });
  });

  describe('5. 아랍에미리트 (UAE MoIAT / GSO) 규제 검증', () => {
    test('알코올 잔류량 0.05% 초과 시 차단', () => {
      const result = validateLabel({
        country: 'UAE',
        productNameLocal: 'صلصة كورية حلال',
        alcoholPercentage: 0.25, // 0.05% 초과
        netWeightG: 300,
        ingredients: [
          { ingredientNameKo: '고춧가루', ingredientNameTarget: 'مسحوق الفلفل الحار', ratio: 100.0, isAllergen: false, displayOrder: 1 }
        ],
        nutrition: {
          servingSizeG: 100,
          caloriesKcal: 150,
          totalFatG: 2,
          saturatedFatG: 0.5,
          sodiumMg: 500,
          totalCarbohydrateG: 25,
          totalSugarsG: 10,
          proteinG: 3
        }
      });

      expect(result.isCompliant).toBe(false);
      expect(result.criticalErrors.some(e => e.code === 'UAE-CRIT-ALCOHOL-LIMIT')).toBe(true);
    });

    test('하람 성분(돼지고기) 포함 시 즉시 차단', () => {
      const result = validateLabel({
        country: 'UAE',
        productNameLocal: 'فطائر كورية',
        alcoholPercentage: 0.0,
        netWeightG: 480,
        ingredients: [
          { ingredientNameKo: '돼지고기', ingredientNameTarget: 'Pork meat', ratio: 20.0, isAllergen: false, displayOrder: 1 },
          { ingredientNameKo: '밀가루', ingredientNameTarget: 'دقيق القمح', ratio: 80.0, isAllergen: true, displayOrder: 2 }
        ],
        nutrition: {
          servingSizeG: 100,
          caloriesKcal: 200,
          totalFatG: 5,
          saturatedFatG: 1,
          sodiumMg: 400,
          totalCarbohydrateG: 30,
          totalSugarsG: 2,
          proteinG: 8
        }
      });

      expect(result.isCompliant).toBe(false);
      expect(result.criticalErrors.some(e => e.code === 'UAE-CRIT-HARAM-INGREDIENT')).toBe(true);
    });
  });

});
