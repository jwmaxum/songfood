'use client';

import React from 'react';
import { ExportCountry, LabelNutrition } from '@/types/label';
import { calculateGlobalNutrition, BaseNutritionInput } from '@/lib/nutrition-calculator';

interface BlockNutritionEditorProps {
  country: ExportCountry;
  nutrition: LabelNutrition;
  netWeightG: number;
  onChange: (field: string, value: any) => void;
}

export default function BlockNutritionEditor({
  country,
  nutrition,
  netWeightG,
  onChange,
}: BlockNutritionEditorProps) {
  // 1회 제공량 변경
  const handleServingSizeChange = (val: number) => {
    const servings = netWeightG > 0 ? Math.max(1, Math.round(netWeightG / (val || 100))) : 1;
    onChange('servingSizeG', val);
    onChange('servingsPerContainer', servings);
    onChange('servingSizeHousehold', `${val}g (${(val * 0.035274).toFixed(1)} oz)`);
  };

  // 국가별 규격 자동 계산 및 적용
  const handleAutoCalculate = () => {
    const input: BaseNutritionInput = {
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
    };

    const result = calculateGlobalNutrition(input);

    // 대상국에 맞춘 파생 필드 업데이트
    if (country === 'US') {
      onChange('dailyValuePercentages', {
        totalFat: result.US.perServing.totalFatDV,
        saturatedFat: result.US.perServing.saturatedFatDV,
        sodium: result.US.perServing.sodiumDV,
        totalCarb: result.US.perServing.totalCarbDV,
        dietaryFiber: result.US.perServing.dietaryFiberDV,
        addedSugars: result.US.perServing.addedSugarsDV,
        protein: result.US.perServing.proteinDV,
      });
    } else if (country === 'CN') {
      onChange('energyKj', result.CN.per100g.energyKj);
      onChange('dailyValuePercentages', {
        energy: result.CN.per100g.energyNRV,
        protein: result.CN.per100g.proteinNRV,
        fat: result.CN.per100g.fatNRV,
        carbohydrate: result.CN.per100g.carbNRV,
        sodium: result.CN.per100g.sodiumNRV,
      });
    } else if (country === 'JP') {
      onChange('saltEquivalentG', result.JP.perServing.saltEquivalentG);
    } else if (country === 'EU') {
      onChange('energyKj', result.EU.per100g.energyKj);
    } else if (country === 'UAE') {
      onChange('energyKj', result.UAE.per100g.caloriesKj);
      onChange('trafficLightColor', result.UAE.per100g.trafficLights);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-stone-800">
        <div>
          <h4 className="text-xs font-bold text-[#c5a880] uppercase tracking-wider font-mono">
            Block 4: Nutrition Panel (영양성분표 & 환산)
          </h4>
          <span className="text-[11px] text-stone-400">
            100g 기준 원시값 입력 시 대상국 규격(FDA / GB / CAA / EU / MoIAT)으로 자동 산출
          </span>
        </div>
        <button
          type="button"
          onClick={handleAutoCalculate}
          className="px-3 py-1.5 bg-[#c5a880] hover:bg-[#b59870] text-black rounded text-xs font-bold flex items-center space-x-1.5 shadow transition-colors"
        >
          <span>⚡ 대상국 영양 규격 자동 산출</span>
        </button>
      </div>

      {/* 제공량 단위 설정 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-stone-900/50 p-3 rounded-lg border border-stone-800">
        <div>
          <label className="block text-[11px] text-stone-400 font-semibold mb-1">
            1회 제공량 (g)
          </label>
          <input
            type="number"
            min="10"
            value={nutrition.servingSizeG || 100}
            onChange={(e) => handleServingSizeChange(Number(e.target.value) || 100)}
            className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-700 rounded text-xs text-white font-mono"
          />
        </div>
        <div>
          <label className="block text-[11px] text-stone-400 font-semibold mb-1">
            용기당 제공 횟수 (회)
          </label>
          <input
            type="number"
            min="1"
            value={nutrition.servingsPerContainer || 1}
            onChange={(e) => onChange('servingsPerContainer', Number(e.target.value) || 1)}
            className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-700 rounded text-xs text-white font-mono"
          />
        </div>
        <div>
          <label className="block text-[11px] text-stone-400 font-semibold mb-1">
            가정용 단위 표기 (Household Measure)
          </label>
          <input
            type="text"
            value={nutrition.servingSizeHousehold || ''}
            onChange={(e) => onChange('servingSizeHousehold', e.target.value)}
            placeholder="예: 3 pieces (120g)"
            className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-700 rounded text-xs text-white"
          />
        </div>
      </div>

      {/* 100g 기준 영양성분 입력 그리드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block text-stone-400 font-mono mb-1">열량 (kcal) *</label>
          <input
            type="number"
            value={nutrition.caloriesKcal || 0}
            onChange={(e) => onChange('caloriesKcal', Number(e.target.value) || 0)}
            className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-800 rounded font-mono text-white"
          />
        </div>
        <div>
          <label className="block text-stone-400 font-mono mb-1">총지방 (g)</label>
          <input
            type="number"
            step="0.1"
            value={nutrition.totalFatG || 0}
            onChange={(e) => onChange('totalFatG', parseFloat(e.target.value) || 0)}
            className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-800 rounded font-mono text-white"
          />
        </div>
        <div>
          <label className="block text-stone-400 font-mono mb-1">포화지방 (g)</label>
          <input
            type="number"
            step="0.1"
            value={nutrition.saturatedFatG || 0}
            onChange={(e) => onChange('saturatedFatG', parseFloat(e.target.value) || 0)}
            className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-800 rounded font-mono text-white"
          />
        </div>
        <div>
          <label className="block text-stone-400 font-mono mb-1">트랜스지방 (g)</label>
          <input
            type="number"
            step="0.1"
            value={nutrition.transFatG || 0}
            onChange={(e) => onChange('transFatG', parseFloat(e.target.value) || 0)}
            className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-800 rounded font-mono text-white"
          />
        </div>

        <div>
          <label className="block text-stone-400 font-mono mb-1">콜레스테롤 (mg)</label>
          <input
            type="number"
            value={nutrition.cholesterolMg || 0}
            onChange={(e) => onChange('cholesterolMg', Number(e.target.value) || 0)}
            className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-800 rounded font-mono text-white"
          />
        </div>
        <div>
          <label className="block text-stone-400 font-mono mb-1">나트륨 (mg) *</label>
          <input
            type="number"
            value={nutrition.sodiumMg || 0}
            onChange={(e) => onChange('sodiumMg', Number(e.target.value) || 0)}
            className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-800 rounded font-mono text-white"
          />
        </div>
        <div>
          <label className="block text-stone-400 font-mono mb-1">탄수화물 (g)</label>
          <input
            type="number"
            step="0.1"
            value={nutrition.totalCarbohydrateG || 0}
            onChange={(e) => onChange('totalCarbohydrateG', parseFloat(e.target.value) || 0)}
            className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-800 rounded font-mono text-white"
          />
        </div>
        <div>
          <label className="block text-stone-400 font-mono mb-1">식이섬유 (g)</label>
          <input
            type="number"
            step="0.1"
            value={nutrition.dietaryFiberG || 0}
            onChange={(e) => onChange('dietaryFiberG', parseFloat(e.target.value) || 0)}
            className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-800 rounded font-mono text-white"
          />
        </div>

        <div>
          <label className="block text-stone-400 font-mono mb-1">총당류 (g)</label>
          <input
            type="number"
            step="0.1"
            value={nutrition.totalSugarsG || 0}
            onChange={(e) => onChange('totalSugarsG', parseFloat(e.target.value) || 0)}
            className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-800 rounded font-mono text-white"
          />
        </div>
        <div>
          <label className="block text-stone-400 font-mono mb-1">첨가당 (g) (미국필수)</label>
          <input
            type="number"
            step="0.1"
            value={nutrition.addedSugarsG || 0}
            onChange={(e) => onChange('addedSugarsG', parseFloat(e.target.value) || 0)}
            className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-800 rounded font-mono text-white"
          />
        </div>
        <div>
          <label className="block text-stone-400 font-mono mb-1">단백질 (g)</label>
          <input
            type="number"
            step="0.1"
            value={nutrition.proteinG || 0}
            onChange={(e) => onChange('proteinG', parseFloat(e.target.value) || 0)}
            className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-800 rounded font-mono text-white"
          />
        </div>
        <div>
          <label className="block text-stone-400 font-mono mb-1">비타민D (mcg)</label>
          <input
            type="number"
            step="0.1"
            value={nutrition.vitaminDMcg || 0}
            onChange={(e) => onChange('vitaminDMcg', parseFloat(e.target.value) || 0)}
            className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-800 rounded font-mono text-white"
          />
        </div>
      </div>

      {/* 대상국별 파생 필드 실시간 현황 */}
      <div className="bg-stone-900/80 p-3 rounded-lg border border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="text-stone-400">
          📍 <span className="text-white font-semibold">{country}</span> 권역 주요 환산값:
        </span>
        <div className="flex flex-wrap items-center gap-3 font-mono">
          {country === 'CN' || country === 'EU' || country === 'UAE' ? (
            <span className="text-amber-300">
              에너지: {nutrition.energyKj || Math.round((nutrition.caloriesKcal || 0) * 4.184)} kJ
            </span>
          ) : null}

          {country === 'JP' ? (
            <span className="text-rose-300">
              식염상당량:{' '}
              {nutrition.saltEquivalentG || (((nutrition.sodiumMg || 0) * 2.54) / 1000).toFixed(2)} g
            </span>
          ) : null}

          {country === 'US' ? (
            <span className="text-blue-300">
              1회당 칼로리: {Math.round(((nutrition.caloriesKcal || 0) * (nutrition.servingSizeG || 100)) / 100)} Cal
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
