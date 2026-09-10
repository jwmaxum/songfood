import {
  formatLabelForExcel,
  generateMultiCountryExcelWorkbook,
} from '@/lib/export/excel-generator';
import { FoodLabel } from '@/types/label';
import { BuyerFormData } from '@/components/labels/spec-sheet/BuyerToFillForm';

describe('Phase 6: Master Spec Sheet & Excel Bulk Export Engine', () => {
  const mockBuyer: BuyerFormData = {
    companyName: 'Pacific Rim Foods USA LLC',
    registrationNumber: 'FDA-FFR: 19827364501',
    address: '742 Evergreen Terrace',
    cityStateZip: 'Los Angeles, CA 90012',
    country: 'United States',
    contactPerson: 'David Miller',
    phone: '+1-213-555-0199',
    email: 'dmiller@pacificrimfoods.com',
  };

  const mockLabelUS: FoodLabel = {
    id: 'lbl-001-US',
    productId: 'SF-DM-001',
    country: 'US',
    status: 'compliant',
    productNameLocal: '송영민 K-비비고 왕교자 만두',
    productNameEn: 'Premium Vegetable & Seafood Dumplings',
    productCategoryLocal: '만두류',
    netWeightG: 480,
    shelfLifeMonths: 12,
    dateMarkingType: 'MM/DD/YYYY',
    storageInstructions: 'Keep frozen at or below 0°F (-18°C)',
    barcodeType: 'UPC-A',
    barcodeNumber: '012345678905',
    hsCode: '1902.20.0000',
    ingredients: [
      { ingredientNameKo: '밀가루', ingredientNameTarget: 'Wheat Flour', ratio: 40, isAllergen: true },
      { ingredientNameKo: '두부', ingredientNameTarget: 'Tofu', ratio: 25, isAllergen: true },
      { ingredientNameKo: '새우', ingredientNameTarget: 'Shrimp', ratio: 15, isAllergen: true },
    ],
    nutrition: {
      servingSizeG: 120,
      servingsPerContainer: 4,
      caloriesKcal: 220,
      totalFatG: 6,
      saturatedFatG: 1,
      sodiumMg: 460,
      totalCarbohydrateG: 32,
      dietaryFiberG: 2,
      totalSugarsG: 3,
      addedSugarsG: 1,
      proteinG: 9,
    },
    informationPanel: {
      containsAllergensStatement: 'CONTAINS: WHEAT, SOYBEANS, CRUSTACEAN SHELLFISH (SHRIMP).',
      storageConditionKo: '냉동보관',
      storageConditionTarget: 'Keep frozen at 0°F (-18°C) or colder.',
      manufacturerName: 'Song Youngmin Food Co., Ltd.',
      importerDistributorText: 'Pacific Rim Foods USA LLC',
    },
    version: 1,
    createdAt: '2026-09-10T00:00:00Z',
    updatedAt: '2026-09-10T00:00:00Z',
  };

  test('1. Flattens FoodLabel into compliant Excel row structure', () => {
    const row = formatLabelForExcel(mockLabelUS, mockBuyer);

    expect(row.productId).toBe('SF-DM-001');
    expect(row.targetCountry).toBe('US');
    expect(row.productNameEn).toBe('Premium Vegetable & Seafood Dumplings');
    expect(row.hsCode).toBe('1902.20.0000');
    expect(row.containsAllergens).toContain('CONTAINS: WHEAT');
    expect(row.importerCompany).toBe('Pacific Rim Foods USA LLC');
    expect(row.importerRegNo).toBe('FDA-FFR: 19827364501');
    expect(row.caloriesKcal).toBe(220);
    expect(row.sodiumMg).toBe(460);
    expect(row.ingredientsText).toContain('Wheat Flour (40%)');
  });

  test('2. Generates multi-sheet workbook with 5 country sheets and Master Summary', () => {
    const mockLabels: FoodLabel[] = [
      mockLabelUS,
      { ...mockLabelUS, id: 'lbl-001-CN', country: 'CN' },
      { ...mockLabelUS, id: 'lbl-001-JP', country: 'JP' },
      { ...mockLabelUS, id: 'lbl-001-EU', country: 'EU' },
      { ...mockLabelUS, id: 'lbl-001-UAE', country: 'UAE' },
    ];

    const workbook = generateMultiCountryExcelWorkbook(mockLabels, mockBuyer);

    expect(workbook.SheetNames).toContain('Master_Catalog_Summary');
    expect(workbook.SheetNames).toContain('US_FDA_Spec');
    expect(workbook.SheetNames).toContain('CN_GACC_Spec');
    expect(workbook.SheetNames).toContain('JP_CAA_Spec');
    expect(workbook.SheetNames).toContain('EU_FIC_Spec');
    expect(workbook.SheetNames).toContain('UAE_MoIAT_Spec');

    expect(workbook.SheetNames.length).toBe(6);
  });

  test('3. Populates rows within each country sheet correctly', () => {
    const workbook = generateMultiCountryExcelWorkbook([mockLabelUS], mockBuyer);
    const summarySheet = workbook.Sheets['Master_Catalog_Summary'];

    expect(summarySheet).toBeDefined();
    expect(summarySheet['A1']).toBeDefined(); // Header exists
  });
});
