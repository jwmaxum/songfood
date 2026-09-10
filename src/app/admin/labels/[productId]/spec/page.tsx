import React from 'react';
import { notFound } from 'next/navigation';
import { getProducts, getProductById } from '@/lib/products-db';
import { getFoodLabelsByProductId } from '@/lib/labels-db';
import { FoodLabel, TargetCountry } from '@/types/label';
import SpecSheetClient from './SpecSheetClient';

// Next.js output: export 정적 경로 사전 생성
export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({
    productId: p.id,
  }));
}

function createDefaultLabels(productId: string, product: any): Record<TargetCountry, FoodLabel> {
  const countries: TargetCountry[] = ['US', 'CN', 'JP', 'EU', 'UAE'];
  const map: Partial<Record<TargetCountry, FoodLabel>> = {};

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
    } else if (country === 'UAE') {
      targetName = 'فطائر الكينوا والخضار الكورية الحلال (خالية من الخنزير)';
      legalType = 'فطائر مجمدة حلال (Halal Dumplings)';
      dateFormat = 'DD/MM/YYYY';
    }

    map[country] = {
      id: `lbl-${productId}-${country}`,
      productId,
      country,
      status: country === 'US' ? 'warning' : 'compliant',
      productNameLocal: product.name,
      productNameEn: product.name_en || 'Bibigo Mandu',
      productCategoryLocal: product.category,
      netWeightG: 1050,
      shelfLifeMonths: 12,
      dateMarkingType: dateFormat,
      storageInstructions: 'Keep frozen at or below -18°C',
      barcodeType: country === 'US' ? 'UPC-A' : 'EAN-13',
      barcodeNumber: '8809123456789',
      hsCode: '1902.20-1000',
      header: {
        legalProductType: legalType,
        productNameKo: product.name,
        productNameEn: product.name_en || 'Bibigo Mandu',
        productNameTarget: targetName,
        hsCode: '1902.20-1000',
      },
      pdp: {
        netWeightG: 1050,
        netWeightCustom,
        claimHighlights: ['Korean Master Recipe', 'Juicy & Crispy', 'Authentic Taste'],
        certifications: ['HACCP Certified', 'FSSC 22000'],
      },
      informationPanel: {
        containsAllergensStatement: country === 'US' ? 'CONTAINS: WHEAT, SOYBEANS, PORK.' : '',
        storageConditionKo: '냉동보관 (-18℃ 이하)',
        storageConditionTarget: 'Keep frozen at or below -18°C. Do not refreeze once thawed.',
        manufacturerName: 'Songyoungmin Food Co., Ltd. (Korea)',
        importerDistributorText: '[Buyer to Fill in Destination Country]',
      },
      nutrition: {
        servingSizeG: 150,
        servingsPerContainer: 7,
        caloriesKcal: 310,
        totalFatG: 11,
        saturatedFatG: 3.5,
        sodiumMg: 650,
        totalCarbohydrateG: 42,
        dietaryFiberG: 3,
        totalSugarsG: 4,
        addedSugarsG: 1,
        proteinG: 12,
      },
      datingLot: {
        dateFormat,
        shelfLifeDays: 365,
        lotFormatTemplate: 'LOT-260910-01',
      },
      barcodeMarking: {
        barcodeType: country === 'US' ? 'UPC-A' : 'EAN-13',
        barcodeNumber: '8809123456789',
        recyclingMarks: ['PP (비닐류)', 'Outer Box: 종이 (PAP 20)'],
        registrationNumbers: {
          fdaFacilityNo: '19283746501',
          gaccRegNo: 'CKOR19022301010088',
        },
      },
      ingredients: [
        { ingredientNameKo: '돼지고기', ingredientNameTarget: country === 'UAE' ? '소고기 (Beef)' : 'Pork', ratio: 32, isAllergen: false },
        { ingredientNameKo: '밀가루', ingredientNameTarget: 'Wheat Flour', ratio: 28, isAllergen: true },
        { ingredientNameKo: '부추', ingredientNameTarget: 'Leek', ratio: 15, isAllergen: false },
        { ingredientNameKo: '양파', ingredientNameTarget: 'Onion', ratio: 12, isAllergen: false },
        { ingredientNameKo: '대두단백', ingredientNameTarget: 'Soy Protein', ratio: 8, isAllergen: true },
        { ingredientNameKo: '참기름', ingredientNameTarget: 'Sesame Oil', ratio: 3, isAllergen: true },
        { ingredientNameKo: '정제염', ingredientNameTarget: 'Refined Salt', ratio: 1.5, isAllergen: false },
        { ingredientNameKo: '후춧가루', ingredientNameTarget: 'Black Pepper', ratio: 0.5, isAllergen: false },
      ],
      claimsBadges: ['Authentic K-Food', 'Quick & Easy Cook'],
      version: 1,
      createdAt: '2026-09-10T00:00:00Z',
      updatedAt: '2026-09-10T00:00:00Z',
    };
  });

  return map as Record<TargetCountry, FoodLabel>;
}

export default async function SpecSheetPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const product = await getProductById(productId);

  if (!product) {
    notFound();
  }

  // 기존 DB 라벨 가져오기
  const labels = await getFoodLabelsByProductId(productId);
  const labelsMap = createDefaultLabels(productId, product);

  labels.forEach((l) => {
    labelsMap[l.country] = {
      ...labelsMap[l.country],
      ...l,
      header: l.header || labelsMap[l.country].header,
      pdp: l.pdp || labelsMap[l.country].pdp,
      informationPanel: l.informationPanel || labelsMap[l.country].informationPanel,
      nutrition: l.nutrition || labelsMap[l.country].nutrition,
      datingLot: l.datingLot || labelsMap[l.country].datingLot,
      barcodeMarking: l.barcodeMarking || labelsMap[l.country].barcodeMarking,
      ingredients: l.ingredients || labelsMap[l.country].ingredients,
    };
  });

  return <SpecSheetClient productId={productId} labelsMap={labelsMap} />;
}
