'use client';

import React from 'react';
import { ExportCountry } from '@/types/label';

interface BlockPdpEditorProps {
  country: ExportCountry;
  netWeightG: number;
  netWeightCustom: string;
  claimHighlights: string[];
  certifications: string[];
  onChange: (field: string, value: any) => void;
}

const CERT_OPTIONS = [
  'HACCP (식품안전관리인증)',
  'ISO 22000',
  'FSSC 22000',
  'HALAL (JAKIM / ESMA / KMF)',
  'VEGAN (비건 인증)',
  'NON-GMO (유전자변형무첨가)',
  'K-FOOD 글로벌 품질인증'
];

export default function BlockPdpEditor({
  country,
  netWeightG,
  netWeightCustom,
  claimHighlights,
  certifications,
  onChange,
}: BlockPdpEditorProps) {
  // oz 자동 환산 함수 (1g = 0.035274 oz)
  const handleAutoConvertOz = () => {
    const oz = (netWeightG * 0.035274).toFixed(1);
    const lbs = (netWeightG / 453.592).toFixed(2);
    const ozString = `${netWeightG}g (${oz} oz / ${lbs} lbs)`;
    onChange('netWeightCustom', ozString);
  };

  const handleToggleCert = (cert: string) => {
    const updated = certifications.includes(cert)
      ? certifications.filter((c) => c !== cert)
      : [...certifications, cert];
    onChange('certifications', updated);
  };

  const handleAddClaim = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = (e.currentTarget.value || '').trim();
      if (val && !claimHighlights.includes(val)) {
        onChange('claimHighlights', [...claimHighlights, val]);
        e.currentTarget.value = '';
      }
    }
  };

  const handleRemoveClaim = (idx: number) => {
    onChange('claimHighlights', claimHighlights.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-stone-800">
        <h4 className="text-xs font-bold text-[#c5a880] uppercase tracking-wider font-mono">
          Block 2: PDP (전면 주표시면 규격)
        </h4>
        <span className="text-[11px] text-stone-400">
          소비자가 구매 시 가장 먼저 마주하는 전면 핵심 정보
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 순중량(g) */}
        <div>
          <label className="block text-xs text-stone-300 font-semibold mb-1">
            순중량 (Net Weight, g) <span className="text-rose-400">*</span>
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="1"
              value={netWeightG}
              onChange={(e) => onChange('netWeightG', Number(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-stone-900 border border-stone-800 focus:border-[#c5a880] rounded text-xs text-white focus:outline-none font-mono"
            />
            <span className="text-xs text-stone-400">g</span>
            {country === 'US' && (
              <button
                type="button"
                onClick={handleAutoConvertOz}
                className="shrink-0 px-2.5 py-1.5 bg-blue-950/80 hover:bg-blue-900 border border-blue-800/80 text-blue-300 text-[11px] rounded font-semibold transition-colors"
                title="미 FDA 규정에 맞춰 oz/lbs 단위 병기 자동 환산"
              >
                ⚡ oz 병기 자동변환
              </button>
            )}
          </div>
        </div>

        {/* 전면 표기 순중량 문자열 */}
        <div>
          <label className="block text-xs text-stone-300 font-semibold mb-1">
            전면 실인쇄 순중량 문구 (Display Net Content)
          </label>
          <input
            type="text"
            value={netWeightCustom || `${netWeightG}g`}
            onChange={(e) => onChange('netWeightCustom', e.target.value)}
            placeholder="예: NET WT. 37.0 oz (2.31 lbs) 1,050g"
            className="w-full px-3 py-2 bg-stone-900 border border-stone-800 focus:border-[#c5a880] rounded text-xs text-white focus:outline-none font-mono"
          />
          {country === 'US' && !netWeightCustom.toLowerCase().includes('oz') && (
            <p className="text-[10px] text-amber-400 mt-1">
              ⚠️ 미국 FDA는 전면 라벨 하단 30% 영역에 oz 단위 필수 병기를 규정하고 있습니다.
            </p>
          )}
        </div>
      </div>

      {/* 전면 클레임 / 소구 포인트 태그 */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs text-stone-300 font-semibold">
            전면 소구 포인트 (Highlights & Claims) - <span className="text-stone-400 font-normal">입력 후 Enter</span>
          </label>
          <span className="text-[10px] text-amber-400/90 font-mono">21 CFR 101 / GB 7718 규정 검증</span>
        </div>

        {/* 법정 영양강조 클레임 원클릭 프리셋 */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <span className="text-[10px] text-stone-400 mr-1">추천 클레임:</span>
          {[
            'Sugar-Free',
            'Fat-Free',
            'Low-Fat',
            'Low-Sodium',
            'High-Protein',
            '100% Plant-Based',
            'Non-GMO',
          ].map((preset) => (
            <button
              type="button"
              key={preset}
              onClick={() => {
                if (!claimHighlights.includes(preset)) {
                  onChange('claimHighlights', [...claimHighlights, preset]);
                }
              }}
              className="px-2 py-0.5 bg-stone-900 hover:bg-stone-800 text-[10px] text-stone-300 border border-stone-800 rounded font-mono transition-colors"
            >
              +{preset}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {claimHighlights.map((claim, idx) => (
            <span
              key={idx}
              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-stone-800/80 border border-stone-700 text-stone-200 text-xs rounded-full"
            >
              <span>{claim}</span>
              <button
                type="button"
                onClick={() => handleRemoveClaim(idx)}
                className="text-stone-400 hover:text-rose-400 text-xs font-bold"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          onKeyDown={handleAddClaim}
          placeholder="예: 100% Korean Pork, Quick Deep-Frozen, Sugar-Free (입력 후 Enter)"
          className="w-full px-3 py-2 bg-stone-900 border border-stone-800 focus:border-[#c5a880] rounded text-xs text-white focus:outline-none"
        />
        {country === 'CN' && claimHighlights.some((c) => c.includes('零添加') || c.includes('不添加') || c.includes('무첨가') || c.includes('0添加')) && (
          <p className="text-[10px] text-rose-400 mt-1 font-semibold">
            🚨 중국 GB 7718-2025 규정 위반: '零添加', '不添加(무첨가)', '0添加' 클레임은 전면 금지되어 통관 거부 대상입니다.
          </p>
        )}
      </div>

      {/* 인증 마크 선택 체크박스 */}
      <div>
        <label className="block text-xs text-stone-300 font-semibold mb-2">
          인쇄 인증 뱃지 (Certifications & Badges)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CERT_OPTIONS.map((cert) => {
            const isChecked = certifications.includes(cert);
            return (
              <label
                key={cert}
                onClick={() => handleToggleCert(cert)}
                className={`cursor-pointer px-3 py-2 rounded-lg border text-xs flex items-center space-x-2 transition-all select-none ${
                  isChecked
                    ? 'bg-[#c5a880]/15 border-[#c5a880] text-amber-200 font-semibold'
                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:bg-stone-850'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}}
                  className="rounded border-stone-700 text-[#c5a880] focus:ring-0"
                />
                <span className="truncate">{cert}</span>
              </label>
            );
          })}
        </div>
        {country === 'UAE' && !certifications.some((c) => c.includes('HALAL')) && (
          <p className="text-[10px] text-amber-400 mt-1.5">
            ℹ️ UAE 및 중동 수출 시 육류/가금류 함유 품목은 공인 할랄 인증(ESMA/MoIAT 인정) 기재가 필수 권장됩니다.
          </p>
        )}
      </div>
    </div>
  );
}
