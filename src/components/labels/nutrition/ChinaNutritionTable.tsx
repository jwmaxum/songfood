'use client';

import React from 'react';
import { ChinaNutritionOutput } from '@/lib/nutrition-calculator';

interface Props {
  data: ChinaNutritionOutput;
  className?: string;
}

export default function ChinaNutritionTable({ data, className = '' }: Props) {
  const { per100g } = data;

  return (
    <div className={`border border-stone-800 bg-white p-4 font-sans max-w-sm w-full shadow-sm select-none ${className}`}>
      <div className="text-center font-black text-base border-b-2 border-stone-900 pb-1.5 tracking-wider">
        营养成分表 (Nutrition Information)
      </div>

      <table className="w-full text-xs text-left border-collapse mt-2">
        <thead>
          <tr className="border-b border-stone-400 text-stone-700 font-bold">
            <th className="py-1">项目 (Item)</th>
            <th className="py-1 text-center">每100克 (Per 100g)</th>
            <th className="py-1 text-right">营养素参考值% (NRV%)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200">
          <tr>
            <td className="py-1.5 font-bold">能量 (Energy)</td>
            <td className="text-center font-mono">{per100g.energyKj} kJ</td>
            <td className="text-right font-bold">{per100g.energyNRV}%</td>
          </tr>
          <tr>
            <td className="py-1.5 font-bold">蛋白质 (Protein)</td>
            <td className="text-center font-mono">{per100g.proteinG} g</td>
            <td className="text-right font-bold">{per100g.proteinNRV}%</td>
          </tr>
          <tr>
            <td className="py-1.5 font-bold">脂肪 (Fat)</td>
            <td className="text-center font-mono">{per100g.fatG} g</td>
            <td className="text-right font-bold">{per100g.fatNRV}%</td>
          </tr>
          <tr>
            <td className="py-1.5 font-bold">碳水化合物 (Carbohydrate)</td>
            <td className="text-center font-mono">{per100g.carbG} g</td>
            <td className="text-right font-bold">{per100g.carbNRV}%</td>
          </tr>
          <tr>
            <td className="py-1.5 font-bold">钠 (Sodium)</td>
            <td className="text-center font-mono">{per100g.sodiumMg} mg</td>
            <td className="text-right font-bold">{per100g.sodiumNRV}%</td>
          </tr>
        </tbody>
      </table>

      <div className="text-[10px] text-stone-500 pt-2 border-t border-stone-200 mt-2 text-right">
        符合 GB 28050-2011 / 2025 食品安全国家标准
      </div>
    </div>
  );
}
