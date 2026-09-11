import { validateLabel } from '@/lib/label-compliance';

describe('Phase 7: UAE / GCC MoIAT & Halal Regulatory Unit Tests', () => {
  test('1. Strictly blocks residual ethyl alcohol exceeding 0.05%', () => {
    const res = validateLabel({
      country: 'UAE',
      productNameLocal: '맛술 발효 교자소스',
      productCategory: '소스류',
      ingredients: [
        { ingredientNameKo: '발효주정', ratio: 0.8 },
        { ingredientNameKo: '양조간장', ratio: 99.2 },
      ],
      alcoholPercentage: 0.8,
      netWeightG: 200,
      claimsBadges: [],
    });

    const alcoholFlag = res.criticalErrors.find((f) => f.code === 'UAE-CRIT-ALCOHOL-LIMIT');
    expect(alcoholFlag).toBeDefined();
    expect(alcoholFlag?.title).toContain('알코올');
  });

  test('2. Strictly blocks pork and non-halal animal ingredients', () => {
    const res = validateLabel({
      country: 'UAE',
      productNameLocal: '돼지고기 김치만두',
      productCategory: '만두류',
      ingredients: [
        { ingredientNameKo: '돼지고기', ratio: 30 },
        { ingredientNameKo: '밀가루', ratio: 70 },
      ],
      netWeightG: 500,
      claimsBadges: [],
    });

    const haramFlag = res.criticalErrors.find((f) => f.code === 'UAE-CRIT-HARAM-INGREDIENT');
    expect(haramFlag).toBeDefined();
    expect(haramFlag?.title).toContain('하람');
  });

  test('3. Passes UAE compliance when Halal certification and vegetarian/halal meat are compliant', () => {
    const res = validateLabel({
      country: 'UAE',
      productNameLocal: 'خضروات كورية حلال (Halal Vegetable Dumplings)',
      productCategory: 'Dumplings',
      ingredients: [
        { ingredientNameKo: 'دقيق القمح (Wheat Flour)', ratio: 60, isAllergen: true },
        { ingredientNameKo: 'توفو فول الصويا (Soybean Tofu)', ratio: 40, isAllergen: true },
      ],
      netWeightG: 500,
      claimsBadges: ['Halal Certified 100%'],
      registrationNumbers: {
        halalCertNo: 'HALAL-MOIAT-2026-9901',
      },
      nutrition: {
        servingSizeG: 100,
        caloriesKcal: 210,
        totalFatG: 4,
        saturatedFatG: 0.8,
        sodiumMg: 360,
        totalSugarsG: 2,
        proteinG: 9,
      },
    });

    const criticals = res.criticalErrors.filter((f) => f.code.startsWith('UAE-CRIT'));
    expect(criticals.length).toBe(0);
  });
});
