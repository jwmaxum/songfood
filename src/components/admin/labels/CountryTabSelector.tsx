'use client';

import React from 'react';
import { ExportCountry } from '@/types/label';

interface CountryTabSelectorProps {
  selectedCountry: ExportCountry;
  onChange: (country: ExportCountry) => void;
  complianceScore?: number;
  criticalCount?: number;
  warningCount?: number;
}

const COUNTRIES: { id: ExportCountry; name: string; flag: string; agency: string; badgeColor: string }[] = [
  { id: 'US', name: '미국 (USA)', flag: '🇺🇸', agency: 'FDA / USDA', badgeColor: 'border-blue-500/40 text-blue-400' },
  { id: 'CN', name: '중국 (China)', flag: '🇨🇳', agency: 'SAMR / GACC', badgeColor: 'border-red-500/40 text-red-400' },
  { id: 'JP', name: '일본 (Japan)', flag: '🇯🇵', agency: '소비자청 (CAA)', badgeColor: 'border-rose-500/40 text-rose-400' },
  { id: 'EU', name: '유럽연합 (EU)', flag: '🇪🇺', agency: 'EFSA / EC FIC', badgeColor: 'border-amber-500/40 text-amber-400' },
  { id: 'UAE', name: '중동 (UAE)', flag: '🇦🇪', agency: 'MoIAT / GSO', badgeColor: 'border-emerald-500/40 text-emerald-400' },
];

export default function CountryTabSelector({
  selectedCountry,
  onChange,
  complianceScore = 100,
  criticalCount = 0,
  warningCount = 0
}: CountryTabSelectorProps) {
  return (
    <div className="bg-[#12121a] border border-stone-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
      {/* 5개국 선택 탭 버튼 그룹 */}
      <div className="flex flex-wrap items-center gap-1.5">
        {COUNTRIES.map((c) => {
          const isSelected = selectedCountry === c.id;
          return (
            <button
              key={c.id}
              onClick={() => onChange(c.id)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                isSelected
                  ? 'bg-[#c5a880] text-black shadow-md font-bold'
                  : 'bg-stone-900/80 text-stone-300 hover:bg-stone-800 hover:text-white border border-stone-800/80'
              }`}
            >
              <span className="text-base">{c.flag}</span>
              <span>{c.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  isSelected ? 'bg-black/20 text-black' : 'bg-stone-800 text-stone-400'
                }`}
              >
                {c.agency}
              </span>
            </button>
          );
        })}
      </div>

      {/* 우측 실시간 컴플라이언스 상태 뱃지 */}
      <div className="flex items-center space-x-3 text-xs">
        <div className="flex items-center space-x-1.5 bg-stone-900/90 px-3 py-1.5 rounded-lg border border-stone-800">
          <span className="text-stone-400">규제 준수 점수:</span>
          <span
            className={`font-mono font-bold text-sm ${
              complianceScore >= 90
                ? 'text-emerald-400'
                : complianceScore >= 70
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          >
            {complianceScore}점
          </span>
        </div>

        {criticalCount > 0 ? (
          <span className="px-2.5 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full font-semibold flex items-center space-x-1 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span>Red-Flag {criticalCount}건</span>
          </span>
        ) : warningCount > 0 ? (
          <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full font-semibold flex items-center space-x-1 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>주의 {warningCount}건</span>
          </span>
        ) : (
          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full font-semibold flex items-center space-x-1 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>통관 적합 (Pass)</span>
          </span>
        )}
      </div>
    </div>
  );
}
