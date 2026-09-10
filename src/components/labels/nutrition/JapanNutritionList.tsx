'use client';

import React from 'react';
import { JapanNutritionOutput } from '@/lib/nutrition-calculator';

interface Props {
  data: JapanNutritionOutput;
  className?: string;
}

export default function JapanNutritionList({ data, className = '' }: Props) {
  const { perServing } = data;

  return (
    <div className={`border border-stone-800 bg-white p-4 font-sans max-w-sm w-full shadow-sm select-none ${className}`}>
      <div className="text-center font-bold text-sm border-b-2 border-stone-900 pb-1.5 tracking-wider">
        栄養成分表示 ({perServing.servingLabel})
      </div>

      <div className="text-xs space-y-2 pt-2">
        <div className="flex justify-between border-b border-stone-200 pb-1">
          <span className="font-bold text-stone-800">エネルギー (熱量)</span>
          <span className="font-mono font-bold">{perServing.caloriesKcal} kcal</span>
        </div>
        <div className="flex justify-between border-b border-stone-200 pb-1">
          <span className="font-bold text-stone-800">たんぱく質</span>
          <span className="font-mono">{perServing.proteinG} g</span>
        </div>
        <div className="flex justify-between border-b border-stone-200 pb-1">
          <span className="font-bold text-stone-800">脂質</span>
          <span className="font-mono">{perServing.fatG} g</span>
        </div>
        <div className="flex justify-between border-b border-stone-200 pb-1">
          <span className="font-bold text-stone-800">炭水化物</span>
          <span className="font-mono">{perServing.carbG} g</span>
        </div>
        <div className="flex justify-between border-b-2 border-stone-900 pb-1.5 text-emerald-900 font-extrabold bg-emerald-50/60 px-1 rounded">
          <span>食塩相当量 (Na換算)</span>
          <span className="font-mono text-emerald-800 font-black">{perServing.saltEquivalentG} g</span>
        </div>
      </div>

      <div className="text-[10px] text-stone-500 pt-1.5 flex justify-between">
        <span>（推定値）</span>
        <span>消費者庁食品表示基準 準拠</span>
      </div>
    </div>
  );
}
