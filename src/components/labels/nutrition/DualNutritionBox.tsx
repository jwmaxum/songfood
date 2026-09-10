'use client';

import React, { useState } from 'react';
import { GlobalNutritionResult } from '@/lib/nutrition-calculator';
import { ExportCountry } from '@/types/label';
import USNutritionFactsPanel from './USNutritionFactsPanel';
import ChinaNutritionTable from './ChinaNutritionTable';
import JapanNutritionList from './JapanNutritionList';
import EUNutritionTable from './EUNutritionTable';
import UAETrafficLightPanel from './UAETrafficLightPanel';

interface Props {
  result: GlobalNutritionResult;
  defaultLeft?: ExportCountry;
  defaultRight?: ExportCountry;
  className?: string;
}

export default function DualNutritionBox({
  result,
  defaultLeft = 'US',
  defaultRight = 'EU',
  className = ''
}: Props) {
  const [leftCountry, setLeftCountry] = useState<ExportCountry>(defaultLeft);
  const [rightCountry, setRightCountry] = useState<ExportCountry>(defaultRight);

  const renderPanel = (c: ExportCountry) => {
    switch (c) {
      case 'US':
        return <USNutritionFactsPanel data={result.US} />;
      case 'CN':
        return <ChinaNutritionTable data={result.CN} />;
      case 'JP':
        return <JapanNutritionList data={result.JP} />;
      case 'EU':
        return <EUNutritionTable data={result.EU} />;
      case 'UAE':
        return <UAETrafficLightPanel data={result.UAE} />;
    }
  };

  const countries: { code: ExportCountry; label: string }[] = [
    { code: 'US', label: '🇺🇸 미국 FDA' },
    { code: 'CN', label: '🇨🇳 중국 GB' },
    { code: 'JP', label: '🇯🇵 일본 CAA' },
    { code: 'EU', label: '🇪🇺 유럽 FIC' },
    { code: 'UAE', label: '🇦🇪 UAE GSO' },
  ];

  return (
    <div className={`bg-stone-50 border border-stone-200 rounded-2xl p-6 shadow-sm space-y-6 ${className}`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-stone-200 gap-2">
        <div>
          <div className="text-xs font-black uppercase text-[#14532D] tracking-wider">
            Dual-Panel Nutrition Box Simulator
          </div>
          <h3 className="text-lg font-black text-stone-900">
            글로벌 듀얼 영양성분 비교 검증 뷰어
          </h3>
        </div>
        <div className="text-xs text-stone-500 font-mono">
          기준중량: {result.sourceWeightG}g | 1회제공: {result.servingSizeG}g
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-600">좌측 패널:</span>
            <div className="flex space-x-1">
              {countries.map((c) => (
                <button
                  key={c.code}
                  onClick={() => setLeftCountry(c.code)}
                  className={`px-2.5 py-1 text-[11px] rounded-lg font-bold transition-all ${
                    leftCountry === c.code ? 'bg-[#14532D] text-white shadow-sm' : 'bg-white text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-center">
            {renderPanel(leftCountry)}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-600">우측 패널:</span>
            <div className="flex space-x-1">
              {countries.map((c) => (
                <button
                  key={c.code}
                  onClick={() => setRightCountry(c.code)}
                  className={`px-2.5 py-1 text-[11px] rounded-lg font-bold transition-all ${
                    rightCountry === c.code ? 'bg-amber-600 text-white shadow-sm' : 'bg-white text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-center">
            {renderPanel(rightCountry)}
          </div>
        </div>
      </div>
    </div>
  );
}
