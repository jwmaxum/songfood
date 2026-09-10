import React from 'react';
import { notFound } from 'next/navigation';
import { getProducts, getProductById } from '@/lib/products-db';
import { getFoodLabelsByProductId } from '@/lib/labels-db';
import { FoodLabel, ExportCountry } from '@/types/label';
import LabelStudioClient from '@/components/admin/labels/LabelStudioClient';

// Next.js output: export 정적 경로 사전 생성
export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({
    productId: p.id,
  }));
}

// 기본 5대국 템플릿 생성기
function createDefaultLabels(productId: string, product: any): Record<ExportCountry, FoodLabel> {
  const countries: ExportCountry[] = ['US', 'CN', 'JP', 'EU', 'UAE'];
  const map: Partial<Record<ExportCountry, FoodLabel>> = {};

  countries.forEach((country) => {
    let targetName = product.name;
    let legalType = '냉동만두 (가열후섭취냉동식품)';
    let dateFormat: any = 'YYYY/MM/DD';
    let oz = (1050 * 0.035274).toFixed(1);
    let netWeightCustom = `1,050g (${oz} oz)`;

    if (country === 'US') {
      targetName = product.name_en || 'Bibigo Premium Pork & Leek Mandu';
      legalType = 'Frozen Dumplings';
      dateFormat = 'MM/DD/YYYY';
    } else if (country === 'CN') {
      targetName = '韩式猪肉蔬菜大水饺';
      legalType = '速冻面米制品 (熟制品)';
      dateFormat = 'YYYY/MM/DD';
      netWeightCustom = '1050克 (g)';
    } else if (country === 'JP') {
      targetName = '韓国風 豚肉とニラの王餃子';
      legalType = '冷凍ぎょうざ (加熱後摂取)';
      dateFormat = 'YYYY/MM/DD';
      netWeightCustom = '1050g';
    } else if (country === 'EU') {
      targetName = 'Korean Style Pork & Leek Dumplings (Mandu)';
      legalType = 'Deep-Frozen Stuffed Pasta / Dumplings';
      dateFormat = 'DD/MM/YYYY';
      netWeightCustom = '1050g';
    } else if (country === 'UAE') {
      targetName = 'Korean Style Dumplings (زلابية كورية)';
      legalType = 'Frozen Dumplings / فطائر مثلجة';
      dateFormat = 'DD/MM/YYYY';
      netWeightCustom = '1050g';
    }

    map[country] = {
      id: `label-${productId}-${country}`,
      productId: productId,
      country: country,
      status: 'compliant',
      version: 1,
      header: {
        hsCode: product.hs_code || '1902.20-1000',
        productNameKo: product.name,
        productNameEn: product.name_en || 'Bibigo Mandu',
        productNameTarget: targetName,
        legalProductType: legalType,
      },
      pdp: {
        netWeightG: 1050,
        netWeightCustom: netWeightCustom,
        claimHighlights: ['100% Korean Pork', 'Deep Frozen IQF', 'Thin Wrapper'],
        certifications: country === 'UAE' ? ['HALAL (KMF)', 'HACCP', 'ISO 22000'] : ['HACCP', 'ISO 22000', 'FSSC 22000'],
      },
      informationPanel: {
        containsAllergensStatement: country === 'US' 
          ? 'CONTAINS: WHEAT, SOYBEAN, PORK, SESAME.' 
          : '알레르기 유발물질: 밀, 대두, 돼지고기 함유',
        storageConditionKo: '영하 18℃ 이하 냉동 보관',
        storageConditionTarget: 'Keep Frozen At or Below -18°C (-0.4°F)',
        manufacturerName: 'Songyoungmin Food Co., Ltd.',
        importerDistributorText: '[Buyer to fill destination importer info]',
      },
      nutrition: {
        servingSizeG: 120,
        servingsPerContainer: 9,
        servingSizeHousehold: '3 pieces (120g)',
        caloriesKcal: 210,
        totalFatG: 8.5,
        saturatedFatG: 3.2,
        transFatG: 0,
        cholesterolMg: 25,
        sodiumMg: 420,
        totalCarbohydrateG: 24.0,
        dietaryFiberG: 2.1,
        totalSugarsG: 2.5,
        addedSugarsG: 0.8,
        proteinG: 9.0,
        vitaminDMcg: 0.5,
        calciumMg: 35,
        ironMg: 1.2,
        potassiumMg: 190,
        energyKj: 879,
        saltEquivalentG: 1.07,
      },
      datingLot: {
        dateFormat: dateFormat,
        shelfLifeDays: 365,
        lotFormatTemplate: 'LOT-YYMMDD-LN1',
      },
      barcodeMarking: {
        barcodeType: country === 'US' ? 'UPC-A' : 'EAN-13',
        barcodeNumber: country === 'US' ? '850012345678' : '8809123456789',
        recyclingMarks: country === 'JP' ? ['JP_PLA_MARK'] : ['KR_CAN_RECYCLE'],
        registrationNumbers: {
          fdaFacilityNo: country === 'US' ? '12345678901' : undefined,
          gaccRegNo: country === 'CN' ? 'CKOR24012301010001' : undefined,
          halalCertNo: country === 'UAE' ? 'HALAL-KMF-2026-0891' : undefined,
        },
      },
      ingredients: [
        { ingredientNameKo: '돼지고기', ingredientNameTarget: 'Pork', ratio: country === 'US' ? 1.8 : 32.0, orderIndex: 1, isAllergen: true },
        { ingredientNameKo: '밀가루', ingredientNameTarget: 'Wheat Flour', ratio: 28.0, orderIndex: 2, isAllergen: true },
        { ingredientNameKo: '부추', ingredientNameTarget: 'Leek', ratio: 15.0, orderIndex: 3, isAllergen: false },
        { ingredientNameKo: '당면', ingredientNameTarget: 'Glass Noodles', ratio: 10.0, orderIndex: 4, isAllergen: false },
        { ingredientNameKo: '양파', ingredientNameTarget: 'Onion', ratio: 8.0, orderIndex: 5, isAllergen: false },
        { ingredientNameKo: '대파', ingredientNameTarget: 'Green Onion', ratio: 4.0, orderIndex: 6, isAllergen: false },
        { ingredientNameKo: '참기름', ingredientNameTarget: 'Sesame Oil', ratio: 1.5, orderIndex: 7, isAllergen: true },
        { ingredientNameKo: '정제소금', ingredientNameTarget: 'Salt', ratio: 1.0, orderIndex: 8, isAllergen: false },
        { ingredientNameKo: '후추', ingredientNameTarget: 'Black Pepper', ratio: 0.5, orderIndex: 9, isAllergen: false },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  return map as Record<ExportCountry, FoodLabel>;
}

export default async function AdminLabelStudioPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const resolvedParams = await params;
  const productId = resolvedParams.productId;

  const product = await getProductById(productId);
  if (!product) {
    notFound();
  }

  // DB에서 기존 라벨들 로드
  const existingLabels = await getFoodLabelsByProductId(productId);
  const defaultLabels = createDefaultLabels(productId, product);

  // 기존 라벨이 있으면 병합
  existingLabels.forEach((lbl) => {
    if (lbl.country && defaultLabels[lbl.country]) {
      defaultLabels[lbl.country] = {
        ...defaultLabels[lbl.country],
        ...lbl,
      };
    }
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <LabelStudioClient
        product={product}
        initialLabels={defaultLabels}
      />
    </div>
  );
}
