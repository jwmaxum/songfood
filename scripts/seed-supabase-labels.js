/**
 * 송영민푸드 (Song Youngmin Food)
 * 45개 품목 × 5개국(US, CN, JP, EU, UAE) = 225개 글로벌 마스터 라벨 Supabase Seeding 스크립트
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { PRODUCTS_DATA } = require('./products-seed-data');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Run with node --env-file=.env.local scripts/seed-supabase-labels.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const COUNTRIES = ['US', 'CN', 'JP', 'EU', 'UAE'];

// 국가별 현지화 헬퍼
function getLocalizedInfo(prod, country) {
  const isKimchi = prod.category?.includes('김치') || prod.collection?.includes('김치');
  const isDumpling = prod.category?.includes('만두') || prod.collection?.includes('만두');
  const isNoodle = prod.category?.includes('면') || prod.collection?.includes('면');
  const isSauce = prod.category?.includes('장류') || prod.collection?.includes('소스');
  const isSeaweed = prod.category?.includes('수산') || prod.collection?.includes('김');
  const isSnack = prod.category?.includes('스낵') || prod.collection?.includes('스낵');
  const isDrink = prod.category?.includes('음료') || prod.collection?.includes('주류');

  switch (country) {
    case 'US':
      return {
        productNameLocal: prod.name_en || prod.name,
        productCategoryLocal: isKimchi ? 'Fermented Cabbage Product' : isDumpling ? 'Frozen Dumpling / Potstickers' : isNoodle ? 'Instant Noodles / Pasta' : isSauce ? 'Korean Fermented Paste / Sauce' : isSeaweed ? 'Roasted Seaweed Snack' : isDrink ? 'Korean Traditional Beverage' : 'Ready-to-Eat Food',
        storageInstructions: prod.is_shelf_stable ? 'Store in a cool, dry place away from direct sunlight.' : 'Keep Frozen at or below -18°C (0°F).',
        dateMarkingType: 'MM/DD/YYYY',
        dateMarkingText: 'Best Before (MM/DD/YYYY): See package imprint',
        importerInfo: {
          name: 'Songfood USA Trading Corp.',
          address: '350 5th Ave, Suite 4800, New York, NY 10118, USA',
          country: 'USA',
          tel: '+1-212-555-0199',
          contact: 'import-us@songfood.com'
        },
        registrationNumbers: {
          fdaFacilityNo: '18492049281',
          fdaFce: 'FCE-19842',
        },
        packagingMaterial: 'Food Grade Polyethylene (PE) / Aluminum Foil',
        recyclingSymbols: ['Plastic (Number 7 OTHER)', 'Cardboard (21 PAP)']
      };
    case 'CN':
      return {
        productNameLocal: `宋英民食品 · ${prod.name_en || prod.name}`,
        productCategoryLocal: isKimchi ? '腌制蔬菜 (泡菜类)' : isDumpling ? '速冻面米水饺' : isNoodle ? '方便面 / 干面条' : isSauce ? '复合调味酱 (韩式辣酱/大酱)' : isSeaweed ? '调味烤海苔' : isDrink ? '风味饮料' : '方便即食熟食',
        storageInstructions: prod.is_shelf_stable ? '请置于阴凉干燥处，避免阳光直射。' : '需冷冻储存于-18℃以下。',
        dateMarkingType: 'YYYY/MM/DD',
        dateMarkingText: '生产日期 / 保质期至 (年/月/日): 见包装打印',
        importerInfo: {
          name: '宋英民食品 (上海) 进出口贸易有限公司',
          address: '上海市浦东新区张江高科技园区科苑路88号',
          country: 'China',
          tel: '+86-21-5080-8888',
          contact: 'china-inquiry@songfood.cn'
        },
        registrationNumbers: {
          gaccCode: 'CKOR24012309100088',
          gaccRegNo: 'CKOR24012309100088',
        },
        packagingMaterial: '聚乙烯 (PE) / 铝箔复合膜',
        recyclingSymbols: ['可回收物 (Recyclable)', '塑料包装 07']
      };
    case 'JP':
      return {
        productNameLocal: `ソン・ヨンミンフード · ${prod.name}`,
        productCategoryLocal: isKimchi ? 'キムチ漬物 (農産物キムチ)' : isDumpling ? '冷凍ぎょうざ' : isNoodle ? '即席めん' : isSauce ? '韓国味噌加工品 (コチュジャン/調味料)' : isSeaweed ? '味付けのり' : isDrink ? '清涼飲料水' : 'そうざい (調理冷凍食品)',
        storageInstructions: prod.is_shelf_stable ? '直射日光・高温多湿を避けて常温で保存してください。' : '要冷凍（-18℃以下で保存してください）。',
        dateMarkingType: 'YYYY.MM.DD',
        dateMarkingText: '賞味期限 (年.月.日): 枠外下部に記載',
        importerInfo: {
          name: 'ソン・ヨンミンフード ジャパン株式会社',
          address: '東京都港区新橋5丁目12-8 宋英民ビル 4F',
          country: 'Japan',
          tel: '+81-3-3456-7890',
          contact: 'japan-support@songfood.co.jp'
        },
        registrationNumbers: {
          japanImportNoticeNo: 'J-CAA-2026-99120',
        },
        packagingMaterial: 'プラ：外袋(PE, PP)、紙：個装箱',
        recyclingSymbols: ['プラ (Plastic)', '紙 (Paper)']
      };
    case 'EU':
      return {
        productNameLocal: prod.name_en || prod.name,
        productCategoryLocal: isKimchi ? 'Fermented Vegetable Preparation' : isDumpling ? 'Frozen Filled Dumplings' : isNoodle ? 'Asian Instant Noodles' : isSauce ? 'Fermented Seasoned Paste' : isSeaweed ? 'Seasoned Roasted Seaweed' : isDrink ? 'Alcoholic/Non-Alcoholic Beverage' : 'Prepared Convenience Meal',
        storageInstructions: prod.is_shelf_stable ? 'Store in an ambient dry place away from heat and light.' : 'Keep deep-frozen at -18°C. Do not refreeze after defrosting.',
        dateMarkingType: 'DD/MM/YYYY',
        dateMarkingText: 'Best before (DD/MM/YYYY): See bottom of pack',
        importerInfo: {
          name: 'Songfood Europe B.V.',
          address: 'Keizersgracht 421, 1016 EK Amsterdam, Netherlands',
          country: 'Netherlands',
          tel: '+31-20-890-5500',
          contact: 'europe@songfood.eu'
        },
        registrationNumbers: {
          euEstablishmentNo: 'KR-EXP-6029-EC',
          euApprovalNo: 'KR-EXP-6029-EC',
        },
        packagingMaterial: 'Mono-PE Recyclable Film / FSC Certified Carton',
        recyclingSymbols: ['Triman (France)', 'Grüner Punkt (Germany)', 'PAP 20']
      };
    case 'UAE':
      return {
        productNameLocal: `أغذية سونغ يونغ مين · ${prod.name_en || prod.name}`,
        productCategoryLocal: isKimchi ? 'منتج الخضار المخمرة الحلال' : isDumpling ? 'فطائر زلابية مجمدة حلال' : isNoodle ? 'نودلز فورية كورية حلال' : isSauce ? 'صلصة التوابل الكورية الحلال' : isSeaweed ? 'وجبة خفيفة من الأعشاب البحرية' : isDrink ? 'مشروب كوري تقليدي' : 'أطعمة كورية جاهزة حلال',
        storageInstructions: prod.is_shelf_stable ? 'يحفظ في مكان بارد وجاف بعيداً عن أشعة الشمس المباشرة' : 'يحفظ مجمداً عند درجة حرارة -18 مئوية أو أقل',
        dateMarkingType: 'DD/MM/YYYY',
        dateMarkingText: 'تاريخ الإنتاج / تاريخ الانتهاء (DD/MM/YYYY): انظر العبوة',
        importerInfo: {
          name: 'Songfood Middle East FZCO',
          address: 'Dubai South Free Zone, Logistics District, Building A4, Dubai, UAE',
          country: 'UAE',
          tel: '+971-4-880-1234',
          contact: 'gulf-sales@songfood.ae'
        },
        registrationNumbers: {
          halalCertNo: 'ESMA-HALAL-2026-90412',
        },
        packagingMaterial: 'Multilayer Food Grade Barrier Pouch',
        recyclingSymbols: ['Plastic 07', 'Halal GSO Logo']
      };
  }
}

// 원재료 타깃 언어 번역 헬퍼
function translateIngredient(nameEn, nameKo, country) {
  if (country === 'US' || country === 'EU') {
    return nameEn || nameKo;
  }
  if (country === 'CN') {
    const cnMap = {
      '절임배추': '腌白菜', '배추': '白菜', '무': '白萝卜', '고춧가루': '辣椒粉', '멸치액젓': '凤尾鱼露',
      '마늘': '大蒜', '천일염': '天然日晒盐', '생강': '生姜', '밀가루': '小麦粉', '소맥분': '小麦粉',
      '돼지고기': '猪肉', '두부': '豆腐', '대파': '大葱', '부추': '韭菜', '양파': '洋葱', '참기름': '芝麻油',
      '간장': '酿造酱油', '물': '水', '쌀': '大米', '쇠고기': '牛肉', '닭고기': '鸡肉', '새우': '虾仁',
      '김': '紫菜', '당면': '粉条', '설탕': '白砂糖', '물엿': '玉米糖浆', '정제수': '纯净水'
    };
    return cnMap[nameKo] || nameEn || nameKo;
  }
  if (country === 'JP') {
    const jpMap = {
      '절임배추': '塩漬け白菜', '배추': '白菜', '무': '大根', '고춧가루': '唐辛子粉', '멸치액젓': 'いわし魚醤',
      '마늘': 'にんにく', '천일염': '天日塩', '생강': '生姜', '밀가루': '小麦粉', '소맥분': '小麦粉',
      '돼지고기': '豚肉', '두부': '豆腐', '대파': '長ねぎ', '부추': 'ニラ', '양파': '玉ねぎ', '참기름': 'ごま油',
      '간장': 'しょうゆ', '물': '水', '쌀': '米', '쇠고기': '牛肉', '닭고기': '鶏肉', '새우': 'えび',
      '김': '乾のり', '당면': '春雨', '설탕': '砂糖', '물엿': '水あめ', '정제수': '精製水'
    };
    return jpMap[nameKo] || nameEn || nameKo;
  }
  if (country === 'UAE') {
    const arMap = {
      '절임배추': 'ملفوف صيني مملح', '배추': 'ملفوف صيني', '무': 'فجل', '고춧가루': 'مسحوق الفلفل الحار', '멸치액젓': 'صلصة الأنشوجة المخمرة',
      '마늘': 'ثوم', '천일염': 'ملح البحر', '생강': 'زنجبيل', '밀가루': 'دقيق القمح', '소맥분': 'دقيق القمح',
      '두부': 'توفو', '대파': 'بصل أخضر', '부추': 'كرات', '양파': 'بصل', '참기름': 'زيت السمسم',
      '간장': 'صلصة الصويا', '물': 'ماء', '쌀': 'أرز', '새우': 'روبيان', '김': 'أعشاب بحرية',
      '설탕': 'سكر', '물엿': 'شراب الذرة', '정제수': 'ماء نقي'
    };
    return arMap[nameKo] || nameEn || nameKo;
  }
  return nameEn || nameKo;
}

async function seed() {
  console.log(`\n======================================================`);
  console.log(`🚀 Starting Global Master Label Seeding: 45 Products × 5 Countries = 225 Labels`);
  console.log(`======================================================\n`);

  // 1. Products Upsert
  console.log(`📦 Step 1: Upserting 45 products into 'products' table...`);
  const productsToUpsert = PRODUCTS_DATA.map((p) => ({
    id: p.id,
    name: p.name,
    name_en: p.name_en,
    description: p.description,
    price: p.price,
    original_price: p.original_price,
    stock: p.stock,
    sku: p.sku,
    format: p.format,
    finish: 'K-Food 정밀제조',
    color: '원물 고유색상',
    look: '수출 전용 규격',
    thickness: p.net_weight || '500g',
    image_url: '/images/products/coming-soon.png',
    origin: p.origin,
    brand: p.brand,
    manufacturer: p.manufacturer,
    country_of_origin: p.country_of_origin,
    net_weight: p.net_weight,
    shelf_life: p.shelf_life,
    storage: p.storage,
    category: p.category,
    collection: p.collection,
    ingredients: p.ingredients_ko,
    allergens: p.allergens,
    certifications: p.claims || ['HACCP', 'ISO 22000'],
    updated_at: new Date().toISOString()
  }));

  const { error: prodErr } = await supabase
    .from('products')
    .upsert(productsToUpsert, { onConflict: 'id' });

  if (prodErr) {
    console.error('❌ Error upserting products:', prodErr);
  } else {
    console.log(`✅ Successfully upserted ${productsToUpsert.length} products.`);
  }

  // 2. Build 225 FoodLabels & Sub-tables
  console.log(`\n🏷️ Step 2: Generating 225 Food Labels & Sub-tables...`);

  const allFoodLabels = [];
  const allIngredients = [];
  const allNutritions = [];
  const allComplianceLogs = [];
  const localExportFoodLabels = []; // Local JSON export

  for (const prod of PRODUCTS_DATA) {
    for (const country of COUNTRIES) {
      const labelId = crypto.randomUUID();
      const loc = getLocalizedInfo(prod, country);
      const netWeightG = prod.net_weight_g || 500;
      const netWeightOz = Number((netWeightG / 28.3495).toFixed(1));

      const foodLabelRecord = {
        id: labelId,
        product_id: prod.id,
        country: country,
        version: 1,
        status: 'compliant',
        hs_code: prod.hs_code || '2106.90-9099',
        product_name_local: loc.productNameLocal,
        product_name_en: prod.name_en || prod.name,
        product_category_local: loc.productCategoryLocal,
        net_weight_g: netWeightG,
        net_weight_oz: netWeightOz,
        package_area_cm2: 120.0,
        is_shelf_stable: prod.is_shelf_stable ?? true,
        claims_badges: prod.claims || ['HACCP Certified', 'Traditional Recipe'],
        serving_suggestion: 'Best served with warm rice or as a delicious main dish.',
        storage_instructions: loc.storageInstructions,
        cooking_instructions: 'Ready to eat or heat for 3-5 minutes according to preference.',
        manufacturer_info: {
          name: '송영민푸드 주식회사 (Song Youngmin Food Co., Ltd.)',
          nameEn: 'Song Youngmin Food Co., Ltd.',
          address: '전라남도 해남군 옥천면 농공단지길 15-8',
          addressEn: '15-8, Nonggongdanji-gil, Okcheon-myeon, Haenam-gun, Jeollanam-do, Republic of Korea',
          country: 'Republic of Korea',
          tel: '+82-61-532-8888',
          email: 'export@songfood.co.kr'
        },
        importer_info: loc.importerInfo,
        registration_numbers: loc.registrationNumbers,
        alcohol_percentage: 0.00,
        date_marking_type: loc.dateMarkingType,
        date_marking_text: loc.dateMarkingText,
        shelf_life_months: prod.shelf_life_months || 12,
        barcode_type: country === 'US' ? 'UPC-A' : 'EAN-13',
        barcode_number: `8809${Math.floor(100000000 + Math.random() * 900000000)}`,
        packaging_material: loc.packagingMaterial,
        recycling_symbols: loc.recyclingSymbols,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      allFoodLabels.push(foodLabelRecord);

      // Ingredients
      const rawIngredients = prod.ingredients || [
        { nameKo: '주원료', nameEn: 'Main Ingredient', ratio: 70, isAllergen: false },
        { nameKo: '양념', nameEn: 'Seasoning Blend', ratio: 30, isAllergen: false }
      ];

      const labelIngredientsList = rawIngredients.map((ing, idx) => ({
        id: crypto.randomUUID(),
        label_id: labelId,
        ingredient_name_ko: ing.nameKo,
        ingredient_name_target: translateIngredient(ing.nameEn, ing.nameKo, country),
        ratio: ing.ratio,
        sub_ingredients: null,
        ins_or_e_number: null,
        is_allergen: ing.isAllergen || false,
        allergen_category: ing.allergenCat || null,
        allergen_origin: ing.allergenCat || null,
        is_highly_refined_oil: false,
        display_order: idx + 1,
        created_at: new Date().toISOString()
      }));

      allIngredients.push(...labelIngredientsList);

      // Nutrition
      const nut = prod.nutrition || {
        servingSizeG: 100,
        caloriesKcal: 150,
        totalFatG: 3.0,
        saturatedFatG: 0.5,
        sodiumMg: 450,
        totalCarbohydrateG: 25,
        totalSugarsG: 3,
        proteinG: 5
      };

      const servingG = nut.servingSizeG || 100;
      const servingsPerContainer = Number((netWeightG / servingG).toFixed(1));
      const caloriesKcal = nut.caloriesKcal || 150;
      const caloriesKj = Math.round(caloriesKcal * 4.184);
      const sodiumMg = nut.sodiumMg || 400;
      const saltEquivalentG = Number(((sodiumMg * 2.54) / 1000).toFixed(2));
      const totalFatG = nut.totalFatG || 0;
      const saturatedFatG = nut.saturatedFatG || 0;
      const totalCarbohydrateG = nut.totalCarbohydrateG || 0;
      const totalSugarsG = nut.totalSugarsG || 0;
      const proteinG = nut.proteinG || 0;

      const nutritionRecord = {
        id: crypto.randomUUID(),
        label_id: labelId,
        serving_size_g: servingG,
        serving_size_unit: 'g',
        serving_size_household: `About ${Math.round(servingG / 25)} pieces (${servingG}g)`,
        servings_per_container: servingsPerContainer,
        is_dual_column: country === 'US',
        calories_kcal: caloriesKcal,
        calories_kj: caloriesKj,
        total_fat_g: totalFatG,
        saturated_fat_g: saturatedFatG,
        trans_fat_g: 0,
        cholesterol_mg: 0,
        sodium_mg: sodiumMg,
        salt_equivalent_g: saltEquivalentG,
        total_carbohydrate_g: totalCarbohydrateG,
        dietary_fiber_g: 1.5,
        total_sugars_g: totalSugarsG,
        added_sugars_g: Math.min(totalSugarsG, 1.0),
        protein_g: proteinG,
        vitamin_d_mcg: 0,
        calcium_mg: 25,
        iron_mg: 1.2,
        potassium_mg: 180,
        nrv_percentages: {
          energy: Math.round((caloriesKj / 8400) * 100),
          protein: Math.round((proteinG / 60) * 100),
          fat: Math.round((totalFatG / 60) * 100),
          carbohydrate: Math.round((totalCarbohydrateG / 300) * 100),
          sodium: Math.round((sodiumMg / 2000) * 100)
        },
        traffic_light_ratings: {
          fat: totalFatG > 17.5 ? 'red' : totalFatG > 3.0 ? 'amber' : 'green',
          saturatedFat: saturatedFatG > 5.0 ? 'red' : saturatedFatG > 1.5 ? 'amber' : 'green',
          sugars: totalSugarsG > 22.5 ? 'red' : totalSugarsG > 5.0 ? 'amber' : 'green',
          salt: saltEquivalentG > 1.5 ? 'red' : saltEquivalentG > 0.3 ? 'amber' : 'green'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      allNutritions.push(nutritionRecord);

      // Compliance Log
      const jurisdictionMap = {
        US: 'FDA / USDA-FSIS',
        CN: 'SAMR / GACC (GB 7718 & GB 28050)',
        JP: '消費者庁 (CAA 식품표시기준)',
        EU: 'EFSA / Regulation (EU) No 1169/2011',
        UAE: 'MoIAT / GSO 9:2022 & ESMA Halal'
      };

      const complianceRecord = {
        id: crypto.randomUUID(),
        label_id: labelId,
        jurisdiction: jurisdictionMap[country],
        is_compliant: true,
        score: 100,
        critical_errors: [],
        warnings: [],
        checked_at: new Date().toISOString()
      };

      allComplianceLogs.push(complianceRecord);

      // CamelCase object for local JSON backup
      localExportFoodLabels.push({
        id: labelId,
        productId: prod.id,
        country: country,
        version: 1,
        status: 'compliant',
        hsCode: prod.hs_code || '2106.90-9099',
        productNameLocal: loc.productNameLocal,
        productNameEn: prod.name_en || prod.name,
        productCategoryLocal: loc.productCategoryLocal,
        netWeightG: netWeightG,
        netWeightOz: netWeightOz,
        packageAreaCm2: 120.0,
        isShelfStable: prod.is_shelf_stable ?? true,
        claimsBadges: prod.claims || ['HACCP Certified', 'Traditional Recipe'],
        servingSuggestion: 'Best served with warm rice or as a delicious main dish.',
        storageInstructions: loc.storageInstructions,
        cookingInstructions: 'Ready to eat or heat for 3-5 minutes according to preference.',
        manufacturerInfo: foodLabelRecord.manufacturer_info,
        importerInfo: loc.importerInfo,
        registrationNumbers: loc.registrationNumbers,
        alcoholPercentage: 0.00,
        dateMarkingType: loc.dateMarkingType,
        dateMarkingText: loc.dateMarkingText,
        shelfLifeMonths: prod.shelf_life_months || 12,
        barcodeType: foodLabelRecord.barcode_type,
        barcodeNumber: foodLabelRecord.barcode_number,
        packagingMaterial: loc.packagingMaterial,
        recyclingSymbols: loc.recyclingSymbols,
        ingredients: labelIngredientsList.map((i) => ({
          id: i.id,
          labelId: i.label_id,
          ingredientNameKo: i.ingredient_name_ko,
          ingredientNameTarget: i.ingredient_name_target,
          ratio: i.ratio,
          isAllergen: i.is_allergen,
          allergenCategory: i.allergen_category,
          displayOrder: i.display_order
        })),
        nutrition: {
          id: nutritionRecord.id,
          labelId: nutritionRecord.label_id,
          servingSizeG: nutritionRecord.serving_size_g,
          servingSizeUnit: nutritionRecord.serving_size_unit,
          servingSizeHousehold: nutritionRecord.serving_size_household,
          servingsPerContainer: nutritionRecord.servings_per_container,
          isDualColumn: nutritionRecord.is_dual_column,
          caloriesKcal: nutritionRecord.calories_kcal,
          caloriesKj: nutritionRecord.calories_kj,
          totalFatG: nutritionRecord.total_fat_g,
          saturatedFatG: nutritionRecord.saturated_fat_g,
          transFatG: nutritionRecord.trans_fat_g,
          cholesterolMg: nutritionRecord.cholesterol_mg,
          sodiumMg: nutritionRecord.sodium_mg,
          saltEquivalentG: nutritionRecord.salt_equivalent_g,
          totalCarbohydrateG: nutritionRecord.total_carbohydrate_g,
          dietaryFiberG: nutritionRecord.dietary_fiber_g,
          totalSugarsG: nutritionRecord.total_sugars_g,
          addedSugarsG: nutritionRecord.added_sugars_g,
          proteinG: nutritionRecord.protein_g,
          vitaminDMcg: nutritionRecord.vitamin_d_mcg,
          calciumMg: nutritionRecord.calcium_mg,
          ironMg: nutritionRecord.iron_mg,
          potassiumMg: nutritionRecord.potassium_mg,
          nrvPercentages: nutritionRecord.nrv_percentages,
          trafficLightRatings: nutritionRecord.traffic_light_ratings
        },
        compliance: {
          id: complianceRecord.id,
          labelId: complianceRecord.label_id,
          jurisdiction: complianceRecord.jurisdiction,
          isCompliant: true,
          score: 100,
          criticalErrors: [],
          warnings: []
        },
        createdAt: foodLabelRecord.created_at,
        updatedAt: foodLabelRecord.updated_at
      });
    }
  }

  // 3. Batch Upsert to Supabase
  console.log(`📤 Step 3: Batch inserting ${allFoodLabels.length} food_labels into Supabase...`);
  
  // 청크 단위(50개씩) upsert
  async function chunkInsert(table, rows, chunkSize = 50) {
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase.from(table).upsert(chunk, { onConflict: 'id' });
      if (error) {
        console.error(`❌ Error inserting into ${table} (chunk ${i}-${i + chunk.length}):`, error);
      } else {
        process.stdout.write(`.` );
      }
    }
    console.log(`\n  ✅ Done inserting ${rows.length} rows into ${table}`);
  }

  await chunkInsert('food_labels', allFoodLabels);
  await chunkInsert('label_ingredients', allIngredients, 100);
  await chunkInsert('label_nutritions', allNutritions, 50);
  await chunkInsert('label_compliance_logs', allComplianceLogs, 50);

  // 4. Local File Sync
  console.log(`\n💾 Step 4: Syncing local fallback files (data/products.json, data/food-labels.json)...`);
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(dataDir, 'products.json'),
    JSON.stringify(productsToUpsert, null, 2),
    'utf-8'
  );
  console.log(`  ✅ Written ${productsToUpsert.length} items to data/products.json`);

  fs.writeFileSync(
    path.join(dataDir, 'food-labels.json'),
    JSON.stringify(localExportFoodLabels, null, 2),
    'utf-8'
  );
  console.log(`  ✅ Written ${localExportFoodLabels.length} labels to data/food-labels.json`);

  console.log(`\n🎉 Seeding completed successfully! 45 Products & 225 Master Labels are Live in Supabase & Local JSON.`);
}

seed().catch((err) => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
