import {
  validateCompoundIngredients,
  validateProcessingAids,
  validateCountryOfOrigin,
  validateIngredientIntelligence,
} from '../lib/label-compliance/engines/ingredient-intelligence-engine';
import { ExportCountry } from '@/types/label';

describe('Ingredient Intelligence Engine (improve14)', () => {
  describe('Compound Ingredients 5% Rule (validateCompoundIngredients)', () => {
    it('배합비 5% 이상인 복합원재료의 하위 성분이 없으면 CRITICAL 위반을 반환해야 함', () => {
      const redFlags = validateCompoundIngredients(
        [
          {
            name: '고추장베이스',
            ratio: 10.0,
            isCompound: true,
            subIngredients: [],
          },
        ],
        'US' as ExportCountry
      );

      expect(redFlags.length).toBeGreaterThan(0);
      expect(redFlags.some((rf) => rf.code === 'COMMON-CRIT-COMPOUND-SUB-INGREDIENT-MISSING')).toBe(true);
      expect(redFlags[0].severity).toBe('critical');
    });

    it('배합비 5% 이상인 복합원재료의 하위 성분이 명시되어 있으면 위반이 없어야 함', () => {
      const redFlags = validateCompoundIngredients(
        [
          {
            name: '고추장베이스',
            ratio: 10.0,
            isCompound: true,
            subIngredients: [
              { name: '고춧가루', ratio: 50 },
              { name: '물엿', ratio: 30 },
              { name: '정제염', ratio: 20 },
            ],
          },
        ],
        'US' as ExportCountry
      );

      expect(redFlags.length).toBe(0);
    });

    it('배합비 5% 미만 복합원재료라도 알레르겐이 포함되어 있으면 하위 성분 전개 필수 위반을 반환해야 함', () => {
      const redFlags = validateCompoundIngredients(
        [
          {
            name: '특수시즈닝',
            ratio: 3.0,
            isCompound: true,
            subIngredients: [],
            allergenContained: '대두, 밀',
          },
        ],
        'KR' as ExportCountry
      );

      expect(redFlags.length).toBeGreaterThan(0);
      expect(redFlags.some((rf) => rf.code === 'COMMON-CRIT-COMPOUND-ALLERGEN-SUB-MANDATORY')).toBe(true);
    });

    it('배합비 5% 미만 복합원재료이고 알레르겐이 없으면 하위 성분이 없어도 허용됨 (INFO 안내만 발생 가능)', () => {
      const redFlags = validateCompoundIngredients(
        [
          {
            name: '천연혼합향료',
            ratio: 2.0,
            isCompound: true,
            subIngredients: [],
          },
        ],
        'KR' as ExportCountry
      );

      const criticals = redFlags.filter((rf) => rf.severity === 'critical');
      expect(criticals.length).toBe(0);
    });
  });

  describe('Processing Aids & Carry-over (validateProcessingAids)', () => {
    it('알레르겐 유래 가공조제가 원재료 라벨에 고지되지 않으면 CRITICAL 위반을 반환해야 함', () => {
      const redFlags = validateProcessingAids(
        [
          {
            name: '정제 덱스트린',
            function: '여과조제',
            derivedFromAllergen: '밀 (Wheat)',
            disclosedOnLabel: false,
          },
        ],
        '소맥분, 정제수, 백설탕',
        'EU' as ExportCountry
      );

      expect(redFlags.length).toBeGreaterThan(0);
      expect(redFlags.some((rf) => rf.code === 'COMMON-CRIT-PROCESSING-AID-ALLERGEN-UNDISCLOSED')).toBe(true);
    });

    it('알레르겐 유래 가공조제라도 원재료 라벨 텍스트에 이미 고지되어 있으면 면제 규정 충족으로 통과해야 함', () => {
      const redFlags = validateProcessingAids(
        [
          {
            name: '소맥 추출 효소',
            function: '가공조제',
            derivedFromAllergen: '밀',
            disclosedOnLabel: true,
          },
        ],
        '소맥분(밀: 미국산), 효소(밀유래), 정제염',
        'US' as ExportCountry
      );

      expect(redFlags.length).toBe(0);
    });

    it('알레르겐과 무관한 일반 가공조제는 면제 안내(INFO)만 제공해야 함', () => {
      const redFlags = validateProcessingAids(
        [
          {
            name: '규조토',
            function: '여과제',
            disclosedOnLabel: false,
          },
        ],
        '정제수, 주정',
        'KR' as ExportCountry
      );

      expect(redFlags.some((rf) => rf.severity === 'critical')).toBe(false);
      expect(redFlags.some((rf) => rf.code === 'COMMON-INFO-PROCESSING-AID-EXEMPTION')).toBe(true);
    });
  });

  describe('Country of Origin (COOL) Engine (validateCountryOfOrigin)', () => {
    it('일본(JP) 가공식품에서 배합비 1위 원재료의 원산지가 누락되면 CRITICAL 위반이어야 함', () => {
      const redFlags = validateCountryOfOrigin(
        [
          { name: '돼지고기', ratio: 55.0, origin: '' }, // 1위 원료, 원산지 누락
          { name: '양파', ratio: 20.0, origin: '国産' },
          { name: '정제염', ratio: 5.0 },
        ],
        'JP' as ExportCountry,
        'KR',
        '豚肉、玉ねぎ、食塩'
      );

      expect(redFlags.length).toBeGreaterThan(0);
      expect(redFlags.some((rf) => rf.code === 'JP-CRIT-PRIMARY-INGREDIENT-ORIGIN-MISSING')).toBe(true);
    });

    it('일본(JP) 가공식품에서 1위 원재료 원산지가 명시되어 있으면 통과해야 함', () => {
      const redFlags = validateCountryOfOrigin(
        [
          { name: '돼지고기', ratio: 55.0, origin: '韓国産' },
          { name: '양파', ratio: 20.0, origin: '国産' },
        ],
        'JP' as ExportCountry,
        'KR',
        '豚肉（韓国産）、玉ねぎ（国産）'
      );

      expect(redFlags.some((rf) => rf.code === 'JP-CRIT-PRIMARY-INGREDIENT-ORIGIN-MISSING')).toBe(false);
    });

    it('EU 수출 라벨에서 주원재료(50% 이상) 원산지가 완제품 원산지와 다르면 Article 26(3) 경고를 반환해야 함', () => {
      const redFlags = validateCountryOfOrigin(
        [
          { name: '소고기', ratio: 60.0, origin: 'US' }, // 원재료는 미국산
          { name: '정제수', ratio: 30.0 },
        ],
        'EU' as ExportCountry,
        'KR', // 완제품 제조국은 한국
        'Beef, Water, Salt'
      );

      expect(redFlags.length).toBeGreaterThan(0);
      expect(redFlags.some((rf) => rf.code === 'EU-WARN-PRIMARY-INGREDIENT-ORIGIN-MISMATCH')).toBe(true);
      expect(redFlags.some((rf) => rf.severity === 'warning')).toBe(true);
    });

    it('미국(US) 수출 라벨에서 "Product of Korea" 등 원산지 마킹이 누락되면 INFO 권고를 반환해야 함', () => {
      const redFlags = validateCountryOfOrigin(
        [{ name: '쌀', ratio: 80.0, origin: 'KR' }],
        'US' as ExportCountry,
        'KR',
        'Rice, Water',
        '' // originMarking 누락
      );

      expect(redFlags.length).toBeGreaterThan(0);
      expect(redFlags.some((rf) => rf.code === 'US-INFO-COUNTRY-OF-ORIGIN-MARKING-RECOMMENDED')).toBe(true);
    });
  });

  describe('Integration Runner (validateIngredientIntelligence)', () => {
    it('복합원재료, 가공조제, 원산지 규칙을 한 번에 종합 검증해야 함', () => {
      const result = validateIngredientIntelligence({
        countryCode: 'JP',
        productOrigin: 'KR',
        ingredients: [
          { name: '복합양념', ratio: 15.0, isCompound: true, subIngredients: [], origin: '' },
        ],
        processingAids: [
          { name: '밀 유래 소포제', derivedFromAllergen: '밀', disclosedOnLabel: false },
        ],
        rawIngredientsText: '복합양념',
      });

      expect(result.length).toBeGreaterThanOrEqual(3);
      const codes = result.map((r) => r.code);
      expect(codes).toContain('COMMON-CRIT-COMPOUND-SUB-INGREDIENT-MISSING');
      expect(codes).toContain('COMMON-CRIT-PROCESSING-AID-ALLERGEN-UNDISCLOSED');
      expect(codes).toContain('JP-CRIT-PRIMARY-INGREDIENT-ORIGIN-MISSING');
    });
  });
});
