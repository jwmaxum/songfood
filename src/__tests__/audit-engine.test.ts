import {
  computeLabelDiff,
  generateSignOffHash,
  createAuditEntry,
} from '@/lib/label-compliance/engines/audit-diff-engine';
import {
  calculateDaysRemaining,
  getAlertStatus,
  matchAffectedProducts,
  getActiveRegulatoryAlerts,
  REGULATORY_AMENDMENTS,
} from '@/lib/label-compliance/engines/regulatory-alert-engine';
import {
  assessRefusalRisk,
  evaluateAllLabelsRisk,
} from '@/lib/label-compliance/engines/refusal-risk-engine';
import { FoodLabel } from '@/types/label';

describe('Phase 12: QA/RA Audit Trail, Regulatory Alert, and Customs Refusal Risk Engine', () => {
  const dummyLabel: FoodLabel = {
    id: 'lbl-test-01',
    productId: 'prod-dumpling',
    country: 'US',
    productNameEn: 'K-Bibigo Style Pork Dumplings',
    productNameLocal: 'K-Bibigo Style Pork Dumplings',
    netWeightG: 500,
    netWeightOz: 17.6,
    productCategoryLocal: 'Frozen Dumplings',
    status: 'compliant',
    version: 1,
    nutrition: {
      servingSizeG: 100,
      caloriesKcal: 220,
      totalFatG: 9,
      saturatedFatG: 3,
      transFatG: 0,
      cholesterolMg: 25,
      sodiumMg: 520,
      totalCarbohydrateG: 24,
      dietaryFiberG: 2,
      totalSugarsG: 3,
      addedSugarsG: 1,
      proteinG: 10,
    },
    ingredients: [
      { ingredientNameKo: '돼지고기', ingredientNameTarget: 'Pork', ratio: 22.5, isAllergen: true },
      { ingredientNameKo: '소맥분', ingredientNameTarget: 'Wheat Flour', ratio: 30.0, isAllergen: true },
      { ingredientNameKo: '부추', ingredientNameTarget: 'Leek', ratio: 15.0, isAllergen: false },
    ],
    header: {
      productNameKo: '고기만두',
      productNameEn: 'Pork Dumpling',
      legalProductType: '냉동만두 (가열하여 섭취하는 냉동식품)',
    },
    pdp: {
      claimHighlights: ['No MSG Added', 'Rich Protein'],
      certifications: ['HACCP'],
    },
    informationPanel: {
      containsAllergensStatement: 'CONTAINS: WHEAT, PORK',
    },
    barcodeNumber: '8801007052946',
  };

  describe('1. QA/RA Audit Trail & Version Diff Engine', () => {
    it('should identify newly created version diff when no previous version exists', () => {
      const diffs = computeLabelDiff(null, dummyLabel);
      expect(diffs.length).toBe(1);
      expect(diffs[0].changeType).toBe('added');
      expect(diffs[0].label).toContain('Initial Creation');
    });

    it('should detect field-level changes in nutrition, identity statement, and status', () => {
      const nextVersion: FoodLabel = {
        ...dummyLabel,
        version: 2,
        productNameEn: 'K-Bibigo Style Low-Sodium Pork Dumplings',
        nutrition: {
          ...dummyLabel.nutrition!,
          sodiumMg: 380, // Reduced from 520
          addedSugarsG: 0, // Reduced from 1
        },
        claimsBadges: ['Low-Sodium Heart-Healthy'],
      };

      const diffs = computeLabelDiff(dummyLabel, nextVersion);

      const sodiumDiff = diffs.find((d) => d.path === 'nutrition.sodiumMg');
      expect(sodiumDiff).toBeDefined();
      expect(sodiumDiff?.oldValue).toBe(520);
      expect(sodiumDiff?.newValue).toBe(380);
      expect(sodiumDiff?.changeType).toBe('modified');

      const nameDiff = diffs.find((d) => d.path === 'header.productName');
      expect(nameDiff).toBeDefined();
      expect(nameDiff?.newValue).toContain('Low-Sodium');

      const claimsDiff = diffs.find((d) => d.path === 'pdp.claimsBadges');
      expect(claimsDiff).toBeDefined();
    });

    it('should generate digital signature hash for approved QA sign-off', () => {
      const hash = generateSignOffHash('entry-101', 'qa_director', '2026-09-11T10:00:00Z');
      expect(hash).toMatch(/^0xQA_[0-9A-F]+_SIGN$/);
    });

    it('should construct a complete audit entry with QA approval status and signature', () => {
      const entry = createAuditEntry({
        productId: dummyLabel.productId,
        version: '1.1.0',
        country: dummyLabel.country,
        authorId: 'qa_user_01',
        authorName: '이수석 연구원',
        department: '품질보증본부',
        reason: '미국 바이어 저염 규격 준수',
        prevLabel: dummyLabel,
        currentLabel: {
          ...dummyLabel,
          nutrition: { ...dummyLabel.nutrition!, sodiumMg: 400 },
        },
        signOffStatus: 'approved',
        signedBy: '김상무 (QA Head)',
        comments: '나트륨 감축 규격 승인 완료',
      });

      expect(entry.id).toBeDefined();
      expect(entry.signOff.status).toBe('approved');
      expect(entry.signOff.signedBy).toBe('김상무 (QA Head)');
      expect(entry.signOff.signatureHash).toBeDefined();
      expect(entry.diffs.some((d) => d.path === 'nutrition.sodiumMg')).toBe(true);
    });
  });

  describe('2. Global Regulatory Amendments & D-Day Alert Engine', () => {
    it('should correctly calculate D-Day remaining and status', () => {
      // Future date
      const daysFuture = calculateDaysRemaining('2026-10-11', '2026-09-11');
      expect(daysFuture).toBe(30);
      expect(getAlertStatus(daysFuture)).toBe('D_30');

      // 80 days
      const days80 = calculateDaysRemaining('2026-11-30', '2026-09-11');
      expect(getAlertStatus(days80)).toBe('D_90');

      // Past date (already in force)
      const daysPast = calculateDaysRemaining('2025-01-01', '2026-09-11');
      expect(daysPast).toBeLessThan(0);
      expect(getAlertStatus(daysPast)).toBe('IN_FORCE');
    });

    it('should match affected products for China GB 7718-2025 zero-additive claims', () => {
      const cnAmendment = REGULATORY_AMENDMENTS.find((a) => a.id === 'CN-GB7718-2025')!;

      const labelWithZeroAdd: FoodLabel = {
        ...dummyLabel,
        country: 'CN',
        claimsBadges: ['0添加'],
        productNameLocal: '전통 비법 零添加 만두',
      };

      const labelClean: FoodLabel = {
        ...dummyLabel,
        country: 'CN',
        claimsBadges: ['풍부한 단백질'],
        productNameLocal: '전통 비법 만두',
      };

      const affected = matchAffectedProducts(cnAmendment, [labelWithZeroAdd, labelClean]);
      expect(affected).toContain('prod-dumpling');
    });

    it('should return active regulatory alerts sorted by D-Day remaining', () => {
      const alerts = getActiveRegulatoryAlerts([dummyLabel], '2026-09-11');
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].amendment.regulationName).toBeDefined();
      expect(alerts[0].daysRemaining).toBeLessThanOrEqual(alerts[alerts.length - 1].daysRemaining);
    });
  });

  describe('3. Customs Refusal Risk Prediction Engine', () => {
    it('should assign high risk score and CRITICAL/HIGH level for pork meat in US export', () => {
      // dummyLabel has pork 22.5% going to US
      const assessment = assessRefusalRisk(dummyLabel);
      expect(assessment.totalRiskScore).toBeGreaterThanOrEqual(45);
      expect(['HIGH', 'CRITICAL']).toContain(assessment.riskLevel);
      expect(assessment.riskDrivers.some((d) => d.code === 'US-RISK-USDA-MEAT')).toBe(true);
      expect(assessment.clearanceProbability).toBeLessThanOrEqual(55);
    });

    it('should flag missing GACC registration number for China export', () => {
      const cnLabel: FoodLabel = {
        ...dummyLabel,
        country: 'CN',
        registrationNumbers: {
          gaccCode: '', // Missing
        },
      };

      const assessment = assessRefusalRisk(cnLabel);
      expect(assessment.riskDrivers.some((d) => d.code === 'CN-RISK-GACC-MISSING')).toBe(true);
      expect(assessment.totalRiskScore).toBeGreaterThanOrEqual(40);
    });

    it('should detect EU banned additive E171 (Titanium Dioxide)', () => {
      const euLabel: FoodLabel = {
        ...dummyLabel,
        country: 'EU',
        ingredients: [
          ...dummyLabel.ingredients!,
          {
            ingredientNameKo: '이산화티타늄',
            ingredientNameTarget: 'Titanium Dioxide',
            insOrENumber: 'E171',
            ratio: 0.1,
            isAllergen: false,
          },
        ],
      };

      const assessment = assessRefusalRisk(euLabel);
      expect(assessment.riskDrivers.some((d) => d.code === 'EU-RISK-BANNED-E171')).toBe(true);
      expect(assessment.totalRiskScore).toBeGreaterThanOrEqual(55);
      expect(assessment.riskLevel).toBe('HIGH');
    });

    it('should batch evaluate all labels risk cleanly', () => {
      const results = evaluateAllLabelsRisk([dummyLabel]);
      expect(results.length).toBe(1);
      expect(results[0].productId).toBe('prod-dumpling');
      expect(results[0].summary).toBeDefined();
    });
  });
});
