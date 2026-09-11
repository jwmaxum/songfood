import { validateClaims } from '@/lib/label-compliance/engines/claim-engine';
import { ValidationInput } from '@/lib/label-compliance/types';

describe('Phase 10: Enterprise Claims & Marketing Compliance Engine', () => {
  describe('1. Free Claims (Sugar-Free, Fat-Free, Sodium-Free, Calorie-Free)', () => {
    it('rejects Sugar-Free claim when totalSugarsG >= 0.5g', () => {
      const input: ValidationInput = {
        country: 'US',
        productNameLocal: 'Diet Ice Tea',
        netWeightG: 350,
        claimsBadges: ['Sugar-Free'],
        ingredients: [{ ingredientNameKo: '정제수', ratio: 95 }],
        nutrition: {
          caloriesKcal: 25,
          servingSizeG: 350,
          totalFatG: 0,
          saturatedFatG: 0,
          sodiumMg: 10,
          totalCarbohydrateG: 5,
          totalSugarsG: 2.0, // Exceeds 0.5g!
          proteinG: 0,
        },
      };

      const res = validateClaims(input);
      expect(res.critical.some((c) => c.code === 'US-CRIT-CLAIM-SUGAR-FREE-EXCEEDED')).toBe(true);
      expect(res.critical[0].lawReference).toContain('21 CFR 101.60(c)');
    });

    it('rejects Fat-Free claim when totalFatG >= 0.5g', () => {
      const input: ValidationInput = {
        country: 'US',
        productNameLocal: 'Lean Meat Jerky',
        netWeightG: 100,
        claimsBadges: ['Fat-Free'],
        ingredients: [{ ingredientNameKo: '소고기', ratio: 90 }],
        nutrition: {
          caloriesKcal: 120,
          servingSizeG: 50,
          totalFatG: 2.5, // Exceeds 0.5g!
          saturatedFatG: 0.8,
          sodiumMg: 350,
          totalCarbohydrateG: 2,
          totalSugarsG: 0,
          proteinG: 20,
        },
      };

      const res = validateClaims(input);
      expect(res.critical.some((c) => c.code === 'US-CRIT-CLAIM-FAT-FREE-EXCEEDED')).toBe(true);
      expect(res.critical[0].lawReference).toContain('21 CFR 101.62(b)');
    });

    it('rejects Sodium-Free claim when sodiumMg >= 5mg', () => {
      const input: ValidationInput = {
        country: 'US',
        productNameLocal: 'No Salt Potato Chips',
        netWeightG: 80,
        claimsBadges: ['Sodium-Free'],
        ingredients: [{ ingredientNameKo: '감자', ratio: 80 }],
        nutrition: {
          caloriesKcal: 150,
          servingSizeG: 30,
          totalFatG: 8,
          saturatedFatG: 1,
          sodiumMg: 45, // Exceeds 5mg!
          totalCarbohydrateG: 18,
          totalSugarsG: 0,
          proteinG: 2,
        },
      };

      const res = validateClaims(input);
      expect(res.critical.some((c) => c.code === 'US-CRIT-CLAIM-SODIUM-FREE-EXCEEDED')).toBe(true);
    });

    it('rejects Calorie-Free claim when caloriesKcal >= 5', () => {
      const input: ValidationInput = {
        country: 'US',
        productNameLocal: 'Zero Calorie Soda',
        netWeightG: 355,
        claimsBadges: ['Zero Calorie'],
        ingredients: [{ ingredientNameKo: '탄산수', ratio: 98 }],
        nutrition: {
          caloriesKcal: 20, // Exceeds 5 kcal!
          servingSizeG: 355,
          totalFatG: 0,
          saturatedFatG: 0,
          sodiumMg: 10,
          totalCarbohydrateG: 4,
          totalSugarsG: 0,
          proteinG: 0,
        },
      };

      const res = validateClaims(input);
      expect(res.critical.some((c) => c.code === 'US-CRIT-CLAIM-ZERO-CALORIE-EXCEEDED')).toBe(true);
    });
  });

  describe('2. Low Claims (Low-Fat, Low-Sodium)', () => {
    it('rejects Low-Sodium claim when sodiumMg > 140mg per serving', () => {
      const input: ValidationInput = {
        country: 'US',
        productNameLocal: 'Mild Seasoned Seaweed',
        netWeightG: 30,
        claimsBadges: ['Low-Sodium'],
        ingredients: [{ ingredientNameKo: '김', ratio: 90 }],
        nutrition: {
          caloriesKcal: 40,
          servingSizeG: 10,
          totalFatG: 2,
          saturatedFatG: 0,
          sodiumMg: 380, // Exceeds 140mg!
          totalCarbohydrateG: 3,
          totalSugarsG: 0,
          proteinG: 3,
        },
      };

      const res = validateClaims(input);
      expect(res.critical.some((c) => c.code === 'US-CRIT-CLAIM-LOW-SODIUM-EXCEEDED')).toBe(true);
      expect(res.critical[0].lawReference).toContain('21 CFR 101.61(b)(4)');
    });

    it('rejects Low-Fat claim when totalFatG > 3.0g', () => {
      const input: ValidationInput = {
        country: 'US',
        productNameLocal: 'Healthy Cracker',
        netWeightG: 100,
        claimsBadges: ['Low Fat'],
        ingredients: [{ ingredientNameKo: '밀', ratio: 70 }],
        nutrition: {
          caloriesKcal: 180,
          servingSizeG: 50,
          totalFatG: 6.0, // Exceeds 3.0g!
          saturatedFatG: 1.5,
          sodiumMg: 120,
          totalCarbohydrateG: 25,
          totalSugarsG: 2,
          proteinG: 4,
        },
      };

      const res = validateClaims(input);
      expect(res.critical.some((c) => c.code === 'US-CRIT-CLAIM-LOW-FAT-EXCEEDED')).toBe(true);
    });
  });

  describe('3. High-Protein Claim (%DV Enforcement)', () => {
    it('warns when High-Protein is claimed but protein < 10g (20% DV)', () => {
      const input: ValidationInput = {
        country: 'US',
        productNameLocal: 'Energy Bar',
        netWeightG: 60,
        claimsBadges: ['High Protein'],
        ingredients: [{ ingredientNameKo: '대두단백', ratio: 30 }],
        nutrition: {
          caloriesKcal: 200,
          servingSizeG: 60,
          totalFatG: 4,
          saturatedFatG: 1,
          sodiumMg: 90,
          totalCarbohydrateG: 25,
          totalSugarsG: 8,
          proteinG: 6.0, // < 10g (Only 12% DV, qualifies only for 'Good Source')
        },
      };

      const res = validateClaims(input);
      expect(res.warnings.some((w) => w.code === 'US-WARN-CLAIM-HIGH-PROTEIN-UNMET')).toBe(true);
      expect(res.warnings[0].solution).toContain('Good source of protein');
    });
  });

  describe('4. China GB 7718-2025 Zero-Additive Ban', () => {
    it('strictly forbids "零添加", "不添加", "0添加" in China market', () => {
      const input: ValidationInput = {
        country: 'CN',
        productNameLocal: '특선 양조간장',
        netWeightG: 500,
        claimsBadges: ['0添加防腐剂', '不添加色素'],
        ingredients: [{ ingredientNameKo: '탈지대두', ratio: 50 }],
      };

      const res = validateClaims(input);
      expect(res.critical.length).toBeGreaterThanOrEqual(1);
      expect(res.critical.some((c) => c.code === 'CN-CRIT-CLAIM-ZERO-ADDITIVE-GB7718')).toBe(true);
      expect(res.critical[0].lawReference).toContain('GB 7718-2025');
    });
  });

  describe('5. Special Dietary & Certification Claims', () => {
    it('detects contradiction when Vegan is claimed on a recipe with animal ingredients', () => {
      const input: ValidationInput = {
        country: 'US',
        productNameLocal: 'Plant Mandu',
        netWeightG: 400,
        claimsBadges: ['100% Vegan'],
        ingredients: [
          { ingredientNameKo: '두부', ratio: 40 },
          { ingredientNameKo: '소고기 엑기스', ratio: 5 }, // Animal ingredient detected!
        ],
      };

      const res = validateClaims(input);
      expect(res.critical.some((c) => c.code === 'COMMON-CRIT-CLAIM-VEGAN-ANIMAL-CONFLICT')).toBe(true);
    });

    it('warns when Halal is claimed for UAE but certificate number is missing', () => {
      const input: ValidationInput = {
        country: 'UAE',
        productNameLocal: 'Chicken Dumpling',
        netWeightG: 400,
        claimsBadges: ['HALAL Certified'],
        ingredients: [{ ingredientNameKo: '닭고기', ratio: 30 }],
        registrationNumbers: {}, // halalCertNo missing!
      };

      const res = validateClaims(input);
      expect(res.warnings.some((w) => w.code === 'UAE-WARN-CLAIM-HALAL-CERT-MISSING')).toBe(true);
    });
  });
});
