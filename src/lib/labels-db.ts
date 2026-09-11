import fs from 'fs';
import path from 'path';
import { FoodLabel, ExportCountry, LabelSummaryItem } from '@/types/label';
import { supabaseAdmin, isSupabaseConfigured } from './supabase';
import { getProducts } from './products-db';

const LABELS_DATA_PATH = path.join(process.cwd(), 'data', 'food-labels.json');

/**
 * 로컬 JSON 파일에서 라벨 데이터 읽기
 */
function readLocalLabels(): FoodLabel[] {
  try {
    if (fs.existsSync(LABELS_DATA_PATH)) {
      const data = fs.readFileSync(LABELS_DATA_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn('[labels-db] Failed to read local food-labels.json, returning empty array:', err);
  }
  return [];
}

/**
 * 로컬 JSON 파일에 라벨 데이터 쓰기
 */
function writeLocalLabels(labels: FoodLabel[]): void {
  try {
    const dir = path.dirname(LABELS_DATA_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LABELS_DATA_PATH, JSON.stringify(labels, null, 2), 'utf-8');
  } catch (err) {
    console.error('[labels-db] Failed to write local food-labels.json:', err);
  }
}

/**
 * Supabase DB의 snake_case Row를 camelCase FoodLabel로 변환
 */
export function mapRowToFoodLabel(row: any): FoodLabel {
  if (!row) return row;
  // 이미 camelCase인 경우 (로컬 JSON fallback 등)
  if (row.productId && !row.product_id) return row as FoodLabel;

  const nutritionRow = Array.isArray(row.nutrition) ? row.nutrition[0] : row.nutrition;
  const complianceRow = Array.isArray(row.compliance) ? row.compliance[0] : row.compliance;

  const ingredients = (row.ingredients || []).map((ing: any) => ({
    id: ing.id,
    labelId: ing.label_id || ing.labelId,
    ingredientNameKo: ing.ingredient_name_ko || ing.ingredientNameKo,
    ingredientNameTarget: ing.ingredient_name_target || ing.ingredientNameTarget,
    ratio: Number(ing.ratio ?? 0),
    subIngredients: ing.sub_ingredients || ing.subIngredients,
    insOrENumber: ing.ins_or_e_number || ing.insOrENumber,
    isAllergen: Boolean(ing.is_allergen ?? ing.isAllergen),
    allergenCategory: ing.allergen_category || ing.allergenCategory,
    allergenOrigin: ing.allergen_origin || ing.allergenOrigin,
    isHighlyRefinedOil: Boolean(ing.is_highly_refined_oil ?? ing.isHighlyRefinedOil),
    displayOrder: ing.display_order ?? ing.displayOrder ?? 0,
  }));

  const nutrition = nutritionRow ? {
    id: nutritionRow.id,
    labelId: nutritionRow.label_id || nutritionRow.labelId,
    servingSizeG: Number(nutritionRow.serving_size_g ?? nutritionRow.servingSizeG ?? 100),
    servingSizeUnit: nutritionRow.serving_size_unit || nutritionRow.servingSizeUnit || 'g',
    servingSizeHousehold: nutritionRow.serving_size_household || nutritionRow.servingSizeHousehold,
    servingsPerContainer: Number(nutritionRow.servings_per_container ?? nutritionRow.servingsPerContainer ?? 1),
    isDualColumn: Boolean(nutritionRow.is_dual_column ?? nutritionRow.isDualColumn),
    caloriesKcal: Number(nutritionRow.calories_kcal ?? nutritionRow.caloriesKcal ?? 0),
    caloriesKj: nutritionRow.calories_kj ?? nutritionRow.caloriesKj,
    totalFatG: Number(nutritionRow.total_fat_g ?? nutritionRow.totalFatG ?? 0),
    saturatedFatG: Number(nutritionRow.saturated_fat_g ?? nutritionRow.saturatedFatG ?? 0),
    transFatG: Number(nutritionRow.trans_fat_g ?? nutritionRow.transFatG ?? 0),
    cholesterolMg: Number(nutritionRow.cholesterol_mg ?? nutritionRow.cholesterolMg ?? 0),
    sodiumMg: Number(nutritionRow.sodium_mg ?? nutritionRow.sodiumMg ?? 0),
    saltEquivalentG: Number(nutritionRow.salt_equivalent_g ?? nutritionRow.saltEquivalentG ?? 0),
    totalCarbohydrateG: Number(nutritionRow.total_carbohydrate_g ?? nutritionRow.totalCarbohydrateG ?? 0),
    dietaryFiberG: Number(nutritionRow.dietary_fiber_g ?? nutritionRow.dietaryFiberG ?? 0),
    totalSugarsG: Number(nutritionRow.total_sugars_g ?? nutritionRow.totalSugarsG ?? 0),
    addedSugarsG: Number(nutritionRow.added_sugars_g ?? nutritionRow.addedSugarsG ?? 0),
    proteinG: Number(nutritionRow.protein_g ?? nutritionRow.proteinG ?? 0),
    vitaminDMcg: Number(nutritionRow.vitamin_d_mcg ?? nutritionRow.vitaminDMcg ?? 0),
    calciumMg: Number(nutritionRow.calcium_mg ?? nutritionRow.calciumMg ?? 0),
    ironMg: Number(nutritionRow.iron_mg ?? nutritionRow.ironMg ?? 0),
    potassiumMg: Number(nutritionRow.potassium_mg ?? nutritionRow.potassiumMg ?? 0),
    nrvPercentages: nutritionRow.nrv_percentages || nutritionRow.nrvPercentages,
    trafficLightRatings: nutritionRow.traffic_light_ratings || nutritionRow.trafficLightRatings,
  } : undefined;

  const compliance = complianceRow ? {
    id: complianceRow.id,
    labelId: complianceRow.label_id || complianceRow.labelId,
    jurisdiction: complianceRow.jurisdiction,
    isCompliant: Boolean(complianceRow.is_compliant ?? complianceRow.isCompliant),
    score: Number(complianceRow.score ?? 100),
    criticalErrors: complianceRow.critical_errors || complianceRow.criticalErrors || [],
    warnings: complianceRow.warnings || complianceRow.warnings || [],
    checkedAt: complianceRow.checked_at || complianceRow.checkedAt,
  } : undefined;

  const netWeightG = Number(row.net_weight_g ?? row.netWeightG ?? 500);
  const netWeightOz = Number(row.net_weight_oz ?? row.netWeightOz ?? (netWeightG / 28.3495).toFixed(1));

  return {
    id: row.id,
    productId: row.product_id || row.productId,
    country: row.country,
    version: row.version ?? 1,
    status: row.status ?? 'compliant',
    hsCode: row.hs_code || row.hsCode,
    productNameLocal: row.product_name_local || row.productNameLocal,
    productNameEn: row.product_name_en || row.productNameEn,
    productCategoryLocal: row.product_category_local || row.productCategoryLocal,
    netWeightG,
    netWeightOz,
    packageAreaCm2: Number(row.package_area_cm2 ?? row.packageAreaCm2 ?? 120),
    isShelfStable: Boolean(row.is_shelf_stable ?? row.isShelfStable ?? true),
    claimsBadges: row.claims_badges || row.claimsBadges || [],
    servingSuggestion: row.serving_suggestion || row.servingSuggestion,
    storageInstructions: row.storage_instructions || row.storageInstructions || 'Keep in cool, dry place',
    cookingInstructions: row.cooking_instructions || row.cookingInstructions,
    manufacturerInfo: row.manufacturer_info || row.manufacturerInfo,
    importerInfo: row.importer_info || row.importerInfo,
    registrationNumbers: row.registration_numbers || row.registrationNumbers,
    alcoholPercentage: Number(row.alcohol_percentage ?? row.alcoholPercentage ?? 0),
    dateMarkingType: row.date_marking_type || row.dateMarkingType || 'YYYY/MM/DD',
    dateMarkingText: row.date_marking_text || row.dateMarkingText,
    shelfLifeMonths: Number(row.shelf_life_months ?? row.shelfLifeMonths ?? 12),
    barcodeType: row.barcode_type || row.barcodeType || 'EAN-13',
    barcodeNumber: row.barcode_number || row.barcodeNumber,
    packagingMaterial: row.packaging_material || row.packagingMaterial,
    recyclingSymbols: row.recycling_symbols || row.recyclingSymbols || [],
    header: {
      hsCode: row.hs_code || row.hsCode,
      productNameKo: row.product_name_en || row.productNameEn,
      productNameEn: row.product_name_en || row.productNameEn,
      productNameTarget: row.product_name_local || row.productNameLocal,
      legalProductType: row.product_category_local || row.productCategoryLocal,
    },
    pdp: {
      netWeightG,
      claimHighlights: row.claims_badges || row.claimsBadges || [],
      certifications: row.claims_badges || row.claimsBadges || [],
    },
    informationPanel: {
      storageConditionKo: row.storage_instructions || row.storageInstructions,
      storageConditionTarget: row.storage_instructions || row.storageInstructions,
      manufacturerName: row.manufacturer_info?.name || row.manufacturerInfo?.name,
    },
    datingLot: {
      shelfLifeDays: (row.shelf_life_months ?? row.shelfLifeMonths ?? 12) * 30,
    },
    barcodeMarking: {
      barcodeType: row.barcode_type || row.barcodeType,
      barcodeNumber: row.barcode_number || row.barcodeNumber,
      recyclingMarks: row.recycling_symbols || row.recyclingSymbols,
    },
    ingredients,
    nutrition,
    compliance,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
  };
}

/**
 * 모든 식품 라벨 목록 조회 (국가 필터 선택 가능)
 */
export async function getAllFoodLabels(country?: ExportCountry): Promise<FoodLabel[]> {
  if (isSupabaseConfigured() && supabaseAdmin) {
    try {
      let query = supabaseAdmin
        .from('food_labels')
        .select(`
          *,
          ingredients:label_ingredients(*),
          nutrition:label_nutritions(*),
          compliance:label_compliance_logs(*)
        `);

      if (country) {
        query = query.eq('country', country);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map(mapRowToFoodLabel);
      }
    } catch (err) {
      console.warn('[labels-db] Supabase query failed, falling back to local JSON:', err);
    }
  }

  // Fallback: Local JSON
  const localLabels = readLocalLabels().map(mapRowToFoodLabel);
  if (country) {
    return localLabels.filter((l) => l.country === country);
  }
  return localLabels;
}

/**
 * 특정 라벨 상세 조회
 */
export async function getFoodLabelById(id: string): Promise<FoodLabel | null> {
  const allLabels = await getAllFoodLabels();
  return allLabels.find((l) => l.id === id) || null;
}

/**
 * 특정 상품 ID에 대한 5개국 라벨 목록 조회
 */
export async function getFoodLabelsByProductId(productId: string): Promise<FoodLabel[]> {
  const allLabels = await getAllFoodLabels();
  return allLabels.filter((l) => l.productId === productId);
}

/**
 * 라벨 저장 또는 업데이트
 */
export async function saveFoodLabel(label: FoodLabel): Promise<FoodLabel> {
  const now = new Date().toISOString();
  const labelToSave = {
    ...label,
    updatedAt: now,
  };

  if (isSupabaseConfigured() && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('food_labels')
        .upsert({
          id: labelToSave.id,
          product_id: labelToSave.productId,
          country: labelToSave.country,
          version: labelToSave.version,
          status: labelToSave.status,
          hs_code: labelToSave.hsCode,
          product_name_local: labelToSave.productNameLocal,
          product_name_en: labelToSave.productNameEn,
          product_category_local: labelToSave.productCategoryLocal,
          net_weight_g: labelToSave.netWeightG,
          net_weight_oz: labelToSave.netWeightOz,
          package_area_cm2: labelToSave.packageAreaCm2,
          is_shelf_stable: labelToSave.isShelfStable,
          claims_badges: labelToSave.claimsBadges,
          serving_suggestion: labelToSave.servingSuggestion,
          storage_instructions: labelToSave.storageInstructions,
          cooking_instructions: labelToSave.cookingInstructions,
          manufacturer_info: labelToSave.manufacturerInfo,
          importer_info: labelToSave.importerInfo,
          registration_numbers: labelToSave.registrationNumbers,
          alcohol_percentage: labelToSave.alcoholPercentage,
          date_marking_type: labelToSave.dateMarkingType,
          date_marking_text: labelToSave.dateMarkingText,
          shelf_life_months: labelToSave.shelfLifeMonths,
          barcode_type: labelToSave.barcodeType,
          barcode_number: labelToSave.barcodeNumber,
          packaging_material: labelToSave.packagingMaterial,
          recycling_symbols: labelToSave.recyclingSymbols,
          updated_at: now,
        })
        .select()
        .single();

      if (!error && data) {
        // 하위 테이블(nutritions, ingredients) 연동 생략 또는 병렬 업데이트
        return labelToSave;
      }
    } catch (err) {
      console.warn('[labels-db] Supabase upsert failed, saving to local JSON:', err);
    }
  }

  // Fallback: Local JSON 저장
  const localLabels = readLocalLabels();
  const index = localLabels.findIndex((l) => l.id === labelToSave.id);
  if (index >= 0) {
    localLabels[index] = labelToSave;
  } else {
    localLabels.push(labelToSave);
  }
  writeLocalLabels(localLabels);

  return labelToSave;
}

/**
 * 라벨 삭제
 */
export async function deleteFoodLabel(id: string): Promise<boolean> {
  if (isSupabaseConfigured() && supabaseAdmin) {
    try {
      const { error } = await supabaseAdmin.from('food_labels').delete().eq('id', id);
      if (!error) return true;
    } catch (err) {
      console.warn('[labels-db] Supabase delete failed, falling back to local JSON:', err);
    }
  }

  const localLabels = readLocalLabels();
  const filtered = localLabels.filter((l) => l.id !== id);
  if (filtered.length !== localLabels.length) {
    writeLocalLabels(filtered);
    return true;
  }
  return false;
}

/**
 * 300여 개 상품과 5대국 라벨 현황을 매핑한 요약 대시보드 리스트 생성
 */
export async function getProductLabelSummaries(): Promise<LabelSummaryItem[]> {
  const [products, labels] = await Promise.all([
    getProducts(),
    getAllFoodLabels(),
  ]);

  const countries: ExportCountry[] = ['US', 'CN', 'JP', 'EU', 'UAE'];

  return products.map((product) => {
    const productLabels = labels.filter((l) => l.productId === product.id);

    const countryLabelsMap = countries.reduce((acc, c) => {
      const found = productLabels.find((l) => l.country === c);
      if (found) {
        acc[c] = {
          labelId: found.id,
          status: found.status,
          score: found.compliance?.score ?? 100,
          hasCritical: (found.compliance?.criticalErrors?.length ?? 0) > 0,
        };
      } else {
        acc[c] = {
          status: 'draft',
          score: 0,
          hasCritical: false,
        };
      }
      return acc;
    }, {} as Record<ExportCountry, { labelId?: string; status: any; score: number; hasCritical: boolean }>);

    return {
      id: product.id,
      productId: product.id,
      productNameKo: product.name,
      productNameEn: product.name_en || product.name,
      productImage: product.image_url,
      category: product.category || product.collection,
      countryLabels: countryLabelsMap,
    };
  });
}
