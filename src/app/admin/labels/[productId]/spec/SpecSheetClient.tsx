'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FoodLabel, TargetCountry } from '@/types/label';
import MasterSpecSheet from '@/components/labels/spec-sheet/MasterSpecSheet';
import BuyerToFillForm, { BuyerFormData } from '@/components/labels/spec-sheet/BuyerToFillForm';
import { triggerPrintSpecSheet, downloadExcelFile } from '@/lib/export';

interface SpecSheetClientProps {
  productId: string;
  labelsMap: Record<TargetCountry, FoodLabel>;
}

const COUNTRIES: Array<{ code: TargetCountry; flag: string; name: string }> = [
  { code: 'US', flag: '🇺🇸', name: '미국 (US FDA)' },
  { code: 'CN', flag: '🇨🇳', name: '중국 (CN GACC)' },
  { code: 'JP', flag: '🇯🇵', name: '일본 (JP CAA)' },
  { code: 'EU', flag: '🇪🇺', name: '유럽 (EU FIC)' },
  { code: 'UAE', flag: '🇦🇪', name: '중동 (UAE MoIAT)' },
];

export default function SpecSheetClient({ productId, labelsMap }: SpecSheetClientProps) {
  const [selectedCountry, setSelectedCountry] = useState<TargetCountry>('US');
  const [buyerData, setBuyerData] = useState<BuyerFormData>({
    companyName: 'Pacific Rim Foods USA LLC',
    registrationNumber: 'FDA-FFR: 19827364501',
    address: '742 Evergreen Terrace, Suite 400',
    cityStateZip: 'Los Angeles, CA 90012',
    country: 'United States',
    contactPerson: 'David Miller (VP Procurement)',
    phone: '+1-213-555-0199',
    email: 'dmiller@pacificrimfoods.com',
    poNumber: 'PO-2026-US-8812',
  });

  const currentLabel = labelsMap[selectedCountry] || labelsMap.US;

  const handleBuyerChange = (field: keyof BuyerFormData, value: string) => {
    setBuyerData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePrint = () => {
    const filename = `SongYoungminFood_SpecSheet_${selectedCountry}_${productId}`;
    triggerPrintSpecSheet(filename);
  };

  const handleExcelExport = () => {
    const allLabels = Object.values(labelsMap);
    const filename = `SongYoungminFood_Export_Label_Specs_${productId}.xlsx`;
    downloadExcelFile(allLabels, filename, buyerData);
  };

  return (
    <div className="min-h-screen bg-[#0a0a10] text-white p-4 md:p-8 space-y-6">
      {/* 화면 전용 상단 네비게이션 & 액션 툴바 */}
      <div className="no-print-area max-w-[1200px] mx-auto flex flex-wrap items-center justify-between gap-4 bg-[#12121c] border border-stone-800 p-4 rounded-xl shadow-lg">
        <div className="flex items-center space-x-3">
          <Link
            href={`/admin/labels/${productId}`}
            className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 rounded text-xs font-semibold border border-stone-700 transition-colors"
          >
            ← 라벨 스튜디오로 돌아가기
          </Link>
          <div className="h-4 w-px bg-stone-800" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            📄 바이어 제시용 Master Labeling Spec Sheet ({productId})
          </h2>
        </div>

        {/* 원클릭 출력 & 엑셀 내보내기 버튼 */}
        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
          >
            <span>🖨️ A4 인쇄 / PDF 다운로드</span>
          </button>
          <button
            type="button"
            onClick={handleExcelExport}
            className="px-4 py-2 bg-[#c5a880] hover:bg-[#d6ba94] text-stone-950 rounded-lg text-xs font-bold flex items-center space-x-2 shadow-lg transition-all cursor-pointer"
          >
            <span>📊 5개국 통합 엑셀 (.xlsx) 다운로드</span>
          </button>
        </div>
      </div>

      {/* 대상국가 탭 선택기 (화면 전용) */}
      <div className="no-print-area max-w-[1200px] mx-auto flex flex-wrap gap-2">
        {COUNTRIES.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => setSelectedCountry(c.code)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
              selectedCountry === c.code
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 border border-blue-400'
                : 'bg-[#14141e] text-stone-400 hover:text-white border border-stone-800'
            }`}
          >
            <span className="text-base">{c.flag}</span>
            <span>{c.name}</span>
          </button>
        ))}
      </div>

      {/* 바이어 정보 입력 섹션 (화면 전용) */}
      <div className="max-w-[1200px] mx-auto">
        <BuyerToFillForm
          targetCountry={selectedCountry}
          data={buyerData}
          onChange={handleBuyerChange}
          onApplyPreset={(preset) => setBuyerData(preset)}
        />
      </div>

      {/* 공식 A4 스펙시트 렌더링 영역 (인쇄 시 출력 대상) */}
      <div className="max-w-[1200px] mx-auto pt-2">
        <MasterSpecSheet
          label={currentLabel}
          buyerData={buyerData}
          specDocId={`SYMF-SPEC-${productId}-${selectedCountry}`}
          revisionNo="REV 2.5 (2026.09)"
        />
      </div>
    </div>
  );
}
