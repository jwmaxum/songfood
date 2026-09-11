import {
  lookupAdditive,
  validateAdditiveAuthorization,
  normalizeAdditiveCode,
  mapFoodCategory,
} from '@/lib/label-compliance/engines/additive-authorization-engine';
import { validateAdditives } from '@/lib/label-compliance/engines/additive-engine';
import { FoodLabel } from '@/types/label';

describe('Phase 13: Additive Authorization Matrix & Max PPM Limit Engine', () => {
  describe('1. Additive Lookup & Code Normalization', () => {
    it('should normalize INS and E-number formats correctly', () => {
      expect(normalizeAdditiveCode('ins 202')).toBe('E202');
      expect(normalizeAdditiveCode('INS211')).toBe('E211');
      expect(normalizeAdditiveCode('e-330')).toBe('E330');
      expect(normalizeAdditiveCode('E955')).toBe('E955');
    });

    it('should match additive entry by E-number, canonical name, or Korean name', () => {
      const entryEU = lookupAdditive('E202', 'EU');
      expect(entryEU).toBeDefined();
      expect(entryEU?.canonicalName).toBe('Potassium Sorbate');
      expect(entryEU?.maxLevelPpm).toBe(1000);

      const entryUS = lookupAdditive('안식향산나트륨', 'US');
      expect(entryUS).toBeDefined();
      expect(entryUS?.insOrENumber).toBe('E211');

      const entryJP = lookupAdditive('구연산', 'JP');
      expect(entryJP).toBeNull(); // Citric acid in JP not in our 5-country DB or country differs
      const entryJP202 = lookupAdditive('E202', 'JP');
      expect(entryJP202?.nameKo).toBe('소르빈산칼륨');
    });

    it('should map food product categories accurately', () => {
      expect(mapFoodCategory('냉동 고기교자만두')).toBe('dumplings');
      expect(mapFoodCategory('매콤 떡볶이 소스')).toBe('sauces');
      expect(mapFoodCategory('신선 배추김치')).toBe('pickles');
      expect(mapFoodCategory('유탕면 라면')).toBe('noodles');
    });
  });

  describe('2. Additive Authorization & Maximum Level Checks', () => {
    const baseLabel: FoodLabel = {
      id: 'lbl-add-test',
      productId: 'prod-sauce',
      country: 'EU',
      version: 1,
      status: 'draft',
      productNameEn: 'Korean Sweet Chili Sauce',
      productCategoryLocal: 'Sauces and condiments',
      ingredients: [],
    };

    it('should block EU banned additive E171 (Titanium Dioxide)', () => {
      const labelWithE171: FoodLabel = {
        ...baseLabel,
        ingredients: [
          {
            ingredientNameKo: '이산화티타늄',
            ingredientNameTarget: 'Titanium Dioxide',
            insOrENumber: 'E171',
            ratio: 0.1,
            isAllergen: false,
          },
        ],
      };

      const flags = validateAdditiveAuthorization(labelWithE171);
      const crit = flags.find((f) => f.code === 'EU-CRIT-ADDITIVE-PROHIBITED');
      expect(crit).toBeDefined();
      expect(crit?.severity).toBe('critical');
      expect(crit?.title).toContain('전면 금지');
    });

    it('should detect when an additive exceeds the maximum ppm concentration limit', () => {
      // In EU, Potassium Sorbate (E202) has max limit 1000 ppm (0.10%)
      // If we provide 0.15% = 1500 ppm, it must trigger CRITICAL
      const labelExceeded: FoodLabel = {
        ...baseLabel,
        ingredients: [
          {
            ingredientNameKo: '소르빈산칼륨',
            ingredientNameTarget: 'Preservative: Potassium Sorbate',
            insOrENumber: 'E202',
            ratio: 0.15, // 1500 ppm > 1000 ppm
            isAllergen: false,
          },
        ],
      };

      const flags = validateAdditiveAuthorization(labelExceeded);
      const maxExceeded = flags.find((f) => f.code === 'EU-CRIT-ADDITIVE-MAX-LEVEL-EXCEEDED');
      expect(maxExceeded).toBeDefined();
      expect(maxExceeded?.message).toContain('1500 ppm');
      expect(maxExceeded?.message).toContain('1000 ppm');
    });

    it('should allow additive within safe ppm limits', () => {
      // 0.08% = 800 ppm < 1000 ppm
      const labelSafe: FoodLabel = {
        ...baseLabel,
        ingredients: [
          {
            ingredientNameKo: '소르빈산칼륨',
            ingredientNameTarget: 'Preservative: Potassium Sorbate (E202)',
            insOrENumber: 'E202',
            ratio: 0.08, // 800 ppm
            isAllergen: false,
          },
        ],
      };

      const flags = validateAdditiveAuthorization(labelSafe);
      const maxExceeded = flags.find((f) => f.code === 'EU-CRIT-ADDITIVE-MAX-LEVEL-EXCEEDED');
      expect(maxExceeded).toBeUndefined();
    });

    it('should allow Quantum Satis additives with no numerical maximum limit', () => {
      // Citric acid (E330) and Ascorbic acid (E300) are Quantum Satis
      const labelQS: FoodLabel = {
        ...baseLabel,
        ingredients: [
          {
            ingredientNameKo: '구연산',
            ingredientNameTarget: 'Acidity Regulator: Citric Acid',
            insOrENumber: 'E330',
            ratio: 1.2, // 12,000 ppm, but QS allows it
            isAllergen: false,
          },
        ],
      };

      const flags = validateAdditiveAuthorization(labelQS);
      const maxExceeded = flags.find((f) => f.code === 'EU-CRIT-ADDITIVE-MAX-LEVEL-EXCEEDED');
      expect(maxExceeded).toBeUndefined();
    });

    it('should block additives used in unauthorized food categories', () => {
      // Aspartame E951 in USA is authorized in beverages/sauces/desserts, but not dumplings
      const labelUnauthorizedCat: FoodLabel = {
        ...baseLabel,
        country: 'US',
        productCategoryLocal: 'Frozen Meat Dumplings',
        ingredients: [
          {
            ingredientNameKo: '아스파탐',
            ingredientNameTarget: 'Aspartame',
            insOrENumber: 'E951',
            ratio: 0.02,
            isAllergen: false,
          },
        ],
      };

      const flags = validateAdditiveAuthorization(labelUnauthorizedCat);
      const unauth = flags.find((f) => f.code === 'US-CRIT-ADDITIVE-UNAUTHORIZED-CATEGORY');
      expect(unauth).toBeDefined();
      expect(unauth?.title).toContain('미인가 식품 범주');
    });

    it('should flag mandatory Phenylketonurics warning when Aspartame is used in US without warning', () => {
      const labelAspartame: FoodLabel = {
        ...baseLabel,
        country: 'US',
        productCategoryLocal: 'Diet Sauce',
        ingredients: [
          {
            ingredientNameKo: '아스파탐',
            ingredientNameTarget: 'Aspartame',
            insOrENumber: 'E951',
            ratio: 0.02,
            isAllergen: false,
          },
        ],
      };

      const flags = validateAdditiveAuthorization(labelAspartame);
      const warning = flags.find((f) => f.code === 'US-CRIT-ASPARTAME-WARNING-MISSING');
      expect(warning).toBeDefined();
    });

    it('should warn when functional class name is omitted in EU for preservatives', () => {
      const labelOmittedClass: FoodLabel = {
        ...baseLabel,
        ingredients: [
          {
            ingredientNameKo: '소르빈산칼륨',
            ingredientNameTarget: 'Potassium Sorbate', // Missing "Preservative"
            insOrENumber: 'E202',
            ratio: 0.05,
            isAllergen: false,
          },
        ],
      };

      const flags = validateAdditiveAuthorization(labelOmittedClass);
      const funcWarn = flags.find((f) => f.code === 'EU-WARN-ADDITIVE-FUNCTION-MISSING');
      expect(funcWarn).toBeDefined();
      expect(funcWarn?.title).toContain('법정 용도명 병기 누락');
    });

    it('should detect Ponceau 4R (E124) prohibited in US', () => {
      const usLabelPonceau: FoodLabel = {
        ...baseLabel,
        country: 'US',
        ingredients: [
          {
            ingredientNameKo: '폰소 4R',
            ingredientNameTarget: 'Ponceau 4R',
            insOrENumber: 'E124',
            ratio: 0.01,
            isAllergen: false,
          },
        ],
      };

      const flags = validateAdditiveAuthorization(usLabelPonceau);
      const crit = flags.find((f) => f.code === 'US-CRIT-ADDITIVE-PROHIBITED');
      expect(crit).toBeDefined();
      expect(crit?.message).toContain('전면 금지된 첨가물');
    });
  });

  describe('3. Integration with validateAdditives pipeline', () => {
    it('should include matrix authorization violations in validateAdditives return structure', () => {
      const input = {
        country: 'EU' as const,
        productNameLocal: '칠리소스',
        netWeightG: 300,
        productCategory: 'Sauce',
        ingredients: [
          {
            ingredientNameKo: '소르빈산칼륨',
            ingredientNameEn: 'Potassium Sorbate',
            eNumber: 'E202',
            ratio: 0.2, // 2000 ppm > 1000 ppm limit
          },
        ],
      };

      const res = validateAdditives(input);
      expect(res.critical.length).toBeGreaterThan(0);
      expect(res.critical.some((c) => c.code === 'EU-CRIT-ADDITIVE-MAX-LEVEL-EXCEEDED')).toBe(true);
    });
  });
});
