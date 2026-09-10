'use client';

import React from 'react';
import { ExportCountry, DateFormatType } from '@/types/label';

interface BlockDatingEditorProps {
  country: ExportCountry;
  dateFormat: DateFormatType;
  shelfLifeDays: number;
  lotFormatTemplate: string;
  onChange: (field: string, value: any) => void;
}

const DATE_FORMATS: { format: DateFormatType; label: string; example: string; countries: string }[] = [
  { format: 'YYYY/MM/DD', label: '년/월/일 (YYYY/MM/DD)', example: '2026/12/31', countries: 'JP, CN, KR 표준' },
  { format: 'MM/DD/YYYY', label: '월/일/년 (MM/DD/YYYY)', example: '12/31/2026', countries: 'US (미국) 의무' },
  { format: 'DD/MM/YYYY', label: '일/월/년 (DD/MM/YYYY)', example: '31/12/2026', countries: 'EU, UAE (중동/유럽) 의무' },
  { format: 'YYYY-MM-DD', label: '국제표준 ISO (YYYY-MM-DD)', example: '2026-12-31', countries: '공용' },
];

export default function BlockDatingEditor({
  country,
  dateFormat,
  shelfLifeDays,
  lotFormatTemplate,
  onChange,
}: BlockDatingEditorProps) {
  // 국가 변경 시 권장 포맷 자동 추천
  const handleRecommendFormat = () => {
    if (country === 'US') onChange('dateFormat', 'MM/DD/YYYY');
    else if (country === 'EU' || country === 'UAE') onChange('dateFormat', 'DD/MM/YYYY');
    else onChange('dateFormat', 'YYYY/MM/DD');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-stone-800">
        <div>
          <h4 className="text-xs font-bold text-[#c5a880] uppercase tracking-wider font-mono">
            Block 5: Dating & Lot (일자 포맷 & 로트 추적성)
          </h4>
          <span className="text-[11px] text-stone-400">
            수출국 규정에 불합치하는 일자 순서 표기는 세관 통관 전량 반려 사유입니다.
          </span>
        </div>
        <button
          type="button"
          onClick={handleRecommendFormat}
          className="px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded text-xs font-semibold transition-colors"
        >
          <span>⚡ {country} 권장 포맷 적용</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 날짜 포맷 셀렉터 */}
        <div>
          <label className="block text-xs text-stone-300 font-semibold mb-1">
            소비기한/상미기한 날짜 포맷 <span className="text-rose-400">*</span>
          </label>
          <select
            value={dateFormat}
            onChange={(e) => onChange('dateFormat', e.target.value as DateFormatType)}
            className="w-full px-3 py-2 bg-stone-900 border border-stone-800 focus:border-[#c5a880] rounded text-xs text-white focus:outline-none font-mono"
          >
            {DATE_FORMATS.map((df) => (
              <option key={df.format} value={df.format}>
                {df.label} - [{df.example}] ({df.countries})
              </option>
            ))}
          </select>
          {country === 'US' && dateFormat !== 'MM/DD/YYYY' && (
            <p className="text-[10px] text-amber-400 mt-1">
              ⚠️ 미국향 라벨은 현지 소비자 혼동 방지를 위해 MM/DD/YYYY 포맷 사용을 강력 권장합니다.
            </p>
          )}
          {(country === 'EU' || country === 'UAE') && dateFormat === 'MM/DD/YYYY' && (
            <p className="text-[10px] text-rose-400 mt-1 font-semibold">
              🚨 EU 및 UAE 규정: 일/월/년(DD/MM/YYYY) 순서가 의무이며, 미국식 월/일 표기는 위반입니다.
            </p>
          )}
        </div>

        {/* 유통기한(일수) */}
        <div>
          <label className="block text-xs text-stone-300 font-semibold mb-1">
            유통/소비기한 일수 (Shelf Life, Days)
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="1"
              value={shelfLifeDays || 365}
              onChange={(e) => onChange('shelfLifeDays', Number(e.target.value) || 365)}
              className="w-full px-3 py-2 bg-stone-900 border border-stone-800 focus:border-[#c5a880] rounded text-xs text-white focus:outline-none font-mono"
            />
            <span className="text-xs text-stone-400 shrink-0">
              일 ({Math.round((shelfLifeDays || 365) / 30)}개월)
            </span>
          </div>
        </div>
      </div>

      {/* 로트 식별 번호 템플릿 */}
      <div>
        <label className="block text-xs text-stone-300 font-semibold mb-1">
          로트(Lot) 식별 번호 생성 템플릿 (Traceability)
        </label>
        <input
          type="text"
          value={lotFormatTemplate || 'LOT-YYMMDD-LN1'}
          onChange={(e) => onChange('lotFormatTemplate', e.target.value)}
          placeholder="예: LOT-YYMMDD-LN1"
          className="w-full px-3 py-2 bg-stone-900 border border-stone-800 focus:border-[#c5a880] rounded text-xs text-white focus:outline-none font-mono"
        />
        <p className="text-[10px] text-stone-500 mt-1">
          생산 라인 번호, 제조연월일, 작업조를 조합하여 통관 검역 시 리콜 추적이 가능하도록 설계합니다.
        </p>
      </div>
    </div>
  );
}
