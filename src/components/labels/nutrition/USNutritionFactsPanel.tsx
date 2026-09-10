'use client';

import React from 'react';
import { USNutritionOutput } from '@/lib/nutrition-calculator';

interface Props {
  data: USNutritionOutput;
  className?: string;
}

export default function USNutritionFactsPanel({ data, className = '' }: Props) {
  const { perServing, perContainer, isDualColumn, servingsPerContainer, servingSizeHousehold } = data;

  return (
    <div className={`border-2 border-stone-900 bg-white text-stone-900 p-4 font-sans max-w-sm w-full shadow-sm select-none ${className}`}>
      {/* Title */}
      <div className="text-3xl sm:text-4xl font-black font-jakarta border-b-8 border-stone-900 pb-1 leading-none tracking-tight">
        Nutrition Facts
      </div>

      {/* Serving Size Info */}
      <div className="text-xs font-semibold py-1 border-b border-stone-900 flex justify-between">
        <span>{servingsPerContainer} servings per container</span>
      </div>
      <div className="text-xs font-black py-1 border-b-4 border-stone-900 flex justify-between items-baseline">
        <span>Serving size</span>
        <span className="font-bold">{servingSizeHousehold}</span>
      </div>

      {/* Calories */}
      {!isDualColumn || !perContainer ? (
        // Single Column Layout
        <>
          <div className="py-2 border-b-8 border-stone-900 flex justify-between items-baseline">
            <div>
              <div className="text-[10px] font-black uppercase">Amount per serving</div>
              <div className="text-2xl sm:text-3xl font-black">Calories</div>
            </div>
            <div className="text-4xl sm:text-5xl font-black">{perServing.calories}</div>
          </div>

          <div className="text-right text-[10px] font-black py-1 border-b border-stone-900">
            % Daily Value*
          </div>

          <div className="text-xs space-y-1 divide-y divide-stone-200">
            <div className="flex justify-between pt-1">
              <span><strong>Total Fat</strong> {perServing.totalFat}g</span>
              <span className="font-bold">{perServing.totalFatDV}%</span>
            </div>
            <div className="flex justify-between pt-1 pl-4">
              <span>Saturated Fat {perServing.saturatedFat}g</span>
              <span className="font-bold">{perServing.saturatedFatDV}%</span>
            </div>
            <div className="flex justify-between pt-1 pl-4">
              <span><em>Trans</em> Fat {perServing.transFat}g</span>
              <span />
            </div>
            <div className="flex justify-between pt-1">
              <span><strong>Cholesterol</strong> {perServing.cholesterol}mg</span>
              <span className="font-bold">{perServing.cholesterolDV}%</span>
            </div>
            <div className="flex justify-between pt-1">
              <span><strong>Sodium</strong> {perServing.sodium}mg</span>
              <span className="font-bold">{perServing.sodiumDV}%</span>
            </div>
            <div className="flex justify-between pt-1">
              <span><strong>Total Carbohydrate</strong> {perServing.totalCarb}g</span>
              <span className="font-bold">{perServing.totalCarbDV}%</span>
            </div>
            <div className="flex justify-between pt-1 pl-4">
              <span>Dietary Fiber {perServing.dietaryFiber}g</span>
              <span className="font-bold">{perServing.dietaryFiberDV}%</span>
            </div>
            <div className="flex justify-between pt-1 pl-4">
              <span>Total Sugars {perServing.totalSugars}g</span>
              <span />
            </div>
            <div className="flex justify-between pt-1 pl-6">
              <span>Includes {perServing.addedSugars}g Added Sugars</span>
              <span className="font-bold">{perServing.addedSugarsDV}%</span>
            </div>
            <div className="flex justify-between pt-1 border-b-4 border-stone-900 pb-1">
              <span><strong>Protein</strong> {perServing.protein}g</span>
              <span className="font-bold">{perServing.proteinDV}%</span>
            </div>
          </div>

          {/* Micro Nutrients */}
          <div className="pt-2 text-[10px] text-stone-600 space-y-1">
            <div className="flex justify-between">
              <span>Vitamin D {perServing.vitaminDMcg}mcg {perServing.vitaminDDV}%</span>
              <span>Calcium {perServing.calciumMg}mg {perServing.calciumDV}%</span>
            </div>
            <div className="flex justify-between">
              <span>Iron {perServing.ironMg}mg {perServing.ironDV}%</span>
              <span>Potassium {perServing.potassiumMg}mg {perServing.potassiumDV}%</span>
            </div>
          </div>
        </>
      ) : (
        // Dual-Column Layout (Per Serving vs Per Container)
        <div className="pt-2">
          <div className="grid grid-cols-3 text-right text-[10px] font-black pb-1 border-b-2 border-stone-900">
            <span className="text-left font-bold">Amount/serving</span>
            <span>Per Serving</span>
            <span>Per Container</span>
          </div>

          <div className="grid grid-cols-3 items-baseline py-1.5 border-b-4 border-stone-900">
            <span className="text-base font-black">Calories</span>
            <span className="text-right text-xl font-black">{perServing.calories}</span>
            <span className="text-right text-xl font-black">{perContainer.calories}</span>
          </div>

          <div className="grid grid-cols-3 text-right text-[9px] font-black py-0.5 border-b border-stone-900">
            <span />
            <span>% DV*</span>
            <span>% DV*</span>
          </div>

          <div className="text-[11px] divide-y divide-stone-200">
            <div className="grid grid-cols-3 py-1">
              <span><strong>Total Fat</strong></span>
              <span className="text-right">{perServing.totalFat}g ({perServing.totalFatDV}%)</span>
              <span className="text-right">{perContainer.totalFat}g ({perContainer.totalFatDV}%)</span>
            </div>
            <div className="grid grid-cols-3 py-1 pl-2 text-stone-700">
              <span>Sat Fat</span>
              <span className="text-right">{perServing.saturatedFat}g ({perServing.saturatedFatDV}%)</span>
              <span className="text-right">{perContainer.saturatedFat}g ({perContainer.saturatedFatDV}%)</span>
            </div>
            <div className="grid grid-cols-3 py-1">
              <span><strong>Sodium</strong></span>
              <span className="text-right">{perServing.sodium}mg ({perServing.sodiumDV}%)</span>
              <span className="text-right">{perContainer.sodium}mg ({perContainer.sodiumDV}%)</span>
            </div>
            <div className="grid grid-cols-3 py-1">
              <span><strong>Total Carb</strong></span>
              <span className="text-right">{perServing.totalCarb}g ({perServing.totalCarbDV}%)</span>
              <span className="text-right">{perContainer.totalCarb}g ({perContainer.totalCarbDV}%)</span>
            </div>
            <div className="grid grid-cols-3 py-1 pl-2 text-stone-700">
              <span>Added Sugars</span>
              <span className="text-right">{perServing.addedSugars}g ({perServing.addedSugarsDV}%)</span>
              <span className="text-right">{perContainer.addedSugars}g ({perContainer.addedSugarsDV}%)</span>
            </div>
            <div className="grid grid-cols-3 py-1 border-b-4 border-stone-900 pb-1">
              <span><strong>Protein</strong></span>
              <span className="text-right">{perServing.protein}g</span>
              <span className="text-right">{perContainer.protein}g</span>
            </div>
          </div>
        </div>
      )}

      {/* Footnote */}
      <div className="text-[9px] text-stone-500 pt-2 border-t border-stone-300 leading-tight">
        * The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.
      </div>
    </div>
  );
}
