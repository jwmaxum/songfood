import {
  calculateTextSimilarity,
  compareArtworkWithMaster,
  validateFontPhysicalDimensions,
  calculateContrastRatio,
  inspectArtwork,
} from '../lib/label-compliance/vision/artwork-ocr-engine';
import { FoodLabel } from '@/types/label';

describe('Artwork OCR & Vision Inspector Engine (Phase 15)', () => {
  const dummyUsLabel: FoodLabel = {
    id: 'label-us-test',
    productId: 'prod-dumpling',
    country: 'US',
    version: 1,
    status: 'draft',
    header: {
      productNameKo: '비비고 왕교자',
      productNameEn: 'Bibigo Pork Dumplings',
      productNameTarget: 'Korean Style Pork & Leek Dumplings',
      legalProductType: 'Frozen Dumplings',
    },
    pdp: {
      netWeightG: 1050,
      netWeightCustom: 'NET WT 37.03 OZ (1050g)',
      claimHighlights: ['100% Korean Pork'],
    },
    informationPanel: {
      containsAllergensStatement: 'CONTAINS: WHEAT, SOYBEAN, PORK, SESAME.',
      manufacturerName: 'Songyoungmin Food Co., Ltd.',
    },
    ingredients: [
      { ingredientNameKo: '돼지고기', ingredientNameTarget: 'Pork', ratio: 32, isAllergen: true },
      { ingredientNameKo: '소맥분', ingredientNameTarget: 'Wheat Flour', ratio: 28, isAllergen: true },
      { ingredientNameKo: '부추', ingredientNameTarget: 'Leek', ratio: 15, isAllergen: false },
    ],
  };

  describe('1. Text Similarity & Token Matching (calculateTextSimilarity)', () => {
    it('완전히 동일한 텍스트는 유사도 100%를 반환해야 함', () => {
      const text = 'Korean Style Pork Dumplings Net Wt 1050g';
      expect(calculateTextSimilarity(text, text)).toBe(100);
    });

    it('일부 토큰이 일치하는 경우 합리적인 유사도(%)를 반환해야 함', () => {
      const text1 = 'Korean Style Pork Dumplings 1050g';
      const text2 = 'Korean Style Beef Dumplings 500g';
      const score = calculateTextSimilarity(text1, text2);
      expect(score).toBeGreaterThan(30);
      expect(score).toBeLessThan(90);
    });

    it('공통 단어가 없는 텍스트는 0%를 반환해야 함', () => {
      const text1 = 'Apple Banana Orange';
      const text2 = 'Pork Beef Chicken';
      expect(calculateTextSimilarity(text1, text2)).toBe(0);
    });
  });

  describe('2. Master DB vs Artwork OCR Comparison (compareArtworkWithMaster)', () => {
    it('법정 필수 키워드와 마스터 텍스트가 모두 포함된 정상 시안은 CRITICAL 위반이 없어야 함', () => {
      const artworkText = `
        Korean Style Pork & Leek Dumplings
        NET WT 37.03 OZ (1050g)
        INGREDIENTS: Pork, Wheat Flour, Leek.
        CONTAINS: WHEAT, SOYBEAN, PORK, SESAME.
        Nutrition Facts
        Servings Per Container about 10
      `;

      const result = compareArtworkWithMaster(artworkText, dummyUsLabel);
      expect(result.missingMandatoryPhrases.length).toBe(0);
      expect(result.redFlags.filter((f) => f.severity === 'critical').length).toBe(0);
      expect(result.similarityScore).toBeGreaterThan(60);
    });

    it('수입국 필수 법정 문구(Nutrition Facts 등)가 누락되면 CRITICAL 위반을 발행해야 함', () => {
      const artworkText = `
        Korean Style Pork & Leek Dumplings
        NET WT 37.03 OZ (1050g)
        Pork, Wheat Flour, Leek.
      `;

      const result = compareArtworkWithMaster(artworkText, dummyUsLabel);
      expect(result.missingMandatoryPhrases).toContain('nutrition facts');
      expect(result.redFlags.some((f) => f.code === 'ARTWORK-CRIT-MANDATORY-PHRASE-MISSING')).toBe(true);
    });

    it('알레르겐 고지문구(Contains)가 누락되면 CRITICAL 위반을 발행해야 함', () => {
      const artworkText = `
        Korean Style Pork & Leek Dumplings
        Nutrition Facts
        Servings Per Container
        Ingredients: Pork, Wheat Flour
      `;

      const result = compareArtworkWithMaster(artworkText, dummyUsLabel);
      expect(result.redFlags.some((f) => f.code === 'ARTWORK-CRIT-ALLERGEN-STATEMENT-MISSING')).toBe(true);
    });
  });

  describe('3. Font Dimensions & x-height Validation (validateFontPhysicalDimensions)', () => {
    it('EU 포장 면적 80cm² 이상에서 x-height가 1.2mm 미만이면 CRITICAL 위반을 발행해야 함', () => {
      const result = validateFontPhysicalDimensions({
        country: 'EU',
        packageAreaCm2: 120,
        pixelHeight: 10, // 10px @ 300 DPI = 0.85 mm (< 1.2 mm)
        dpi: 300,
      });

      expect(result.isCompliant).toBe(false);
      expect(result.xHeightMm).toBeLessThan(1.2);
      expect(result.redFlags.some((f) => f.code === 'EU-CRIT-ARTWORK-FONT-XHEIGHT-TOO-SMALL')).toBe(true);
    });

    it('EU 포장 면적 80cm² 이상에서 x-height가 1.2mm 이상이면 적합해야 함', () => {
      const result = validateFontPhysicalDimensions({
        country: 'EU',
        packageAreaCm2: 120,
        pixelHeight: 16, // 16px @ 300 DPI = 1.35 mm (>= 1.2 mm)
        dpi: 300,
      });

      expect(result.isCompliant).toBe(true);
      expect(result.xHeightMm).toBeGreaterThanOrEqual(1.2);
      expect(result.redFlags.length).toBe(0);
    });

    it('EU 소형 포장(80cm² 미만)에서는 최소 기준 0.9mm가 적용되어야 함', () => {
      const result = validateFontPhysicalDimensions({
        country: 'EU',
        packageAreaCm2: 50,
        pixelHeight: 12, // 12px @ 300 DPI = 1.02 mm (>= 0.9 mm)
        dpi: 300,
      });

      expect(result.minRequiredMm).toBe(0.9);
      expect(result.isCompliant).toBe(true);
    });

    it('미국 PDP 순중량 폰트가 1/16인치(1.6mm) 미만이면 CRITICAL 위반을 발행해야 함', () => {
      const result = validateFontPhysicalDimensions({
        country: 'US',
        packageAreaCm2: 120,
        pixelHeight: 14, // 14px @ 300 DPI = 1.19 mm (< 1.6 mm)
        dpi: 300,
        isNetWeightText: true,
      });

      expect(result.isCompliant).toBe(false);
      expect(result.redFlags.some((f) => f.code === 'US-CRIT-ARTWORK-NET-WEIGHT-FONT-TOO-SMALL')).toBe(true);
    });

    it('인쇄 해상도가 300 DPI 미만이면 저해상도 경고를 발행해야 함', () => {
      const result = validateFontPhysicalDimensions({
        country: 'US',
        packageAreaCm2: 120,
        pixelHeight: 25,
        dpi: 150, // 저해상도
      });

      expect(result.redFlags.some((f) => f.code === 'COMMON-WARN-ARTWORK-LOW-DPI')).toBe(true);
    });
  });

  describe('4. Contrast Ratio Evaluation (calculateContrastRatio)', () => {
    it('검정 텍스트와 흰색 배경은 높은 대비율(약 21:1)을 산출해야 함', () => {
      const ratio = calculateContrastRatio([0, 0, 0], [255, 255, 255]);
      expect(ratio).toBeGreaterThan(15);
    });

    it('밝은 회색과 흰색 배경은 WCAG 기준(4.5:1) 미달이어야 함', () => {
      const ratio = calculateContrastRatio([200, 200, 200], [255, 255, 255]);
      expect(ratio).toBeLessThan(4.5);
    });
  });

  describe('5. Full Inspection Engine Runner (inspectArtwork)', () => {
    it('정상 시안 데이터 입력 시 종합 결과가 overallCompliant = true여야 함', () => {
      const report = inspectArtwork({
        artworkText: `
          Korean Style Pork & Leek Dumplings
          NET WT 37.03 OZ (1050g)
          INGREDIENTS: Pork, Wheat Flour, Leek.
          CONTAINS: WHEAT, SOYBEAN, PORK, SESAME.
          Nutrition Facts
          Servings Per Container about 10
        `,
        label: dummyUsLabel,
        packageAreaCm2: 120,
        samplePixelHeight: 20, // 1.69 mm
        dpi: 300,
        textColorRgb: [0, 0, 0],
        bgColorRgb: [255, 255, 255],
      });

      expect(report.overallCompliant).toBe(true);
      expect(report.totalCriticalErrors).toBe(0);
      expect(report.fontDimension.isCompliant).toBe(true);
      expect(report.isContrastCompliant).toBe(true);
    });

    it('오타 및 결함 시안 입력 시 critical 에러가 집계되어 overallCompliant = false여야 함', () => {
      const report = inspectArtwork({
        artworkText: 'Just Dumplings',
        label: dummyUsLabel,
        packageAreaCm2: 120,
        samplePixelHeight: 8, // 0.68 mm
        dpi: 150,
      });

      expect(report.overallCompliant).toBe(false);
      expect(report.totalCriticalErrors).toBeGreaterThan(0);
      expect(report.allRedFlags.length).toBeGreaterThanOrEqual(2);
    });
  });
});
