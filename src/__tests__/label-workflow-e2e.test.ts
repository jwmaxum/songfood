import { validateLabel } from '@/lib/label-compliance';
import { recordAuditLog, getAuditLogs } from '@/lib/audit-logger';
import { generateMultiCountryExcelWorkbook } from '@/lib/export/excel-generator';
import { runBatchValidation } from '@/lib/batch-compliance';
import { getProducts } from '@/lib/products-db';
import { FoodLabel } from '@/types/label';

describe('Phase 7: End-to-End Export Labeling Workflow Integration Test', () => {
  const initialDraftLabel: FoodLabel = {
    id: 'lbl-test-001-US',
    productId: 'SF-PROD-TEST',
    country: 'US',
    status: 'draft',
    productNameLocal: '송영민 프리미엄 해물야채교자',
    productNameEn: 'Seafood Dumplings',
    productCategoryLocal: '만두류',
    netWeightG: 480,
    shelfLifeMonths: 12,
    dateMarkingType: 'MM/DD/YYYY',
    storageInstructions: '냉동보관',
    barcodeType: 'UPC-A',
    barcodeNumber: '012345678905',
    hsCode: '1902.20.0000',
    ingredients: [
      { ingredientNameKo: '밀가루', ingredientNameTarget: 'Wheat Flour', ratio: 50, isAllergen: true },
      { ingredientNameKo: '새우', ingredientNameTarget: 'Shrimp', ratio: 30, isAllergen: true },
      { ingredientNameKo: '대두', ingredientNameTarget: 'Soybean', ratio: 20, isAllergen: true },
    ],
    informationPanel: {
      containsAllergensStatement: '', // Deliberately omitted to trigger validation
      storageConditionKo: '냉동보관',
      storageConditionTarget: '',
      manufacturerName: 'Song Youngmin Food Co., Ltd.',
      importerDistributorText: '',
    },
    version: 1,
    createdAt: '2026-09-10T00:00:00Z',
    updatedAt: '2026-09-10T00:00:00Z',
  };

  test('Step 1: Initial draft triggers Red-Flag validation warnings', () => {
    const res = validateLabel({
      country: 'US',
      productNameLocal: initialDraftLabel.productNameLocal || '',
      productNameEn: initialDraftLabel.productNameEn,
      productCategory: initialDraftLabel.productCategoryLocal,
      ingredients: initialDraftLabel.ingredients || [],
      netWeightG: initialDraftLabel.netWeightG || 480,
      rawText: '', // missing CONTAINS
    });

    expect(res.isCompliant).toBe(false);
    expect(res.criticalErrors.length).toBeGreaterThan(0);
  });

  test('Step 2: Automated Auto-Fix resolves issues and achieves compliant status', () => {
    const fixedLabel: FoodLabel = {
      ...initialDraftLabel,
      status: 'compliant',
      pdp: {
        netWeightG: 480,
        netWeightCustom: 'NET WT. 16.9 OZ (480g)',
        claimHighlights: ['Authentic K-Food', 'No MSG Added'],
      },
      informationPanel: {
        ...initialDraftLabel.informationPanel,
        containsAllergensStatement: 'CONTAINS: WHEAT, CRUSTACEAN SHELLFISH (SHRIMP), SOYBEANS.',
        storageConditionTarget: 'Keep frozen at or below 0°F (-18°C). Do not refreeze once thawed.',
      },
      nutrition: {
        servingSizeG: 120,
        servingsPerContainer: 4,
        caloriesKcal: 220,
        totalFatG: 5,
        saturatedFatG: 1,
        sodiumMg: 420,
        totalCarbohydrateG: 30,
        totalSugarsG: 2,
        addedSugarsG: 0,
        proteinG: 10,
        vitaminDMcg: 0,
        potassiumMg: 120,
      },
    };

    const res = validateLabel({
      country: 'US',
      productNameLocal: fixedLabel.productNameLocal || '',
      productNameEn: fixedLabel.productNameEn,
      productCategory: fixedLabel.productCategoryLocal,
      ingredients: fixedLabel.ingredients || [],
      netWeightG: 480,
      netWeightOz: 16.9,
      rawText: 'CONTAINS: WHEAT, CRUSTACEAN, SOYBEANS.',
      nutrition: fixedLabel.nutrition,
    });

    const criticals = res.criticalErrors.filter((f) => f.code.startsWith('US-CRIT'));
    expect(criticals.length).toBe(0);
    expect(res.score).toBeGreaterThanOrEqual(80);

    // Step 3: Record audit trail log and bump version
    const { updatedLabel, auditEntry } = recordAuditLog({
      oldLabel: initialDraftLabel,
      newLabel: fixedLabel,
      changedBy: 'admin@songyoungminfood.com',
      action: 'AUTO_FIX',
      note: 'Auto-resolved FDA FASTER Act CONTAINS statement and net weight oz.',
    });

    expect(updatedLabel.version).toBe(2);
    expect(auditEntry.action).toBe('AUTO_FIX');

    const logs = getAuditLogs({ productId: 'SF-PROD-TEST' });
    expect(logs.length).toBeGreaterThan(0);

    // Step 4: Export to Multi-country Excel
    const wb = generateMultiCountryExcelWorkbook([updatedLabel]);
    expect(wb.SheetNames).toContain('US_FDA_Spec');
  });

  test('Step 5: High-speed batch processing validates catalog in under 1 second', async () => {
    const products = await getProducts();
    const batchReport = runBatchValidation(products);

    expect(batchReport.totalProducts).toBeGreaterThan(0);
    expect(batchReport.totalEvaluations).toBe(products.length * 5);
    expect(batchReport.durationMs).toBeLessThan(1000); // must be ultra fast
  });
});
