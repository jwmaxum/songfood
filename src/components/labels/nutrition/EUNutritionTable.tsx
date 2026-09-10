'use client';

import React from 'react';
import { EUNutritionOutput } from '@/lib/nutrition-calculator';

interface Props {
  data: EUNutritionOutput;
  className?: string;
}

export default function EUNutritionTable({ data, className = '' }: Props) {
  const { per100g } = data;
  const { referenceIntakes } = per100g;

  return (
    <div className={`border border-stone-800 bg-white p-4 font-sans max-w-sm w-full shadow-sm select-none ${className}`}>
      <div className="font-black text-sm border-b-2 border-stone-900 pb-1.5 tracking-wide flex justify-between items-baseline">
        <span>NUTRITION DECLARATION</span>
        <span className="text-[10px] font-normal text-stone-500">Per 100g</span>
      </div>

      <table className="w-full text-xs text-left border-collapse mt-1">
        <thead>
          <tr className="border-b border-stone-300 text-stone-500 text-[10px]">
            <th className="py-1">Nutrient</th>
            <th className="py-1 text-right">Amount</th>
            <th className="py-1 text-right">% RI*</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200">
          <tr className="font-bold">
            <td className="py-1">Energy</td>
            <td className="text-right font-mono">{per100g.energyKj} kJ / {per100g.energyKcal} kcal</td>
            <td className="text-right">{referenceIntakes.energy}%</td>
          </tr>
          <tr>
            <td className="py-1 font-semibold">Fat</td>
            <td className="text-right font-mono">{per100g.fatG} g</td>
            <td className="text-right">{referenceIntakes.fat}%</td>
          </tr>
          <tr className="text-stone-600">
            <td className="py-0.5 pl-3">of which saturates</td>
            <td className="text-right font-mono">{per100g.saturatedFatG} g</td>
            <td className="text-right">{referenceIntakes.saturates}%</td>
          </tr>
          <tr>
            <td className="py-1 font-semibold">Carbohydrate</td>
            <td className="text-right font-mono">{per100g.carbG} g</td>
            <td className="text-right">{referenceIntakes.carbs}%</td>
          </tr>
          <tr className="text-stone-600">
            <td className="py-0.5 pl-3">of which sugars</td>
            <td className="text-right font-mono">{per100g.sugarsG} g</td>
            <td className="text-right">{referenceIntakes.sugars}%</td>
          </tr>
          <tr>
            <td className="py-1 font-semibold">Protein</td>
            <td className="text-right font-mono">{per100g.proteinG} g</td>
            <td className="text-right">{referenceIntakes.protein}%</td>
          </tr>
          <tr className="font-bold bg-emerald-50/50">
            <td className="py-1 text-emerald-950">Salt</td>
            <td className="text-right font-mono text-emerald-900">{per100g.saltG} g</td>
            <td className="text-right text-emerald-900">{referenceIntakes.salt}%</td>
          </tr>
        </tbody>
      </table>

      <div className="text-[9px] text-stone-500 pt-2 border-t border-stone-200 mt-2 leading-tight">
        * Reference intake of an average adult (8 400 kJ / 2 000 kcal). EU Regulation (EU) No 1169/2011 compliant.
      </div>
    </div>
  );
}
