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
        return data as FoodLabel[];
      }
    } catch (err) {
      console.warn('[labels-db] Supabase query failed, falling back to local JSON:', err);
    }
  }

  // Fallback: Local JSON
  const localLabels = readLocalLabels();
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
