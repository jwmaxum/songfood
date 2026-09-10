'use client';

import React, { useState } from 'react';
import { ExportCountry, LabelIngredient } from '@/types/label';
import {
  translateIngredient,
  batchTranslateIngredients,
  buildAllergenStatement,
  getStorageStatement,
  StorageType,
} from '@/lib/label-i18n';

interface BlockInfoPanelEditorProps {
  country: ExportCountry;
  ingredients: LabelIngredient[];
  containsAllergensStatement: string;
  mayContainStatement?: string;
  storageConditionKo: string;
  storageConditionTarget: string;
  manufacturerName: string;
  importerDistributorText: string;
  onChange: (field: string, value: any) => void;
}

const COMMON_ALLERGENS = [
  '밀 (Wheat)',
  '대두 (Soybean)',
  '우유 (Milk)',
  '계란 (Egg)',
  '땅콩 (Peanut)',
  '참깨 (Sesame)',
  '돼지고기 (Pork)',
  '소고기 (Beef)',
  '닭고기 (Chicken)',
  '새우 (Shrimp)',
  '게 (Crab)',
  '오징어 (Squid)',
  '고등어 (Mackerel)',
  '아황산류 (Sulfites)',
  '호두 (Walnut)'
];

export default function BlockInfoPanelEditor({
  country,
  ingredients,
  containsAllergensStatement,
  mayContainStatement,
  storageConditionKo,
  storageConditionTarget,
  manufacturerName,
  importerDistributorText,
  onChange,
}: BlockInfoPanelEditorProps) {
  const [bannedAlerts, setBannedAlerts] = useState<string[]>([]);
  const [translateNotice, setTranslateNotice] = useState<string | null>(null);

  // 원재료 추가
  const handleAddIngredient = () => {
    const nextOrder = ingredients.length + 1;
    const newIng: LabelIngredient = {
      ingredientNameKo: '',
      ingredientNameTarget: '',
      ratio: 0,
      orderIndex: nextOrder,
      isAllergen: false,
    };
    onChange('ingredients', [...ingredients, newIng]);
  };

  // 원재료 삭제
  const handleRemoveIngredient = (index: number) => {
    const filtered = ingredients.filter((_, i) => i !== index);
    onChange('ingredients', filtered);
  };

  // 원재료 수정
  const handleUpdateIngredient = (index: number, field: keyof LabelIngredient, value: any) => {
    const updated = ingredients.map((ing, i) => {
      if (i === index) {
        return { ...ing, [field]: value };
      }
      return ing;
    });
    onChange('ingredients', updated);
  };

  // 원재료 배합비 내림차순 자동 정렬 (전 세계 공통 규정: 중량 순서)
  const handleSortIngredients = () => {
    const sorted = [...ingredients].sort((a, b) => (b.ratio || 0) - (a.ratio || 0));
    const reindexed = sorted.map((item, idx) => ({ ...item, orderIndex: idx + 1 }));
    onChange('ingredients', reindexed);
  };

  // 🌍 5개국 표준 용어 자동 치환 및 알레르겐/보관법 동기화
  const handleAutoTranslateAll = () => {
    const convertedIngredients = ingredients.map((item) => {
      const res = translateIngredient(item.ingredientNameKo || '', country);
      return {
        ...item,
        ingredientNameTarget: res.translatedText,
        isAllergen: item.isAllergen || res.isAllergenInTarget,
      };
    });

    onChange('ingredients', convertedIngredients);

    // 대상국 번역 및 금지성분/알레르겐 자동 감지
    const batchRes = batchTranslateIngredients(
      ingredients.map((item) => ({
        name: item.ingredientNameKo || '',
        percentage: item.ratio,
        isAllergen: item.isAllergen,
      })),
      country
    );

    // 금지 성분 확인
    if (batchRes.bannedIngredients.length > 0) {
      const msgs = batchRes.bannedIngredients.map(
        (b) => `🚨 [${country} 통관 불가] "${b.originalKo}": ${b.bannedReason || '해당 국가 수입 금지 원료'}`
      );
      setBannedAlerts(msgs);
    } else {
      setBannedAlerts([]);
    }

    // 알레르겐 문구 자동 생성
    if (batchRes.detectedAllergens.length > 0 && !containsAllergensStatement) {
      const { fullBlock } = buildAllergenStatement(batchRes.detectedAllergens, [], country);
      onChange('containsAllergensStatement', fullBlock);
    }

    // 기본 보관법 자동 채우기 (비어있을 시)
    if (!storageConditionTarget) {
      const defaultStorage = getStorageStatement('frozen', country);
      onChange('storageConditionTarget', defaultStorage);
    }

    setTranslateNotice(
      `✓ 총 ${ingredients.length}개 중 ${ingredients.length - batchRes.untranslatedCount}개 성분이 ${country} 표준 용어로 치환되었습니다.`
    );
    setTimeout(() => setTranslateNotice(null), 5000);
  };

  // 보관 방법 원클릭 스왑
  const handleQuickStorageSwap = (type: StorageType) => {
    const text = getStorageStatement(type, country);
    onChange('storageConditionTarget', text);
  };

  // 9대 알레르겐 원클릭 반영
  const handleToggleAllergenTag = (allergenName: string) => {
    let current = containsAllergensStatement || '';
    if (current.includes(allergenName)) {
      current = current.replace(new RegExp(`${allergenName}[,\\s]*`, 'g'), '').trim();
    } else {
      current = current ? `${current}, ${allergenName}` : allergenName;
    }
    onChange('containsAllergensStatement', current);
  };

  // 배합비 합계
  const totalRatio = ingredients.reduce((sum, item) => sum + (Number(item.ratio) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-stone-800">
        <div>
          <h4 className="text-xs font-bold text-[#c5a880] uppercase tracking-wider font-mono">
            Block 3: Information Panel (정보표시면 & 원재료)
          </h4>
          <span className="text-[11px] text-stone-400">
            원재료 배합비(중량순 내림차순 강제), 알레르겐 고지, 보관법, 제조/수입사
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleAutoTranslateAll}
            className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="국가별 공인 사전 기반 원클릭 표준 용어 번역"
          >
            <span>🌍 5개국 표준 용어로 자동 치환</span>
          </button>
          <button
            type="button"
            onClick={handleSortIngredients}
            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-xs font-semibold flex items-center space-x-1 transition-colors"
            title="배합비율(%) 기준으로 자동 내림차순 정렬"
          >
            <span>⚡ 중량순 자동 정렬</span>
          </button>
        </div>
      </div>

      {/* 안내 메시지 및 금지 알림 */}
      {translateNotice && (
        <div className="p-2 bg-blue-950/40 border border-blue-800/60 rounded text-xs text-blue-300 flex items-center justify-between">
          <span>{translateNotice}</span>
          <button onClick={() => setTranslateNotice(null)} className="text-stone-400 hover:text-white">&times;</button>
        </div>
      )}

      {bannedAlerts.length > 0 && (
        <div className="p-2.5 bg-rose-950/40 border border-rose-800/80 rounded space-y-1">
          {bannedAlerts.map((msg, i) => (
            <p key={i} className="text-xs font-bold text-rose-300">{msg}</p>
          ))}
        </div>
      )}

      {/* 원재료 배합비 테이블 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-stone-300 font-semibold">
            원재료 및 배합비율 (Ingredients List)
          </label>
          <div className="text-xs font-mono">
            <span className="text-stone-400">배합비 합계: </span>
            <span
              className={`font-bold ${
                Math.abs(totalRatio - 100) < 0.5 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {totalRatio.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="border border-stone-800 rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-900/90 text-stone-400 text-[11px] font-mono border-b border-stone-800">
              <tr>
                <th className="p-2 w-12 text-center">순위</th>
                <th className="p-2">원재료명 (국문)</th>
                <th className="p-2">수출국 현지어 명칭</th>
                <th className="p-2 w-24">배합비(%)</th>
                <th className="p-2 w-16 text-center">알레르겐</th>
                <th className="p-2 w-12 text-center">삭제</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/80 bg-stone-950/40">
              {ingredients.map((ing, idx) => (
                <tr key={idx} className="hover:bg-stone-900/40">
                  <td className="p-2 text-center font-mono text-stone-400">{idx + 1}</td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={ing.ingredientNameKo || ''}
                      onChange={(e) => handleUpdateIngredient(idx, 'ingredientNameKo', e.target.value)}
                      placeholder="예: 돼지고기"
                      className="w-full px-2 py-1 bg-stone-900 border border-stone-800 rounded text-xs text-white focus:outline-none"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={ing.ingredientNameTarget || ''}
                      onChange={(e) => handleUpdateIngredient(idx, 'ingredientNameTarget', e.target.value)}
                      placeholder="예: Pork / 豚肉"
                      className="w-full px-2 py-1 bg-stone-900 border border-stone-800 rounded text-xs text-white focus:outline-none"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={ing.ratio || 0}
                      onChange={(e) => handleUpdateIngredient(idx, 'ratio', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-stone-900 border border-stone-800 rounded text-xs text-white focus:outline-none font-mono"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <input
                      type="checkbox"
                      checked={ing.isAllergen || false}
                      onChange={(e) => handleUpdateIngredient(idx, 'isAllergen', e.target.checked)}
                      className="rounded border-stone-700 text-[#c5a880] focus:ring-0"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredient(idx)}
                      className="text-stone-500 hover:text-rose-400 text-sm font-bold"
                    >
                      &times;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={handleAddIngredient}
          className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-stone-300 border border-dashed border-stone-700 rounded-lg text-xs font-semibold transition-colors"
        >
          + 원재료 항목 추가
        </button>
      </div>

      {/* 알레르겐 안내 문구 */}
      <div className="space-y-2">
        <label className="block text-xs text-stone-300 font-semibold">
          알레르겐 의무 고지 (Contains Allergens Statement)
        </label>
        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
          {COMMON_ALLERGENS.map((alg) => (
            <button
              type="button"
              key={alg}
              onClick={() => handleToggleAllergenTag(alg.split(' ')[0])}
              className="px-2 py-0.5 bg-stone-900 hover:bg-stone-800 text-[11px] text-stone-300 rounded border border-stone-800 transition-colors"
            >
              +{alg}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={containsAllergensStatement || ''}
          onChange={(e) => onChange('containsAllergensStatement', e.target.value)}
          placeholder="예: CONTAINS: WHEAT, SOYBEAN, PORK. (참깨 Sesame 2023 필수)"
          className="w-full px-3 py-2 bg-stone-900 border border-stone-800 focus:border-[#c5a880] rounded text-xs text-white focus:outline-none"
        />
        {country === 'US' && !containsAllergensStatement && (
          <p className="text-[10px] text-rose-400 mt-1 font-semibold">
            🚨 미 FDA FALCPA 규정 위반: 9대 알레르겐 함유 시 'CONTAINS:' 박스는 법적 강제 규정입니다.
          </p>
        )}
      </div>

      {/* 보관 방법 & 제조원/수입자 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-stone-300 font-semibold">
              보관 방법 (Storage Conditions - Target)
            </label>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => handleQuickStorageSwap('frozen')}
                className="px-1.5 py-0.5 bg-sky-950/50 hover:bg-sky-900/60 text-[10px] text-sky-300 border border-sky-800/60 rounded"
                title="냉동 보관 법정 문구 자동 입력"
              >
                ❄️ 냉동
              </button>
              <button
                type="button"
                onClick={() => handleQuickStorageSwap('refrigerated')}
                className="px-1.5 py-0.5 bg-emerald-950/50 hover:bg-emerald-900/60 text-[10px] text-emerald-300 border border-emerald-800/60 rounded"
                title="냉장 보관 법정 문구 자동 입력"
              >
                🧊 냉장
              </button>
              <button
                type="button"
                onClick={() => handleQuickStorageSwap('ambient')}
                className="px-1.5 py-0.5 bg-amber-950/50 hover:bg-amber-900/60 text-[10px] text-amber-300 border border-amber-800/60 rounded"
                title="실온 보관 법정 문구 자동 입력"
              >
                ☀️ 실온
              </button>
            </div>
          </div>
          <input
            type="text"
            value={storageConditionTarget || ''}
            onChange={(e) => onChange('storageConditionTarget', e.target.value)}
            placeholder="예: Keep Frozen At or Below -18°C (-0.4°F)"
            className="w-full px-3 py-2 bg-stone-900 border border-stone-800 focus:border-[#c5a880] rounded text-xs text-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs text-stone-300 font-semibold mb-1">
            제조원 (Manufacturer)
          </label>
          <input
            type="text"
            value={manufacturerName || ''}
            onChange={(e) => onChange('manufacturerName', e.target.value)}
            placeholder="예: Songyoungmin Food Co., Ltd. (Korea)"
            className="w-full px-3 py-2 bg-stone-900 border border-stone-800 focus:border-[#c5a880] rounded text-xs text-white focus:outline-none"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-stone-300 font-semibold">
            수입원 / 유통사 (Importer & Distributor)
          </label>
          <button
            type="button"
            onClick={() => onChange('importerDistributorText', '[Buyer to fill in destination country]')}
            className="text-[10px] text-amber-400 hover:underline"
          >
            기본 템플릿 채우기 (Buyer to Fill)
          </button>
        </div>
        <input
          type="text"
          value={importerDistributorText || ''}
          onChange={(e) => onChange('importerDistributorText', e.target.value)}
          placeholder="예: Imported by: [US Buyer Company Name, Address, City, State, ZIP]"
          className="w-full px-3 py-2 bg-stone-900 border border-stone-800 focus:border-[#c5a880] rounded text-xs text-white focus:outline-none"
        />
      </div>
    </div>
  );
}
