import { validateLabel } from '@/lib/label-compliance';

describe('Phase 7: European Union (EU) FIC Regulatory Unit Tests', () => {
  test('1. Strictly bans Titanium Dioxide (E171) under Regulation (EU) 2022/63', () => {
    const res = validateLabel({
      country: 'EU',
      productNameLocal: '유럽향 백색 소스 만두',
      productCategory: '만두류',
      ingredients: [
        { ingredientNameKo: '이산화티타늄', ratio: 0.5 },
        { ingredientNameKo: '밀가루', ratio: 99.5, isAllergen: true },
      ],
      netWeightG: 500,
      claimsBadges: [],
    });

    const e171Flag = res.criticalErrors.find((f) => f.code === 'EU-CRIT-BANNED-E171');
    expect(e171Flag).toBeDefined();
    expect(e171Flag?.title).toContain('E171');
  });

  test('2. Enforces dual energy unit (kJ & kcal) under FIC 1169/2011', () => {
    const res = validateLabel({
      country: 'EU',
      productNameLocal: '야채 교자',
      productCategory: '만두류',
      ingredients: [{ ingredientNameKo: '밀가루', ratio: 100, isAllergen: true }],
      netWeightG: 500,
      claimsBadges: [],
      nutrition: {
        servingSizeG: 100,
        caloriesKcal: 200,
        // caloriesKj missing
      },
    });

    const energyFlag = res.criticalErrors.find((f) => f.code === 'EU-CRIT-ENERGY-DUAL');
    expect(energyFlag).toBeDefined();
    expect(energyFlag?.title).toContain('kJ');
  });

  test('3. Passes EU compliance when kJ/kcal dual energy and allergens are emphasized', () => {
    const res = validateLabel({
      country: 'EU',
      productNameLocal: 'Korean Vegetable Dumplings',
      productCategory: 'Stuffed Pasta',
      ingredients: [
        { ingredientNameKo: 'WHEAT FLOUR', ratio: 70, isAllergen: true },
        { ingredientNameKo: 'TOFU (SOYBEANS)', ratio: 30, isAllergen: true },
      ],
      netWeightG: 500,
      claimsBadges: [],
      rawText: 'Ingredients: <b>Wheat Flour</b>, <b>Tofu (Soybeans)</b>.',
      nutrition: {
        servingSizeG: 100,
        caloriesKcal: 210,
        caloriesKj: 882,
        totalFatG: 5,
        saturatedFatG: 1.2,
        totalCarbohydrateG: 32,
        totalSugarsG: 2,
        proteinG: 8,
        sodiumMg: 380,
      },
    });

    const criticals = res.criticalErrors.filter((f) => f.code.startsWith('EU-CRIT'));
    expect(criticals.length).toBe(0);
  });
});
