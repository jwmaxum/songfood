import * as XLSX from 'xlsx';
import { FoodLabel, TargetCountry } from '@/types/label';
import { BuyerFormData } from '@/components/labels/spec-sheet/BuyerToFillForm';

export interface LabelExportRow {
  productId: string;
  targetCountry: TargetCountry;
  productNameKo: string;
  productNameEn: string;
  productNameTarget: string;
  hsCode: string;
  netWeight: string;
  ingredientsText: string;
  containsAllergens: string;
  storageCondition: string;
  shelfLifeMonths: number | '';
  barcodeType: string;
  barcodeNumber: string;
  caloriesKcal: number | '';
  sodiumMg: number | '';
  proteinG: number | '';
  totalFatG: number | '';
  totalCarbG: number | '';
  importerCompany: string;
  importerRegNo: string;
  complianceStatus: string;
}

/**
 * Map FoodLabel to flattened row object for Excel export
 */
export function formatLabelForExcel(
  label: FoodLabel,
  buyerData?: BuyerFormData
): LabelExportRow {
  const ingredientsStr = label.ingredients
    ? label.ingredients
        .map((ing) => `${ing.ingredientNameTarget || ing.ingredientNameKo} (${ing.ratio || 0}%)`)
        .join(', ')
    : '';

  return {
    productId: label.productId || '',
    targetCountry: (label.country || 'US') as TargetCountry,
    productNameKo: label.productNameLocal || label.header?.productNameKo || '',
    productNameEn: label.productNameEn || label.header?.productNameEn || '',
    productNameTarget: label.header?.productNameTarget || label.productNameLocal || '',
    hsCode: label.hsCode || label.header?.hsCode || '',
    netWeight: label.pdp?.netWeightCustom || (label.netWeightG ? String(label.netWeightG)+'g' : ''),
    ingredientsText: ingredientsStr,
    containsAllergens: label.informationPanel?.containsAllergensStatement || '',
    storageCondition: label.informationPanel?.storageConditionTarget || label.storageInstructions || '',
    shelfLifeMonths: label.shelfLifeMonths ?? '',
    barcodeType: label.barcodeMarking?.barcodeType || label.barcodeType || '',
    barcodeNumber: label.barcodeMarking?.barcodeNumber || label.barcodeNumber || '',
    caloriesKcal: label.nutrition?.caloriesKcal ?? '',
    sodiumMg: label.nutrition?.sodiumMg ?? '',
    proteinG: label.nutrition?.proteinG ?? '',
    totalFatG: label.nutrition?.totalFatG ?? '',
    totalCarbG: label.nutrition?.totalCarbohydrateG ?? '',
    importerCompany: buyerData?.companyName || label.importerInfo?.name || '',
    importerRegNo: buyerData?.registrationNumber || '',
    complianceStatus: label.status || 'draft',
  };
}

/**
 * Generate Excel workbook with dedicated sheets for US, CN, JP, EU, UAE + Summary
 */
export function generateMultiCountryExcelWorkbook(
  labels: FoodLabel[],
  buyerData?: BuyerFormData
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // 1. Master Summary Sheet
  const summaryRows = labels.map((l) => formatLabelForExcel(l, buyerData));
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Master_Catalog_Summary');

  // 2. Region-specific sheets
  const countries: TargetCountry[] = ['US', 'CN', 'JP', 'EU', 'UAE'];
  const sheetNames: Record<TargetCountry, string> = {
    US: 'US_FDA_Spec',
    CN: 'CN_GACC_Spec',
    JP: 'JP_CAA_Spec',
    EU: 'EU_FIC_Spec',
    UAE: 'UAE_MoIAT_Spec',
  };

  for (const c of countries) {
    const countryLabels = labels.filter((l) => l.country === c);
    const countryRows = countryLabels.map((l) => formatLabelForExcel(l, buyerData));
    const sheet = XLSX.utils.json_to_sheet(
      countryRows
    );
    XLSX.utils.book_append_sheet(wb, sheet, sheetNames[c]);
  }

  return wb;
}

/**
 * Trigger client-side download of Excel workbook
 */
export function downloadExcelFile(
  labels: FoodLabel[],
  filename = 'SongYoungminFood_Export_Label_Specs.xlsx',
  buyerData?: BuyerFormData
): void {
  const wb = generateMultiCountryExcelWorkbook(labels, buyerData);
  XLSX.writeFile(wb, filename);
}
