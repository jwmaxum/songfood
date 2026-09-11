import { validateLabel } from '@/lib/label-compliance';

describe('Phase 7: US FDA / USDA Regulatory Unit Tests', () => {
  test('1. Flags USDA FSIS warning and Korean meat ban when beef/pork > 2%', () => {
    const res = validateLabel({
      country: 'US',
      productNameLocal: '소고기 야채교자',
      productCategory: '만두류',
      ingredients: [
        { ingredientNameKo: '소고기', ingredientNameTarget: 'Beef', ratio: 20, isAllergen: false },
        { ingredientNameKo: '밀가루', ingredientNameTarget: 'Wheat Flour', ratio: 80, isAllergen: true },
      ],
      netWeightG: 500,
      claimsBadges: [],
    });

    const usdaFlag = res.criticalErrors.find((f) => f.code === 'US-CRIT-USDA-MEAT');
    expect(usdaFlag).toBeDefined();
    expect(usdaFlag?.title).toContain('USDA');
  });

  test('2. Enforces FASTER Act 2023 Sesame allergen CONTAINS declaration', () => {
    const res = validateLabel({
      country: 'US',
      productNameLocal: '참기름 참깨 스낵',
      productCategory: '스낵류',
      ingredients: [
        { ingredientNameKo: '참깨', ingredientNameTarget: 'Sesame', ratio: 15, isAllergen: true },
        { ingredientNameKo: '소맥분', ingredientNameTarget: 'Wheat flour', ratio: 85, isAllergen: true },
      ],
      netWeightG: 100,
      claimsBadges: [],
      rawText: '', // missing CONTAINS
    });

    const allergenFlag = res.criticalErrors.find((f) => f.code === 'US-CRIT-ALLERGEN-CONTAINS');
    expect(allergenFlag).toBeDefined();
  });

  test('3. Passes US FDA compliance when CONTAINS box and net weight oz are satisfied', () => {
    const res = validateLabel({
      country: 'US',
      productNameLocal: '야채 손만두 (Pork-Free)',
      productCategory: '만두류',
      ingredients: [
        { ingredientNameKo: '양배추', ingredientNameTarget: 'Cabbage', ratio: 60, isAllergen: false },
        { ingredientNameKo: '밀가루', ingredientNameTarget: 'Wheat Flour', ratio: 40, isAllergen: true },
      ],
      netWeightG: 480,
      netWeightOz: 16.9,
      claimsBadges: [],
      rawText: 'CONTAINS: WHEAT.',
      nutrition: {
        servingSizeG: 120,
        caloriesKcal: 200,
        totalFatG: 4,
        saturatedFatG: 1,
        sodiumMg: 400,
        addedSugarsG: 0,
        proteinG: 8,
        vitaminDMcg: 0,
        potassiumMg: 100,
      },
    });

    const criticals = res.criticalErrors.filter((f) => f.code.startsWith('US-CRIT'));
    expect(criticals.length).toBe(0);
    expect(res.score).toBeGreaterThanOrEqual(85);
  });
});
