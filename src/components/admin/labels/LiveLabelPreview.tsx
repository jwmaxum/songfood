'use client';

import React, { useState } from 'react';
import { FoodLabel } from '@/types/label';
import USNutritionFactsPanel from '@/components/labels/nutrition/USNutritionFactsPanel';
import ChinaNutritionTable from '@/components/labels/nutrition/ChinaNutritionTable';
import JapanNutritionList from '@/components/labels/nutrition/JapanNutritionList';
import EUNutritionTable from '@/components/labels/nutrition/EUNutritionTable';
import UAETrafficLightPanel from '@/components/labels/nutrition/UAETrafficLightPanel';
import { calculateGlobalNutrition } from '@/lib/nutrition-calculator';

interface LiveLabelPreviewProps {
  label: FoodLabel;
}

export default function LiveLabelPreview({ label }: LiveLabelPreviewProps) {
  const [viewSide, setViewSide] = useState<'pdp' | 'info'>('info');

  // 안전 기본값 변수 추출
  const header = label.header || {
    legalProductType: label.productCategoryLocal || '식품',
    productNameKo: label.productNameLocal || '',
    productNameEn: label.productNameEn || '',
    productNameTarget: label.productNameLocal || label.productNameEn || '',
    hsCode: label.hsCode || '1902.20-1000',
  };

  const pdp = label.pdp || {
    netWeightG: label.netWeightG || 1000,
    netWeightCustom: `${label.netWeightG || 1000}g`,
    claimHighlights: label.claimsBadges || [],
    certifications: [],
  };

  const info = label.informationPanel || {
    containsAllergensStatement: '',
    storageConditionKo: label.storageInstructions || '냉동보관',
    storageConditionTarget: label.storageInstructions || 'Keep Frozen At or Below -18°C',
    manufacturerName: label.manufacturerInfo?.name || 'Songyoungmin Food Co., Ltd.',
    importerDistributorText: label.importerInfo?.name || '[Buyer to Fill in Destination Country]',
  };

  const nutrition = label.nutrition || {
    servingSizeG: 100,
    servingsPerContainer: 1,
    caloriesKcal: 200,
    totalFatG: 5,
    saturatedFatG: 2,
    sodiumMg: 300,
    totalCarbohydrateG: 20,
    totalSugarsG: 2,
    proteinG: 8,
  };

  const datingLot = label.datingLot || {
    dateFormat: (label.dateMarkingType || 'YYYY/MM/DD') as any,
    shelfLifeDays: (label.shelfLifeMonths || 12) * 30,
    lotFormatTemplate: 'LOT-YYMMDD-01',
  };

  const barcodeMarking = label.barcodeMarking || {
    barcodeType: label.barcodeType || 'EAN-13',
    barcodeNumber: label.barcodeNumber || '8809123456789',
    recyclingMarks: label.recyclingSymbols || [],
    registrationNumbers: label.registrationNumbers || {},
  };

  const ingredients = label.ingredients || [];

  // 실시간 영양성분 산출 결과
  const nutritionResult = calculateGlobalNutrition({
    baseWeightG: 100,
    servingSizeG: nutrition.servingSizeG || 100,
    servingsPerContainer: nutrition.servingsPerContainer || 1,
    servingSizeHousehold: nutrition.servingSizeHousehold || `${nutrition.servingSizeG || 100}g`,
    caloriesKcal: nutrition.caloriesKcal || 0,
    totalFatG: nutrition.totalFatG || 0,
    saturatedFatG: nutrition.saturatedFatG || 0,
    transFatG: nutrition.transFatG || 0,
    cholesterolMg: nutrition.cholesterolMg || 0,
    sodiumMg: nutrition.sodiumMg || 0,
    totalCarbohydrateG: nutrition.totalCarbohydrateG || 0,
    dietaryFiberG: nutrition.dietaryFiberG || 0,
    totalSugarsG: nutrition.totalSugarsG || 0,
    addedSugarsG: nutrition.addedSugarsG || 0,
    proteinG: nutrition.proteinG || 0,
    vitaminDMcg: nutrition.vitaminDMcg || 0,
    calciumMg: nutrition.calciumMg || 0,
    ironMg: nutrition.ironMg || 0,
    potassiumMg: nutrition.potassiumMg || 0,
  });

  return (
    <div className="bg-[#101017] border border-stone-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-full">
      {/* 뷰어 상단 툴바 */}
      <div className="p-3 bg-stone-900/90 border-b border-stone-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Live Package Label Preview ({label.country})
          </h4>
        </div>
        <div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-stone-800 text-xs">
          <button
            type="button"
            onClick={() => setViewSide('pdp')}
            className={`px-3 py-1 rounded-md transition-all ${
              viewSide === 'pdp'
                ? 'bg-[#c5a880] text-black font-bold'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            전면 (PDP)
          </button>
          <button
            type="button"
            onClick={() => setViewSide('info')}
            className={`px-3 py-1 rounded-md transition-all ${
              viewSide === 'info'
                ? 'bg-[#c5a880] text-black font-bold'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            후면 (Info Panel)
          </button>
        </div>
      </div>

      {/* 실물 라벨 그래픽 렌더링 영역 */}
      <div className="p-4 overflow-y-auto flex-1 bg-stone-950 flex justify-center items-start">
        {viewSide === 'pdp' ? (
          /* 전면 PDP 그래픽 렌더링 */
          <div className="w-full max-w-sm bg-gradient-to-b from-[#181824] to-[#0d0d14] border-2 border-stone-700 rounded-2xl p-6 shadow-2xl text-center space-y-5 text-white">
            {/* 브랜드 및 인증 마크 */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-serif tracking-widest text-[#c5a880] font-bold">
                SONGYOUNGMIN FOOD
              </span>
              <div className="flex items-center space-x-1">
                {pdp.certifications?.slice(0, 3).map((cert: string, i: number) => (
                  <span
                    key={i}
                    className="text-[9px] bg-stone-800 text-amber-300 px-1.5 py-0.5 rounded border border-stone-700 font-mono"
                  >
                    {cert.split(' ')[0]}
                  </span>
                ))}
              </div>
            </div>

            {/* 제품명 */}
            <div className="space-y-1.5 py-3 border-y border-stone-800/80">
              <span className="text-[10px] text-stone-400 uppercase tracking-wider font-mono">
                {header.legalProductType}
              </span>
              <h2 className="text-lg font-extrabold text-white leading-tight">
                {header.productNameTarget || header.productNameEn || header.productNameKo}
              </h2>
              <p className="text-xs text-stone-400">{header.productNameEn}</p>
            </div>

            {/* 소구 포인트 */}
            {pdp.claimHighlights && pdp.claimHighlights.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5">
                {pdp.claimHighlights.map((claim: string, idx: number) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-full font-medium"
                  >
                    ✦ {claim}
                  </span>
                ))}
              </div>
            )}

            {/* 순중량 표기 (FDA 규정에 맞춘 하단 30% 영역 oz 병기) */}
            <div className="pt-4 border-t border-stone-800">
              <span className="text-sm font-bold font-mono text-[#c5a880] tracking-wide">
                {pdp.netWeightCustom || `${pdp.netWeightG}g`}
              </span>
              <p className="text-[10px] text-stone-500 mt-1">
                {header.hsCode ? `HS Code: ${header.hsCode}` : ''}
              </p>
            </div>
          </div>
        ) : (
          <div
            dir={label.country === 'UAE' ? 'rtl' : 'ltr'}
            className={`w-full max-w-md bg-white text-black p-5 rounded-lg shadow-2xl space-y-4 text-xs ${
              label.country === 'UAE' ? 'text-right' : 'text-left'
            }`}
          >
            {/* 상단: 식품 기본 표시사항 */}
            <div className="border-b border-black pb-2 space-y-1">
              <div className="flex justify-between font-bold text-sm">
                <span>{header.productNameTarget || header.productNameKo}</span>
                <span className="font-mono text-xs px-1.5 py-0.5 bg-neutral-150 border border-neutral-300 rounded">
                  {label.country === 'UAE' ? '🇦🇪 UAE (RTL)' : `${label.country} EXPORT`}
                </span>
              </div>
              <p className="text-[11px] text-neutral-600">
                <span className="font-bold">Product Type: </span>
                {header.legalProductType}
              </p>
            </div>

            {/* 대상국 규격 Nutrition Facts 박스 */}
            <div className="bg-white">
              {label.country === 'US' && <USNutritionFactsPanel data={nutritionResult.US} />}
              {label.country === 'CN' && <ChinaNutritionTable data={nutritionResult.CN} />}
              {label.country === 'JP' && <JapanNutritionList data={nutritionResult.JP} />}
              {label.country === 'EU' && <EUNutritionTable data={nutritionResult.EU} />}
              {label.country === 'UAE' && <UAETrafficLightPanel data={nutritionResult.UAE} />}
            </div>

            {/* 원재료 배합비 내림차순 목록 */}
            <div className="border-t border-black pt-2 text-[11px] space-y-1 leading-relaxed">
              <p>
                <span className="font-bold uppercase">Ingredients: </span>
                {ingredients.length > 0
                  ? ingredients
                      .map((ing) => {
                        const name = ing.ingredientNameTarget || ing.ingredientNameKo;
                        return ing.ratio ? `${name} (${ing.ratio}%)` : name;
                      })
                      .join(', ')
                  : 'Pork, Wheat Flour, Leek, Onion, Garlic, Salt, Pepper.'}
              </p>

              {/* 알레르겐 박스 */}
              {info.containsAllergensStatement && (
                <p className="font-bold bg-neutral-100 p-1.5 border border-black mt-1">
                  {info.containsAllergensStatement}
                </p>
              )}
            </div>

            {/* 보관방법 & 제조사 / 수입사 */}
            <div className="border-t border-black pt-2 text-[10px] text-neutral-700 space-y-1">
              <p>
                <span className="font-bold">Storage: </span>
                {info.storageConditionTarget || 'Keep Frozen at -18°C'}
              </p>
              <p>
                <span className="font-bold">Manufacturer: </span>
                {info.manufacturerName || 'Songyoungmin Food Co., Ltd.'}
              </p>
              <p>
                <span className="font-bold">Importer: </span>
                {info.importerDistributorText || '[Buyer to Fill]'}
              </p>
              {(barcodeMarking.registrationNumbers as any)?.gaccRegNo && (
                <p>
                  <span className="font-bold">GACC Reg No: </span>
                  <span className="font-mono">{(barcodeMarking.registrationNumbers as any).gaccRegNo}</span>
                </p>
              )}
              {(barcodeMarking.registrationNumbers as any)?.fdaFacilityNo && (
                <p>
                  <span className="font-bold">FDA Reg No: </span>
                  <span className="font-mono">{(barcodeMarking.registrationNumbers as any).fdaFacilityNo}</span>
                </p>
              )}
            </div>

            {/* 바코드 및 날짜 */}
            <div className="border-t-2 border-black pt-3 flex items-center justify-between">
              <div className="space-y-0.5 text-[10px]">
                <p className="font-bold font-mono">
                  EXP DATE: {datingLot.dateFormat || 'MM/DD/YYYY'}
                </p>
                <p className="text-neutral-500 font-mono">
                  LOT: {datingLot.lotFormatTemplate || 'LOT-260910-01'}
                </p>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-xs tracking-widest border border-neutral-400 px-2 py-1 bg-neutral-50">
                  ||||| {barcodeMarking.barcodeNumber || '8809123456789'} |||||
                </div>
                <span className="text-[9px] text-neutral-500 font-mono">
                  {barcodeMarking.barcodeType || 'EAN-13'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
