'use client';

import React from 'react';
import { ValidationResult, RedFlagItem } from '@/lib/label-compliance/types';
import { FoodLabel } from '@/types/label';

interface ComplianceAlertBoxProps {
  label: FoodLabel;
  validationResult: ValidationResult;
  onAutoFix: (fixedFields: any) => void;
}

export default function ComplianceAlertBox({
  label,
  validationResult,
  onAutoFix,
}: ComplianceAlertBoxProps) {
  const { criticalErrors, warnings, infoNotes, isCompliant, score } = validationResult;

  // 원클릭 자동 수정 핸들러
  const handleAutoFixItem = (item: RedFlagItem) => {
    const fixed: any = {};

    const pdp = label.pdp || {};
    const netWeightG = pdp.netWeightG || 1000;
    const info = label.informationPanel || {};
    const nutrition = label.nutrition || ({} as any);
    const datingLot = label.datingLot || {};

    if (item.code === 'US-CRIT-ALLERGEN-CONTAINS') {
      fixed.informationPanel = {
        ...info,
        containsAllergensStatement: 'CONTAINS: WHEAT, SOYBEAN, PORK, SESAME.',
      };
    } else if (item.code === 'US-WARN-NET-WEIGHT-OZ') {
      const oz = (netWeightG * 0.035274).toFixed(1);
      const lbs = (netWeightG / 453.592).toFixed(2);
      fixed.pdp = {
        ...pdp,
        netWeightCustom: `${netWeightG}g (${oz} oz / ${lbs} lbs)`,
      };
    } else if (item.code === 'CN-CRIT-NO-ADDITIVE-CLAIM') {
      fixed.pdp = {
        ...pdp,
        claimHighlights: (pdp.claimHighlights || []).filter(
          (c) => !c.includes('零添加') && !c.includes('不添加') && !c.includes('무첨가')
        ),
      };
    } else if (item.code === 'CN-CRIT-ENERGY-KJ' || item.code === 'EU-CRIT-ENERGY-DUAL') {
      fixed.nutrition = {
        ...nutrition,
        energyKj: Math.round((nutrition.caloriesKcal || 0) * 4.184),
      };
    } else if (item.code === 'JP-CRIT-SALT-EQUIVALENT') {
      fixed.nutrition = {
        ...nutrition,
        saltEquivalentG: parseFloat((((nutrition.sodiumMg || 0) * 2.54) / 1000).toFixed(2)),
      };
    } else if (item.code === 'EU-CRIT-DATE-FORMAT' || item.code === 'UAE-CRIT-DATE-FORMAT') {
      fixed.datingLot = {
        ...datingLot,
        dateFormat: 'DD/MM/YYYY',
      };
    }

    onAutoFix(fixed);
  };

  return (
    <div className="bg-[#12121a] border border-stone-800 rounded-xl p-4 shadow-xl space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-stone-800">
        <div className="flex items-center space-x-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isCompliant ? 'bg-emerald-500' : 'bg-rose-500 animate-ping'
            }`}
          />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Regulatory Red-Flag Checker ({label.country})
          </h4>
        </div>
        <span
          className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
            score >= 90
              ? 'bg-emerald-500/20 text-emerald-300'
              : score >= 70
              ? 'bg-amber-500/20 text-amber-300'
              : 'bg-rose-500/20 text-rose-300'
          }`}
        >
          Score: {score}/100
        </span>
      </div>

      {/* Critical 위반 목록 */}
      {criticalErrors && criticalErrors.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-rose-400">
            <span>🚨 통관 거부 Red-Flag ({criticalErrors.length}건)</span>
          </div>
          {criticalErrors.map((crit, idx) => (
            <div
              key={idx}
              className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg text-xs space-y-1.5"
            >
              <div className="flex items-start justify-between">
                <span className="font-bold text-rose-300">{crit.title}</span>
                <span className="text-[10px] font-mono text-rose-400/80 bg-rose-900/60 px-1.5 py-0.5 rounded">
                  {crit.code}
                </span>
              </div>
              <p className="text-[11px] text-stone-300 leading-relaxed">{crit.message}</p>
              <p className="text-[10px] text-amber-300/90 font-mono">
                근거 법령: {crit.lawReference}
              </p>

              {/* Auto-Fix 버튼 */}
              <div className="pt-1.5 flex items-center justify-between border-t border-rose-900/50 mt-1">
                <span className="text-[10px] text-stone-400">해결 솔루션 제안 있음</span>
                <button
                  type="button"
                  onClick={() => handleAutoFixItem(crit)}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-semibold transition-colors flex items-center space-x-1 shadow"
                >
                  <span>⚡ 원클릭 자동 교정 (Auto-Fix)</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Warning 경고 목록 */}
      {warnings && warnings.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-400">
            <span>⚠️ 보완 권고 및 주의사항 ({warnings.length}건)</span>
          </div>
          {warnings.map((warn, idx) => (
            <div
              key={idx}
              className="p-2.5 bg-amber-950/30 border border-amber-800/50 rounded-lg text-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300">{warn.title}</span>
                <button
                  type="button"
                  onClick={() => handleAutoFixItem(warn)}
                  className="text-[10px] text-amber-400 hover:underline font-mono"
                >
                  [자동 적용]
                </button>
              </div>
              <p className="text-[11px] text-stone-300">{warn.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* 전체 통과 상태 */}
      {isCompliant && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-xs text-emerald-300 flex items-center space-x-2">
          <span className="text-lg">✅</span>
          <div>
            <p className="font-bold">현지 세관 및 식품규제 100% 통과 적합</p>
            <p className="text-[11px] text-emerald-400/80">
              {label.country} 규제 기준에 불일치하는 Red-Flag 요소가 없습니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
