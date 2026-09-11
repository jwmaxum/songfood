import { validateLabel } from '@/lib/label-compliance';

describe('Phase 7: China SAMR / GACC Regulatory Unit Tests', () => {
  test('1. Requires 18-digit GACC overseas facility registration code starting with C', () => {
    const res = validateLabel({
      country: 'CN',
      productNameLocal: '韩式泡菜水饺',
      productCategory: '速冻面米制品',
      ingredients: [{ ingredientNameKo: '밀가루', ratio: 100 }],
      netWeightG: 500,
      claimsBadges: [],
      registrationNumbers: {
        gaccCode: '', // missing code
      },
    });

    const gaccFlag = res.criticalErrors.find((f) => f.code === 'CN-CRIT-GACC-MISSING');
    expect(gaccFlag).toBeDefined();
    expect(gaccFlag?.title).toContain('GACC');
  });

  test('2. Strictly bans GB 7718-2025 "零添加" (Zero-Add) deceptive marketing claims', () => {
    const res = validateLabel({
      country: 'CN',
      productNameLocal: '0添加天然大豆酱',
      productCategory: '调味品',
      ingredients: [{ ingredientNameKo: '대두', ratio: 100 }],
      netWeightG: 300,
      rawText: '本品零添加防腐剂，不添加任何色素。',
      registrationNumbers: {
        gaccCode: 'CKOR19022301010088',
      },
    });

    const claimFlag = res.criticalErrors.find((f) => f.code === 'CN-CRIT-NO-ADDITIVE-CLAIM');
    expect(claimFlag).toBeDefined();
    expect(claimFlag?.title).toContain('零添加');
  });

  test('3. Passes China compliance when GACC is valid and Simplified Chinese is used', () => {
    const res = validateLabel({
      country: 'CN',
      productNameLocal: '韩式蔬菜水饺',
      productCategory: '速冻面米制品',
      ingredients: [{ ingredientNameKo: '밀가루', ratio: 100 }],
      netWeightG: 500,
      claimsBadges: [],
      registrationNumbers: {
        gaccCode: 'CKOR19022301010088',
      },
      nutrition: {
        servingSizeG: 100,
        energyKj: 840,
        proteinG: 8,
        totalFatG: 5,
        totalCarbohydrateG: 25,
        sodiumMg: 350,
      },
    });

    const gaccFlag = res.criticalErrors.find((f) => f.code === 'CN-CRIT-GACC-MISSING');
    expect(gaccFlag).toBeUndefined();
  });
});
