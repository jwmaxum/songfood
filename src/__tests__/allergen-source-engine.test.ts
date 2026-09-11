import {
  extractAllergenSources,
  auditAllergenDeclarations,
  validateAllergenSourcesEngine,
} from '@/lib/label-compliance/engines/allergen-source-engine';
import { ValidationInput } from '@/lib/label-compliance/types';

describe('Phase 9: Global Allergen Sources & Deceptive Advisory Engine', () => {
  describe('1. Allergen Sources Structured Model Extraction', () => {
    it('extracts structured allergen items with jurisdiction specific emphasis', () => {
      const input: ValidationInput = {
        country: 'US',
        productNameLocal: 'Bibigo Mandu',
        netWeightG: 450,
        ingredients: [
          { ingredientNameKo: '밀가루', ingredientNameEn: 'Wheat Flour', ratio: 50 },
          { ingredientNameKo: '호두', ingredientNameEn: 'Walnut', ratio: 10 },
          { ingredientNameKo: '참기름', ingredientNameEn: 'Sesame Oil', ratio: 5 },
        ],
      };

      const sources = extractAllergenSources(input);
      expect(sources.length).toBeGreaterThanOrEqual(3);

      const wheat = sources.find((s) => s.allergenKey === 'WHEAT');
      expect(wheat).toBeDefined();
      expect(wheat?.jurisdiction).toBe('US');
      expect(wheat?.declarationRequired).toBe(true);
      expect(wheat?.emphasisType).toBe('CONTAINS_BOX');

      const walnut = sources.find((s) => s.allergenKey === 'WALNUT' || s.allergenKey === 'TREE_NUT');
      expect(walnut).toBeDefined();
      expect(walnut?.speciesNameEn).toBe('walnut');
    });
  });

  describe('2. Specific Species Enforcement (FDA 21 CFR 101.4 / EU FIC)', () => {
    it('triggers critical error when tree nuts are declared generically without species for US', () => {
      const input: ValidationInput = {
        country: 'US',
        productNameLocal: 'Nutty Snack',
        netWeightG: 100,
        ingredients: [
          { ingredientNameKo: '견과류 혼합물', ingredientNameEn: 'Mixed Tree Nuts', ratio: 80 }, // generic species!
        ],
        rawText: 'CONTAINS: TREE NUTS.',
      };

      const res = validateAllergenSourcesEngine(input);
      expect(res.critical.some((c) => c.code === 'US-CRIT-ALLERGEN-SPECIES-SPECIFIC')).toBe(true);
      expect(res.critical[0].lawReference).toContain('21 CFR 101.4(h)');
    });

    it('passes when specific tree nut species (e.g. Almond, Walnut) is declared', () => {
      const input: ValidationInput = {
        country: 'US',
        productNameLocal: 'Nutty Snack',
        netWeightG: 100,
        ingredients: [
          { ingredientNameKo: '구운 아몬드', ingredientNameEn: 'Roasted Almond', ratio: 80 },
        ],
        rawText: 'CONTAINS: ALMOND (TREE NUT).',
      };

      const res = validateAllergenSourcesEngine(input);
      expect(res.critical.some((c) => c.code === 'US-CRIT-ALLERGEN-SPECIES-SPECIFIC')).toBe(false);
    });
  });

  describe('3. Deceptive Advisory Replacement Detection (Contains vs May Contain)', () => {
    it('detects illegal substitution of recipe allergen with advisory statement', () => {
      const input: ValidationInput = {
        country: 'US',
        productNameLocal: 'Traditional Kimchi Mandu',
        netWeightG: 450,
        ingredients: [
          { ingredientNameKo: '밀가루', ingredientNameEn: 'Wheat Flour', ratio: 50 },
          { ingredientNameKo: '참기름', ingredientNameEn: 'Sesame Oil', ratio: 5 }, // Recipe contains Sesame!
          { ingredientNameKo: '탈지대두', ingredientNameEn: 'Soybean', ratio: 10 },  // Recipe contains Soy!
        ],
        // Fraudulent labeling: Only Wheat in CONTAINS, Sesame and Soy pushed to May Contain
        rawText: 'CONTAINS: WHEAT. May contain: sesame, soybean, milk.',
      };

      const res = validateAllergenSourcesEngine(input);
      expect(res.critical.some((c) => c.code === 'US-CRIT-ALLERGEN-DECEPTIVE-ADVISORY')).toBe(true);
      expect(res.audit.illegalAdvisoryReplacements).toContain('SESAME');
      expect(res.audit.illegalAdvisoryReplacements).toContain('SOY');
      expect(res.audit.isFullyCompliant).toBe(false);
    });

    it('passes when all recipe allergens are declared in CONTAINS box and advisory is legitimate', () => {
      const input: ValidationInput = {
        country: 'US',
        productNameLocal: 'Traditional Kimchi Mandu',
        netWeightG: 450,
        ingredients: [
          { ingredientNameKo: '밀가루', ingredientNameEn: 'Wheat Flour', ratio: 50 },
          { ingredientNameKo: '참기름', ingredientNameEn: 'Sesame Oil', ratio: 5 },
          { ingredientNameKo: '탈지대두', ingredientNameEn: 'Soybean', ratio: 10 },
        ],
        // Legitimate labeling: all recipe allergens declared in CONTAINS box
        rawText: 'CONTAINS: WHEAT, SESAME, SOYBEAN. Manufactured in a facility that also processes peanut and milk.',
      };

      const res = validateAllergenSourcesEngine(input);
      expect(res.critical.some((c) => c.code === 'US-CRIT-ALLERGEN-DECEPTIVE-ADVISORY')).toBe(false);
      expect(res.audit.illegalAdvisoryReplacements.length).toBe(0);
    });
  });

  describe('4. Japan 2025 Cashew Nut Mandatory Upgrade & Speculation Ban', () => {
    it('triggers critical error when Cashew Nut is missing in Japan 2025 mandatory labeling', () => {
      const input: ValidationInput = {
        country: 'JP',
        productNameLocal: 'カシューナッツクッキー',
        netWeightG: 120,
        ingredients: [
          { ingredientNameKo: '밀가루', ingredientNameEn: 'Wheat Flour', ratio: 60 },
          { ingredientNameKo: '캐슈넛', ingredientNameEn: 'Cashew nut', ratio: 20 },
        ],
        allergensDeclared: ['小麦'], // Cashew nut omitted!
      };

      const res = validateAllergenSourcesEngine(input);
      expect(res.critical.some((c) => c.code === 'JP-CRIT-ALLERGEN-CASHEW-2025-MANDATORY')).toBe(true);
      expect(res.critical[0].lawReference).toContain('消費者庁 食品表示基準');
    });

    it('strictly forbids vague speculative allergen warnings in Japan', () => {
      const input: ValidationInput = {
        country: 'JP',
        productNameLocal: '韓国のりスナック',
        netWeightG: 50,
        ingredients: [{ ingredientNameKo: '김', ratio: 95 }],
        rawText: '本品にはえびが入っているかもしれない。', // Vague speculation!
      };

      const res = validateAllergenSourcesEngine(input);
      expect(res.critical.some((c) => c.code === 'JP-CRIT-POSSIBLE-ALLERGEN-BAN')).toBe(true);
      expect(res.critical[0].solution).toContain('本品製造工場では');
    });
  });
});
