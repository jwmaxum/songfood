'use client';

import React from 'react';
import { ExportCountry } from '@/types/label';

interface BlockHeaderEditorProps {
  country: ExportCountry;
  hsCode: string;
  productNameKo: string;
  productNameEn: string;
  productNameTarget: string;
  legalProductType: string;
  onChange: (field: string, value: string) => void;
}

export default function BlockHeaderEditor({
  country,
  hsCode,
  productNameKo,
  productNameEn,
  productNameTarget,
  legalProductType,
  onChange,
}: BlockHeaderEditorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-stone-800">
        <h4 className="text-xs font-bold text-[#c5a880] uppercase tracking-wider font-mono">
          Block 1: Header (기본 식별 & 관세코드)
        </h4>
        <span className="text-[11px] text-stone-400">
          통관 관세청 및 수입국 식품 분류 기준
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* HS Code */}
        <div>
          <label className="block text-xs text-stone-300 font-semibold mb-1">
            HS Code (국제 통일 상품 분류) <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={hsCode}
            onChange={(e) => onChange('hsCode', e.target.value)}
            placeholder="예: 1902.20-1000"
            className="w-full px-3 py-2 bg-stone-900 border border-stone-800 focus:border-[#c5a880] rounded text-xs text-white focus:outline-none font-mono"
          />
          <p className="text-[10px] text-stone-500 mt-1">
            냉동만두: 1902.20 / K-소스: 2103.90 / 김치: 2005.99
          </p>
        </div>

        {/* 법적 식품유형 */}
        <div>
          <label className="block text-xs text-stone-300 font-semibold mb-1">
            대상국 법적 식품유형 (Legal Product Category) <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={legalProductType}
            onChange={(e) => onChange('legalProductType', e.target.value)}
            placeholder="예: Frozen Dumplings / 速冻面米制品"
            className="w-full px-3 py-2 bg-stone-900 border border-stone-800 focus:border-[#c5a880] rounded text-xs text-white focus:outline-none"
          />
          <p className="text-[10px] text-stone-500 mt-1">
            수입국 식품공전에 등록된 공식 표준 유형 명칭을 기재하십시오.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 국문 제품명 */}
        <div>
          <label className="block text-xs text-stone-300 font-semibold mb-1">
            국문 제품명 (Original Korean)
          </label>
          <input
            type="text"
            value={productNameKo}
            onChange={(e) => onChange('productNameKo', e.target.value)}
            placeholder="예: 송영민푸드 수제 왕교자만두"
            className="w-full px-3 py-2 bg-stone-900 border border-stone-800 focus:border-[#c5a880] rounded text-xs text-white focus:outline-none"
          />
        </div>

        {/* 공식 영문 제품명 */}
        <div>
          <label className="block text-xs text-stone-300 font-semibold mb-1">
            공식 영문명 (Official English)
          </label>
          <input
            type="text"
            value={productNameEn}
            onChange={(e) => onChange('productNameEn', e.target.value)}
            placeholder="예: Premium Pork & Vegetable Dumplings"
            className="w-full px-3 py-2 bg-stone-900 border border-stone-800 focus:border-[#c5a880] rounded text-xs text-white focus:outline-none"
          />
        </div>

        {/* 대상국 공식 현지어 제품명 */}
        <div>
          <label className="block text-xs text-stone-300 font-semibold mb-1">
            대상국 공식 표기명 (Target Market Name) <span className="text-amber-400">({country})</span>
          </label>
          <input
            type="text"
            value={productNameTarget}
            onChange={(e) => onChange('productNameTarget', e.target.value)}
            placeholder={
              country === 'CN'
                ? '예: 韩式猪肉蔬菜水饺 (간체)'
                : country === 'JP'
                ? '예: 韓国風 豚肉野菜餃子 (일본어)'
                : country === 'UAE'
                ? '예: زلابية لحم نباتية كورية (아랍어/영문)'
                : '예: Korean Dumplings'
            }
            className="w-full px-3 py-2 bg-stone-900 border border-stone-800 focus:border-[#c5a880] rounded text-xs text-white focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
