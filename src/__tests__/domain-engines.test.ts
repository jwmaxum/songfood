import { validateQuid } from '@/lib/label-compliance/engines/quid-engine';
import { validateAdditives } from '@/lib/label-compliance/engines/additive-engine';
import { validateNetQuantity } from '@/lib/label-compliance/engines/net-quantity-engine';
import { validateClaims } from '@/lib/label-compliance/engines/claim-engine';
import { validateLabel } from '@/lib/label-compliance';
import { ValidationInput } from '@/lib/label-compliance/types';

describe('Phase 8 Domain-Specific Compliance Engines', () => {
  describe('QUID Engine (EU FIC 1169 Article 22)', () => {
    it('detects missing QUID percentage when ingredient is in product name for EU', () => {
      const input: ValidationInput = {
        country: 'EU',
        productNameLocal: 'Bibigo Kimchi Dumplings',
        netWeightG: 350,
        ingredients: [
          { ingredientNameKo: '김치', ingredientNameEn: 'kimchi' }, // ratio missing
          { ingredientNameKo: '밀가루', ratio: 30 },
        ],
      };

      const result = validateQuid(input);
      expect(result.critical.length).toBeGreaterThanOrEqual(1);
      expect(result.critical[0].code).toBe('EU-CRIT-QUID-MISSING');
      expect(result.critical[0].lawReference).toContain('EU Regulation No 1169/2011 Article 22');
      expect(result.critical[0].whyProblem).toBeDefined();
      expect(result.critical[0].howToFix).toBeDefined();
    });

    it('passes QUID when percentage is declared for named ingredient', () => {
      const input: ValidationInput = {
        country: 'EU',
        productNameLocal: 'Bibigo Kimchi Dumplings',
        netWeightG: 350,
        ingredients: [
          { ingredientNameKo: '김치', ingredientNameEn: 'kimchi', ratio: 28 }, // declared
          { ingredientNameKo: '밀가루', ratio: 30 },
        ],
      };

      const result = validateQuid(input);
      expect(result.critical.length).toBe(0);
    });
  });

  describe('Additive Engine (E171 Ban & Halal Control)', () => {
    it('triggers critical error for Titanium Dioxide (E171) in EU', () => {
      const input: ValidationInput = {
        country: 'EU',
        productNameLocal: 'White Chocolate Candy',
        netWeightG: 100,
        ingredients: [
          { ingredientNameKo: '설탕', ratio: 50 },
          { ingredientNameKo: '이산화티타늄', eNumber: 'E171', ratio: 0.2 },
        ],
      };

      const result = validateAdditives(input);
      expect(result.critical.some((e) => e.code === 'EU-CRIT-ADDITIVE-E171')).toBe(true);
      expect(result.critical[0].authority).toContain('EFSA');
    });

    it('requires halal certification proof for Gelatin in UAE', () => {
      const input: ValidationInput = {
        country: 'UAE',
        productNameLocal: 'Gummy Jelly',
        netWeightG: 80,
        ingredients: [
          { ingredientNameKo: '물엿', ratio: 60 },
          { ingredientNameKo: '젤라틴', eNumber: 'E441', ratio: 10 },
        ],
      };

      const result = validateAdditives(input);
      expect(result.critical.some((e) => e.code === 'UAE-CRIT-ADDITIVE-GELATIN')).toBe(true);
    });
  });

  describe('Net Quantity & Legibility Engine (x-height)', () => {
    it('rejects x-height < 1.2mm for standard EU package (>= 80cm²)', () => {
      const input: ValidationInput = {
        country: 'EU',
        productNameLocal: 'Ramen Pack',
        netWeightG: 120,
        packageAreaCm2: 150,
        fontXHeightMm: 1.0, // < 1.2mm
        ingredients: [{ ingredientNameKo: '소맥분', ratio: 70 }],
      };

      const result = validateNetQuantity(input);
      expect(result.critical.some((e) => e.code === 'EU-CRIT-FONT-XHEIGHT-STANDARD')).toBe(true);
    });

    it('allows x-height 1.0mm for small EU package (< 80cm²)', () => {
      const input: ValidationInput = {
        country: 'EU',
        productNameLocal: 'Mini Snack Bar',
        netWeightG: 30,
        packageAreaCm2: 50, // < 80cm²
        fontXHeightMm: 1.0, // >= 0.9mm
        ingredients: [{ ingredientNameKo: '귀리', ratio: 80 }],
      };

      const result = validateNetQuantity(input);
      expect(result.critical.filter((e) => e.code.includes('FONT-XHEIGHT')).length).toBe(0);
    });

    it('warns on US package when dual unit (oz) is missing', () => {
      const input: ValidationInput = {
        country: 'US',
        productNameLocal: 'Korean Seaweed',
        netWeightG: 50, // netWeightOz missing
        ingredients: [{ ingredientNameKo: '김', ratio: 95 }],
      };

      const result = validateNetQuantity(input);
      expect(result.warnings.some((w) => w.code === 'US-WARN-NET-DUAL-UNIT')).toBe(true);
    });
  });

  describe('Claim Engine (China GB 7718 Zero-Additive Ban)', () => {
    it('strictly forbids "零添加" (Zero Additive) claim in China', () => {
      const input: ValidationInput = {
        country: 'CN',
        productNameLocal: '순수 양조간장',
        netWeightG: 500,
        claimsBadges: ['零添加 (무첨가)'],
        ingredients: [
          { ingredientNameKo: '대두', ratio: 40 },
          { ingredientNameKo: '소맥', ratio: 30 },
        ],
      };

      const result = validateClaims(input);
      expect(result.critical.some((c) => c.code === 'CN-CRIT-CLAIM-ZERO-ADDITIVE-GB7718')).toBe(true);
      expect(result.critical[0].lawReference).toContain('GB 7718-2025');
    });

    it('rejects Sugar-Free claim when nutrition facts sugar > 0.5g', () => {
      const input: ValidationInput = {
        country: 'US',
        productNameLocal: 'Diet Drink',
        netWeightG: 250,
        claimsBadges: ['Sugar Free'],
        ingredients: [{ ingredientNameKo: '정제수', ratio: 95 }],
        nutrition: {
          caloriesKcal: 5,
          servingSizeG: 250,
          totalFatG: 0,
          saturatedFatG: 0,
          sodiumMg: 10,
          totalCarbohydrateG: 2,
          proteinG: 0,
          totalSugarsG: 1.5, // > 0.5g
        },
      };

      const result = validateClaims(input);
      expect(result.critical.some((c) => c.code.includes('CLAIM-SUGAR-FREE-EXCEEDED'))).toBe(true);
    });
  });

  describe('validateLabel Integrated Pipeline Output', () => {
    it('returns full enterprise metadata (ruleId, authority, whyProblem, howToFix, subEngineReports)', () => {
      const input: ValidationInput = {
        country: 'US',
        productNameLocal: '비비고 쇠고기 왕교자',
        netWeightG: 450,
        netWeightOz: 15.87,
        dateMarkingType: 'BEST_BEFORE',
        dateMarkingText: '2026-12-31',
        storageInstructions: 'Keep Frozen at -18°C',
        rawText: 'Product of Korea. Contains: Wheat, Soy.',
        ingredients: [
          { ingredientNameKo: '소고기', ratio: 25 }, // >= 2.0% -> USDA-FSIS restriction
          { ingredientNameKo: '밀가루', ratio: 40 },
          { ingredientNameKo: '부추', ratio: 35 },
        ],
        nutrition: {
          servingSizeG: 150,
          caloriesKcal: 320,
          totalFatG: 12,
          saturatedFatG: 3,
          sodiumMg: 450,
          totalCarbohydrateG: 38,
          totalSugarsG: 3,
          proteinG: 15,
        },
      };

      const res = validateLabel(input);
      expect(res.jurisdictionInfo).toBeDefined();
      expect(res.jurisdiction).toContain('USDA-FSIS');
      expect(res.isCompliant).toBe(false);
      expect(res.subEngineReports?.length).toBe(14);

      // Verify enriched RedFlagItem fields
      for (const item of res.criticalErrors) {
        expect(item.ruleId).toBeDefined();
        expect(item.whyProblem).toBeDefined();
        expect(item.howToFix).toBeDefined();
        expect(item.authority).toBeDefined();
      }
    });
  });
});
