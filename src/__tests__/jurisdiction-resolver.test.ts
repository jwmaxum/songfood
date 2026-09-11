import { resolveJurisdiction, resolveProductScope, calculateMeatPercentages } from '@/lib/label-compliance/jurisdiction-resolver';

describe('Jurisdiction Resolver Engine', () => {
  describe('Product Scope Resolution', () => {
    it('correctly classifies dumplings as frozen_foods', () => {
      const scope = resolveProductScope('가공식품', '비비고 김치왕교자', [
        { ingredientNameKo: '김치', ratio: 30 },
        { ingredientNameKo: '밀가루', ratio: 20 },
      ]);
      expect(scope).toBe('frozen_foods');
    });

    it('classifies red meat products', () => {
      const scope = resolveProductScope('식육가공품', '소고기 장조림', [
        { ingredientNameKo: '소고기', ratio: 45 },
        { ingredientNameKo: '간장', ratio: 15 },
      ]);
      expect(scope).toBe('meat_cooked');
    });

    it('classifies alcoholic beverages', () => {
      const scope = resolveProductScope('주류', '안동소주', [
        { ingredientNameKo: '쌀', ratio: 50 },
        { ingredientNameKo: '주정', ratio: 15 },
      ]);
      expect(scope).toBe('alcohol_wine');
    });
  });

  describe('US FDA vs USDA-FSIS Meat Threshold Resolution', () => {
    it('routes to USDA-FSIS and flags export restriction when meat ratio >= 2.0%', () => {
      const resolution = resolveJurisdiction({
        country: 'US',
        productName: 'CJ 비비고 돼지고기 만두',
        categoryName: '냉동만두',
        ingredients: [
          { ingredientNameKo: '밀가루', ratio: 35 },
          { ingredientNameKo: '돼지고기', ratio: 15 }, // 15% >= 2.0%
          { ingredientNameKo: '부추', ratio: 10 },
        ],
      });

      expect(resolution.primaryAuthority).toContain('USDA-FSIS');
      expect(resolution.isExportRestricted).toBe(true);
      expect(resolution.requiresPreApproval).toBe(true);
      expect(resolution.restrictionReason).toContain('USDA-FSIS');
      expect(resolution.applicableLaws).toContain('Federal Meat Inspection Act (FMIA) - 21 U.S.C. 601');
    });

    it('routes to US-FDA when meat ratio < 2.0%', () => {
      const resolution = resolveJurisdiction({
        country: 'US',
        productName: '비비고 야채 만두',
        categoryName: '냉동만두',
        ingredients: [
          { ingredientNameKo: '밀가루', ratio: 40 },
          { ingredientNameKo: '양배추', ratio: 25 },
          { ingredientNameKo: '두부', ratio: 15 },
          { ingredientNameKo: '돼지고기 추출 엑기스', ratio: 0.5 }, // 0.5% < 2.0%
        ],
      });

      expect(resolution.primaryAuthority).toContain('US FDA');
      expect(resolution.isExportRestricted).toBe(false);
      expect(resolution.requiresPreApproval).toBe(false);
      expect(resolution.applicableLaws).toContain('FDA 2016 Nutrition Facts Labeling Final Rule (21 CFR 101.9)');
    });
  });

  describe('China GACC & UAE Halal Routing', () => {
    it('routes China frozen food to GACC pre-approval required category', () => {
      const resolution = resolveJurisdiction({
        country: 'CN',
        productName: '해물교자',
        categoryName: '냉동식품',
        ingredients: [
          { ingredientNameKo: '밀가루', ratio: 40 },
          { ingredientNameKo: '새우', ratio: 20 },
        ],
      });

      expect(resolution.primaryAuthority).toContain('GACC');
      expect(resolution.requiresPreApproval).toBe(true);
      expect(resolution.applicableLaws).toContain('GACC Decree No. 248 (Provisions on Registration of Overseas Manufacturers)');
      expect(resolution.specialMandates.some((m) => m.includes('18-digit GACC'))).toBe(true);
    });

    it('flags export restriction immediately when UAE product contains pork', () => {
      const resolution = resolveJurisdiction({
        country: 'UAE',
        productName: '포크 스팸',
        ingredients: [
          { ingredientNameKo: '돼지고기', ratio: 80 },
          { ingredientNameKo: '소금', ratio: 2 },
        ],
      });

      expect(resolution.primaryAuthority).toContain('MoIAT');
      expect(resolution.isExportRestricted).toBe(true);
      expect(resolution.restrictionReason).toContain('Haram');
    });
  });
});
