import { validateLabel } from '@/lib/label-compliance';

describe('Phase 7: Japan Consumer Affairs Agency (CAA) Regulatory Unit Tests', () => {
  test('1. Enforces salt equivalent (食塩相当量) instead of raw sodium', () => {
    const res = validateLabel({
      country: 'JP',
      productNameLocal: '韓国風ニラ水餃子',
      productCategory: '冷凍ぎょうざ',
      ingredients: [{ ingredientNameKo: '밀가루', ratio: 100 }],
      netWeightG: 400,
      claimsBadges: [],
      nutrition: {
        servingSizeG: 100,
        sodiumMg: 400,
        // saltEquivalentG omitted
      },
    });

    const saltFlag = res.criticalErrors.find((f) => f.code === 'JP-CRIT-SALT-EQUIVALENT');
    expect(saltFlag).toBeDefined();
    expect(saltFlag?.title).toContain('식염상당량');
  });

  test('2. Strictly prohibits ambiguous speculative allergen warnings', () => {
    const res = validateLabel({
      country: 'JP',
      productNameLocal: '韓国風ニラ水餃子',
      productCategory: '冷凍ぎょうざ',
      ingredients: [{ ingredientNameKo: '밀가루', ratio: 100, isAllergen: true }],
      netWeightG: 400,
      claimsBadges: [],
      rawText: '本品にはエビが入っているかもしれない。',
      nutrition: {
        servingSizeG: 100,
        sodiumMg: 400,
        saltEquivalentG: 1.02,
      },
    });

    const vagueFlag = res.criticalErrors.find((f) => f.code === 'JP-CRIT-POSSIBLE-ALLERGEN');
    expect(vagueFlag).toBeDefined();
    expect(vagueFlag?.title).toContain('추정성');
  });

  test('3. Passes Japan compliance with proper allergen phrasing and salt equivalent', () => {
    const res = validateLabel({
      country: 'JP',
      productNameLocal: '韓国風 野菜と春雨の王餃子',
      productCategory: '冷凍ぎょうざ',
      ingredients: [{ ingredientNameKo: '밀가루', ratio: 100, isAllergen: true }],
      netWeightG: 400,
      claimsBadges: [],
      rawText: '原材料の一部に小麦を含みます。',
      nutrition: {
        servingSizeG: 100,
        sodiumMg: 400,
        saltEquivalentG: 1.02,
      },
    });

    const criticals = res.criticalErrors.filter((f) => f.code.startsWith('JP-CRIT'));
    expect(criticals.length).toBe(0);
  });
});
