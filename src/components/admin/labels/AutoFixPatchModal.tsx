'use client';

import React, { useState, useMemo } from 'react';
import { FoodLabel } from '@/types/label';
import { RedFlagItem } from '@/lib/label-compliance/types';
import {
  generateAutoFixPatches,
  applyPatchesToLabel,
  LabelPatchItem,
} from '@/lib/label-compliance/engines/auto-fix-engine';

interface AutoFixPatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  label: FoodLabel;
  redFlags: RedFlagItem[];
  onApplyPatches: (updatedLabel: FoodLabel, appliedCount: number) => void;
}

export default function AutoFixPatchModal({
  isOpen,
  onClose,
  label,
  redFlags,
  onApplyPatches,
}: AutoFixPatchModalProps) {
  // Generate auto-fix patches from current red flags
  const patches: LabelPatchItem[] = useMemo(() => {
    return generateAutoFixPatches(label, redFlags);
  }, [label, redFlags]);

  const [selectedPatchIds, setSelectedPatchIds] = useState<string[]>([]);

  // Default select all patches when modal opens or patches change
  React.useEffect(() => {
    if (patches.length > 0) {
      setSelectedPatchIds(patches.map((p) => p.id));
    }
  }, [patches]);

  if (!isOpen) return null;

  const handleTogglePatch = (id: string) => {
    setSelectedPatchIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedPatchIds.length === patches.length) {
      setSelectedPatchIds([]);
    } else {
      setSelectedPatchIds(patches.map((p) => p.id));
    }
  };

  const handleExecuteApply = () => {
    const result = applyPatchesToLabel(label, patches, selectedPatchIds);
    onApplyPatches(result.patchedLabel, result.appliedCount);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* 모달 헤더 */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-lg border border-amber-500/30">
              ⚡
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">
                  원클릭 규격 자동 수정 패치 (Auto-Fix Patch Engine)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-800 text-stone-300">
                  {label.country} 라벨 전용
                </span>
              </div>
              <p className="text-xs text-stone-400">
                수입국 법규 위반 결함을 분석하여, 기계적으로 검증된 안전 패치(Diff)를 원클릭으로 일괄 자동 교정합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-2 rounded-lg hover:bg-stone-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 상단 통계 바 */}
        <div className="px-6 py-3 bg-stone-900/90 border-b border-stone-800 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-3">
            <span className="text-stone-300 font-semibold">
              생성된 자동 교정 패치: <span className="text-amber-400 font-mono font-bold">{patches.length}건</span>
            </span>
            <span className="text-stone-500">•</span>
            <span className="text-stone-400">
              선택됨: <span className="text-emerald-400 font-mono font-bold">{selectedPatchIds.length}건</span>
            </span>
          </div>
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-xs text-stone-400 hover:text-stone-200 underline"
          >
            {selectedPatchIds.length === patches.length ? '전체 선택 해제' : '전체 선택'}
          </button>
        </div>

        {/* 패치 목록 (Before vs After Diff) */}
        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
          {patches.length === 0 ? (
            <div className="p-8 text-center bg-stone-950/40 rounded-xl border border-stone-800 space-y-2">
              <span className="text-2xl">🎉</span>
              <p className="text-sm font-bold text-stone-300">
                현재 라벨에 필요한 자동 수정 패치가 없습니다.
              </p>
              <p className="text-xs text-stone-500">
                모든 자동 보정 규칙을 충족하고 있거나, 수동 검토가 필요한 복합 항목만 존재합니다.
              </p>
            </div>
          ) : (
            patches.map((patch) => {
              const isSelected = selectedPatchIds.includes(patch.id);
              return (
                <div
                  key={patch.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-stone-950/80 border-amber-500/50 shadow-lg shadow-amber-950/10'
                      : 'bg-stone-950/30 border-stone-800 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleTogglePatch(patch.id)}
                        className="mt-1 w-4 h-4 rounded border-stone-700 bg-stone-800 text-amber-500 focus:ring-amber-500"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-white">
                            {patch.title}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-800 text-stone-300">
                            {patch.redFlagCode}
                          </span>
                        </div>
                        <p className="text-xs text-stone-400 mt-0.5">
                          {patch.description}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-stone-500">
                      필드: {patch.targetField}
                    </span>
                  </div>

                  {/* Before vs After Diff 카드 */}
                  <div className="mt-3 pt-3 border-t border-stone-800/80 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Before */}
                    <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-900/40 text-rose-300">
                      <div className="text-[10px] text-rose-400 font-bold mb-1 flex items-center space-x-1">
                        <span>- 이전 값 (Current)</span>
                      </div>
                      <div className="font-mono text-[11px] break-all">
                        {Array.isArray(patch.beforeValue)
                          ? patch.beforeValue.join(', ') || '(비어있음)'
                          : String(patch.beforeValue)}
                      </div>
                    </div>

                    {/* After */}
                    <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-emerald-300">
                      <div className="text-[10px] text-emerald-400 font-bold mb-1 flex items-center space-x-1">
                        <span>+ 패치 적용 후 (Patched)</span>
                      </div>
                      <div className="font-mono text-[11px] font-bold break-all">
                        {Array.isArray(patch.afterValue)
                          ? patch.afterValue.join(', ') || '(제거됨)'
                          : String(patch.afterValue)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 모달 푸터 액션 */}
        <div className="px-6 py-4 border-t border-stone-800 flex items-center justify-between bg-stone-950">
          <div className="text-xs text-stone-500 font-mono">
            엔진: Songfood Auto-Fix Patch Generator v1.0 • 안전성: 무결점 불변 보정
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium text-xs rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleExecuteApply}
              disabled={selectedPatchIds.length === 0}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-xs rounded-lg transition-colors shadow-lg shadow-amber-950/30 flex items-center space-x-1.5"
            >
              <span>⚡ 선택한 {selectedPatchIds.length}개 패치 일괄 적용 및 승인</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
