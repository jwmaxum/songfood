'use client';

import React from 'react';
import { FoodLabel, TargetCountry } from '@/types/label';
import { BuyerFormData } from './BuyerToFillForm';
import USNutritionFactsPanel from '@/components/labels/nutrition/USNutritionFactsPanel';
import ChinaNutritionTable from '@/components/labels/nutrition/ChinaNutritionTable';
import JapanNutritionList from '@/components/labels/nutrition/JapanNutritionList';
import EUNutritionTable from '@/components/labels/nutrition/EUNutritionTable';
import UAETrafficLightPanel from '@/components/labels/nutrition/UAETrafficLightPanel';
import { calculateGlobalNutrition } from '@/lib/nutrition-calculator';
import './PrintStyleGuide.css';

interface MasterSpecSheetProps {
  label: FoodLabel;
  buyerData: BuyerFormData;
  specDocId?: string;
  revisionNo?: string;
}

export default function MasterSpecSheet({
  label,
  buyerData,
  specDocId = 'SYMF-SPEC-2026-088',
  revisionNo = 'REV 2.4 (2026)',
}: MasterSpecSheetProps) {
  const country = (label.country || 'US') as TargetCountry;

  // Safe fallback values
  const header = label.header || {
    legalProductType: label.productCategoryLocal || '만두류 (Dumplings)',
    productNameKo: label.productNameLocal || '송영민 K-비비고 왕교자 만두',
    productNameEn: label.productNameEn || 'Premium Vegetable & Seafood Dumplings',
    productNameTarget: label.productNameEn || 'Premium Vegetable & Seafood Dumplings',
    hsCode: label.hsCode || '1902.20.0000',
  };

  const pdp = label.pdp || {
    netWeightG: label.netWeightG || 480,
    netWeightCustom: 'NET WT. 16.9 OZ (1.05 LBS) 480g',
    claimHighlights: label.claimsBadges || ['Authentic Korean Recipe', 'No Preservatives Added', 'Pork-Free'],
    certifications: ['HACCP Certified', 'ISO 22000', country === 'UAE' ? 'MoIAT Halal' : 'FDA Registered'],
  };

  const info = label.informationPanel || {
    containsAllergensStatement: 'CONTAINS: WHEAT, SOYBEANS, SESAME.',
    storageConditionKo: '냉동보관 (-18℃ 이하)',
    storageConditionTarget: 'Keep frozen at or below 0°F (-18°C). Do not refreeze once thawed.',
    manufacturerName: label.manufacturerInfo?.name || 'Song Youngmin Food Co., Ltd.',
    importerDistributorText: buyerData.companyName || '[ BUYER TO FILL ]',
  };

  const nutrition = label.nutrition || {
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
  };

  const datingLot = label.datingLot || {
    dateFormat: country === 'US' ? 'MM/DD/YYYY' : country === 'JP' ? 'YYYY/MM/DD' : 'DD/MM/YYYY',
    shelfLifeDays: (label.shelfLifeMonths || 12) * 30,
    lotFormatTemplate: 'LOT-YYMMDD-01',
  };

  const barcodeMarking = label.barcodeMarking || {
    barcodeType: country === 'US' ? 'UPC-A' : 'EAN-13',
    barcodeNumber: country === 'US' ? '012345678905' : '8809123456789',
    recyclingMarks: ['PP (Polypropylene) 5', 'Outer Carton: Corrugated Box (PAP 20)'],
    registrationNumbers: {
      fdaFacilityNo: '19283746501',
      gaccRegNo: 'CKOR19022301010088',
    },
  };

  const ingredients = label.ingredients && label.ingredients.length > 0
    ? label.ingredients
    : [
        { ingredientNameKo: '밀가루', ingredientNameTarget: 'Wheat Flour', ratio: 38, isAllergen: true },
        { ingredientNameKo: '두부', ingredientNameTarget: 'Tofu (Soybeans, Water)', ratio: 22, isAllergen: true },
        { ingredientNameKo: '양배추', ingredientNameTarget: 'Cabbage', ratio: 15 },
        { ingredientNameKo: '새우살', ingredientNameTarget: 'Shrimp (Crustacean)', ratio: 10, isAllergen: true },
        { ingredientNameKo: '부추', ingredientNameTarget: 'Leek', ratio: 6 },
        { ingredientNameKo: '참기름', ingredientNameTarget: 'Sesame Oil', ratio: 4, isAllergen: true },
        { ingredientNameKo: '천일염', ingredientNameTarget: 'Sea Salt', ratio: 1.5 },
        { ingredientNameKo: '후춧가루', ingredientNameTarget: 'Black Pepper', ratio: 0.5 },
      ];

  // Global nutrition calculation
  const nutritionResult = calculateGlobalNutrition({
    baseWeightG: 100,
    servingSizeG: nutrition.servingSizeG || 120,
    servingsPerContainer: nutrition.servingsPerContainer || 4,
    servingSizeHousehold: `${nutrition.servingSizeG || 120}g (approx. 4 pcs)`,
    caloriesKcal: nutrition.caloriesKcal || 220,
    totalFatG: nutrition.totalFatG || 6,
    saturatedFatG: nutrition.saturatedFatG || 1,
    transFatG: nutrition.transFatG || 0,
    cholesterolMg: nutrition.cholesterolMg || 15,
    sodiumMg: nutrition.sodiumMg || 460,
    totalCarbohydrateG: nutrition.totalCarbohydrateG || 32,
    dietaryFiberG: nutrition.dietaryFiberG || 2,
    totalSugarsG: nutrition.totalSugarsG || 3,
    addedSugarsG: nutrition.addedSugarsG || 1,
    proteinG: nutrition.proteinG || 9,
    vitaminDMcg: nutrition.vitaminDMcg || 0,
    calciumMg: nutrition.calciumMg || 40,
    ironMg: nutrition.ironMg || 1.8,
    potassiumMg: nutrition.potassiumMg || 180,
  });

  const getRegionTitle = (c: TargetCountry) => {
    switch (c) {
      case 'US': return 'UNITED STATES (US FDA / FALCPA / FSIS Compliant)';
      case 'CN': return 'CHINA (GACC No. 248 / GB 7718 & GB 28050-2025)';
      case 'JP': return 'JAPAN (CAA Food Labeling Act / Salt Eq. Compliant)';
      case 'EU': return 'EUROPEAN UNION (EC FIC 1169/2011 & Reg 2022/63)';
      case 'UAE': return 'UAE & GCC (MoIAT Halal & GSO 2055-1 / Traffic Light)';
    }
  };

  return (
    <div className="spec-sheet-container spec-sheet-screen mx-auto max-w-[850px] p-8 md:p-12 border border-stone-300 rounded-lg text-black font-sans text-xs leading-normal">
      {/* 1. DOCUMENT HEADER */}
      <div className="border-b-2 border-black pb-4 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-stone-500 uppercase font-mono">
              OFFICIAL EXPORT TECHNICAL SPECIFICATION
            </span>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-black">
              SONG YOUNGMIN FOOD CO., LTD.
            </h1>
            <p className="text-xs text-stone-600">
              Global Quality Assurance & Regulatory Affairs Division
            </p>
          </div>
          <div className="text-right font-mono text-[11px] text-stone-600">
            <div className="bg-stone-100 border border-stone-300 px-3 py-1 rounded inline-block">
              <span className="font-bold text-black">{specDocId}</span> | {revisionNo}
            </div>
            <p className="mt-1 text-[10px]">Issued: 2026-09-10 | Origin: South Korea</p>
          </div>
        </div>

        {/* 1.1 PRODUCT SPECIFICATION TABLE */}
        <div className="mt-4 bg-stone-50 border border-black p-3.5 grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase block font-mono">Product Code</span>
            <span className="font-bold font-mono text-black">{label.productId || 'SF-DM-001'}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase block font-mono">HS Tariff Code</span>
            <span className="font-bold font-mono text-black">{header.hsCode}</span>
          </div>
          <div className="col-span-2">
            <span className="text-[10px] font-bold text-stone-500 uppercase block font-mono">Target Compliance Region</span>
            <span className="font-bold text-emerald-800">{getRegionTitle(country)}</span>
          </div>
          <div className="col-span-2">
            <span className="text-[10px] font-bold text-stone-500 uppercase block font-mono">Korean Product Name</span>
            <span className="font-semibold text-black">{header.productNameKo}</span>
          </div>
          <div className="col-span-2">
            <span className="text-[10px] font-bold text-stone-500 uppercase block font-mono">Official Export / English Name</span>
            <span className="font-bold text-black">{header.productNameEn || header.productNameTarget}</span>
          </div>
        </div>
      </div>

      {/* 2. PDP (Principal Display Panel) PREVIEW */}
      <div className="spec-box border border-black p-4 mb-5 rounded bg-white page-break-inside-avoid">
        <div className="flex items-center justify-between border-b border-stone-300 pb-1.5 mb-3 font-mono text-[10px] text-stone-600 uppercase font-bold">
          <span>[Section 2] Principal Display Panel (PDP) Front Packaging Layout</span>
          <span className="text-emerald-700">Display Ratio: High Contrast 100%</span>
        </div>

        <div className="border border-dashed border-stone-400 p-6 bg-stone-50 text-center space-y-3 rounded">
          <div className="inline-block px-3 py-0.5 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded">
            SONG YOUNGMIN FOOD • MASTER SELECTION
          </div>
          <h2 className="text-lg md:text-xl font-extrabold tracking-tight text-black uppercase">
            {header.productNameEn || header.productNameTarget}
          </h2>
          <p className="text-xs text-stone-600 italic">
            Authentic Korean Recipe • Thin Wrapper & Rich Succulent Filling
          </p>

          <div className="pt-2 flex flex-wrap justify-center gap-1.5">
            {pdp.claimHighlights?.map((claim: string, idx: number) => (
              <span key={idx} className="text-[10px] px-2.5 py-0.5 border border-stone-600 bg-white font-semibold">
                ✓ {claim}
              </span>
            ))}
          </div>

          <div className="pt-3 border-t border-stone-200 flex flex-wrap items-center justify-between text-xs font-mono px-4">
            <span className="font-bold text-black">
              {pdp.netWeightCustom || `NET WT. ${(((pdp.netWeightG || 480) * 0.035274)).toFixed(1)} OZ (${pdp.netWeightG || 480}g)`}
            </span>
            <div className="space-x-2 text-[10px] text-stone-600">
              {pdp.certifications?.map((cert: string, idx: number) => (
                <span key={idx} className="font-bold">[ {cert} ]</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. INFORMATION PANEL & NUTRITION FACTS (DUAL COLUMNS) */}
      <div className="spec-box border border-black p-4 mb-5 rounded bg-white page-break-inside-avoid">
        <div className="flex items-center justify-between border-b border-stone-300 pb-1.5 mb-3 font-mono text-[10px] text-stone-600 uppercase font-bold">
          <span>[Section 3] Dual-Column Information Panel & Mandated Nutrition Facts</span>
          <span>{country} Regulatory Layout</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* LEFT: Information Panel */}
          <div className="md:col-span-7 space-y-3.5 border-r md:border-stone-300 md:pr-4 text-[11px] leading-relaxed">
            {/* Ingredients */}
            <div>
              <span className="font-bold uppercase text-[10px] text-stone-500 font-mono block">
                Mandatory Ingredients List (In Descending Order of Weight)
              </span>
              <p className="mt-0.5 text-black">
                <span className="font-bold">INGREDIENTS: </span>
                {ingredients
                  .map((ing) => {
                    const name = ing.ingredientNameTarget || ing.ingredientNameKo;
                    const pct = ing.ratio ? ` (${ing.ratio}%)` : '';
                    return ing.isAllergen ? `${name.toUpperCase()}${pct}` : `${name}${pct}`;
                  })
                  .join(', ')}
              </p>
            </div>

            {/* Allergen Statement */}
            <div className="p-2.5 bg-neutral-100 border border-black font-semibold text-[11px]">
              <span className="font-bold block text-[10px] text-neutral-600 font-mono uppercase">
                Allergen Declaration (Strict Containment)
              </span>
              <p className="mt-0.5">{info.containsAllergensStatement || 'CONTAINS: WHEAT, SOYBEANS, CRUSTACEAN, SESAME.'}</p>
            </div>

            {/* Storage Condition */}
            <div>
              <span className="font-bold uppercase text-[10px] text-stone-500 font-mono block">
                Storage & Handling Instructions
              </span>
              <p className="mt-0.5 font-medium">{info.storageConditionTarget}</p>
            </div>

            {/* Manufacturer Details */}
            <div className="pt-2 border-t border-stone-200">
              <span className="font-bold uppercase text-[10px] text-stone-500 font-mono block">
                Manufactured & Packaged By (Origin Factory)
              </span>
              <p className="mt-0.5 font-bold">Song Youngmin Food Co., Ltd.</p>
              <p className="text-stone-600 text-[10px]">
                123 K-Food Way, Gyeonggi-do, Republic of Korea | Tel: +82-31-555-0100
              </p>
              <p className="font-mono text-[10px] text-stone-700 mt-0.5">
                FDA Facility Reg: {barcodeMarking.registrationNumbers?.fdaFacilityNo || '19283746501'} | GACC No: {barcodeMarking.registrationNumbers?.gaccRegNo || 'CKOR19022301010088'}
              </p>
            </div>

            {/* Importer / Buyer to Fill Details */}
            <div className="pt-2 border-t border-stone-200 bg-amber-50/60 p-2.5 border border-amber-300 rounded">
              <div className="flex items-center justify-between text-[10px] font-mono text-amber-900 font-bold mb-1">
                <span>IMPORTER & DISTRIBUTOR IN DESTINATION COUNTRY</span>
                <span>[BUYER DATA FILLED]</span>
              </div>
              <p className="font-bold text-black text-xs">
                {buyerData.companyName || '[ BUYER COMPANY NAME TO BE INSERTED ]'}
              </p>
              <p className="text-[10px] text-stone-700">
                {buyerData.address ? `${buyerData.address}, ${buyerData.cityStateZip}` : '[ Street Address, City, State/Province, Postal Code ]'}
              </p>
              <p className="text-[10px] text-stone-700">
                {buyerData.country ? `Country: ${buyerData.country}` : ''} | {buyerData.registrationNumber ? `License/Reg: ${buyerData.registrationNumber}` : 'License: [Buyer License / VAT / Customs No]'}
              </p>
              <p className="text-[10px] text-stone-600 font-mono mt-0.5">
                Contact: {buyerData.contactPerson || '[ Buyer Contact Person ]'} ({buyerData.email || 'Email / Phone'})
              </p>
            </div>
          </div>

          {/* RIGHT: Country Standard Nutrition Facts Panel */}
          <div className="md:col-span-5 flex flex-col justify-center items-center">
            <div className="w-full max-w-[280px]">
              <span className="font-mono text-[9px] text-stone-500 uppercase font-bold text-center block mb-1">
                Official {country} Regulatory Format
              </span>
              <div className="border border-stone-400 p-2 bg-white shadow-sm">
                {country === 'US' && <USNutritionFactsPanel data={nutritionResult.US} />}
                {country === 'CN' && <ChinaNutritionTable data={nutritionResult.CN} />}
                {country === 'JP' && <JapanNutritionList data={nutritionResult.JP} />}
                {country === 'EU' && <EUNutritionTable data={nutritionResult.EU} />}
                {country === 'UAE' && <UAETrafficLightPanel data={nutritionResult.UAE} />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. DATING, BARCODE & PACKAGING */}
      <div className="spec-box border border-black p-4 mb-5 rounded bg-white page-break-inside-avoid">
        <div className="flex items-center justify-between border-b border-stone-300 pb-1.5 mb-3 font-mono text-[10px] text-stone-600 uppercase font-bold">
          <span>[Section 4] Dating Code, Barcode & Packaging Specifications</span>
          <span>Traceability Level 100%</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px]">
          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase block font-mono">Date Coding Standard</span>
            <p className="font-bold text-black mt-0.5">{datingLot.dateFormat} (Format)</p>
            <p className="text-stone-600 text-[10px]">Shelf Life: {Math.round((datingLot.shelfLifeDays || 365) / 30)} Months from production</p>
            <p className="font-mono text-[10px] text-stone-500 mt-1">Lot Structure: {datingLot.lotFormatTemplate}</p>
          </div>

          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase block font-mono">Primary Barcode Marking</span>
            <div className="mt-1 p-2 border border-black text-center font-mono font-bold text-xs bg-stone-50">
              ||||| {barcodeMarking.barcodeNumber || '8809123456789'} |||||
              <span className="block text-[9px] text-stone-500 font-normal mt-0.5">
                Symbology: {barcodeMarking.barcodeType || 'EAN-13'} (GS1 Compliant)
              </span>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase block font-mono">Packaging & Recycling Material</span>
            <ul className="mt-0.5 text-[10px] text-stone-700 space-y-0.5 list-disc list-inside">
              {barcodeMarking.recyclingMarks?.map((mark: string, idx: number) => (
                <li key={idx}>{mark}</li>
              ))}
              <li>Food Grade Contact Certified (BPA Free)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 5. SIGN-OFF & COMPLIANCE VERIFICATION BOX */}
      <div className="spec-box border border-black p-4 rounded bg-stone-50 text-[10px] page-break-inside-avoid">
        <div className="grid grid-cols-2 gap-4">
          <div className="border-r border-stone-300 pr-3">
            <span className="font-bold uppercase font-mono text-stone-600 block">
              Manufacturer QA / Regulatory Affairs Sign-off
            </span>
            <p className="mt-1 text-stone-600">
              Certified that the formulation and labeling specifications meet target country standards as of 2026.
            </p>
            <div className="mt-4 pt-2 border-t border-dashed border-stone-400 flex justify-between items-end">
              <span className="font-mono">Song Youngmin Food QA Team</span>
              <span className="font-bold text-emerald-800">[ APPROVED & VERIFIED ]</span>
            </div>
          </div>

          <div className="pl-2">
            <span className="font-bold uppercase font-mono text-stone-600 block">
              Importer / Distributor Acceptance Sign-off
            </span>
            <p className="mt-1 text-stone-600">
              Buyer confirms receipt and acceptance of labeling specs for local customs clearance entry.
            </p>
            <div className="mt-4 pt-2 border-t border-dashed border-stone-400 flex justify-between items-end">
              <span className="font-mono">{buyerData.contactPerson || 'Authorized Representative'}</span>
              <span className="font-mono text-stone-500">Date: 2026-___-___</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
