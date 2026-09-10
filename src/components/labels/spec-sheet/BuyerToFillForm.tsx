'use client';

import React from 'react';
import { TargetCountry } from '@/types/label';

export interface BuyerFormData {
  companyName: string;
  registrationNumber: string;
  address: string;
  cityStateZip: string;
  country: string;
  contactPerson: string;
  phone: string;
  email: string;
  poNumber?: string;
}

interface BuyerToFillFormProps {
  targetCountry: TargetCountry;
  data: BuyerFormData;
  onChange: (field: keyof BuyerFormData, value: string) => void;
  onApplyPreset?: (buyerPreset: BuyerFormData) => void;
}

export default function BuyerToFillForm({
  targetCountry,
  data,
  onChange,
  onApplyPreset,
}: BuyerToFillFormProps) {
  // Region-specific default presets for quick demo / convenience
  const handleQuickPreset = () => {
    let preset: BuyerFormData = {
      companyName: 'Pacific Rim Foods USA LLC',
      registrationNumber: 'FDA-FFR: 19827364501',
      address: '742 Evergreen Terrace, Suite 400',
      cityStateZip: 'Los Angeles, CA 90012',
      country: 'United States',
      contactPerson: 'David Miller (VP Procurement)',
      phone: '+1-213-555-0199',
      email: 'dmiller@pacificrimfoods.com',
      poNumber: 'PO-2026-US-8812',
    };

    if (targetCountry === 'CN') {
      preset = {
        companyName: '上海高品进出口贸易有限公司 (Shanghai Gaopin Import & Export)',
        registrationNumber: '海关备案号: 310196A882',
        address: '上海市浦东新区张江高科技园区科苑路88号',
        cityStateZip: '上海市 201203',
        country: 'China',
        contactPerson: '王敏 (Wang Min, 进口总监)',
        phone: '+86-21-6888-9900',
        email: 'wangmin@gaopin-import.cn',
        poNumber: 'PO-2026-CN-3310',
      };
    } else if (targetCountry === 'JP') {
      preset = {
        companyName: '株式会社アジア食材トレーディング (Asia Food Trading Co., Ltd.)',
        registrationNumber: '輸入者記号: TYO-2026-88',
        address: '東京都港区芝浦3-15-1 田町タワー12F',
        cityStateZip: '東京都 108-0023',
        country: 'Japan',
        contactPerson: '佐藤健一 (Kenichi Sato)',
        phone: '+81-3-5432-8800',
        email: 'sato@asiafood-jp.co.jp',
        poNumber: 'PO-2026-JP-4421',
      };
    } else if (targetCountry === 'EU') {
      preset = {
        companyName: 'Euro-Asia Gourmet Distribution GmbH',
        registrationNumber: 'VAT/EORI: DE982374192',
        address: 'Hafenstraße 45, Gebäude B',
        cityStateZip: '20457 Hamburg',
        country: 'Germany',
        contactPerson: 'Dr. Michael Schmidt',
        phone: '+49-40-7654-3210',
        email: 'm.schmidt@euroasiagourmet.de',
        poNumber: 'PO-2026-EU-9920',
      };
    } else if (targetCountry === 'UAE') {
      preset = {
        companyName: 'Gulf Oasis General Trading LLC (Halal Division)',
        registrationNumber: 'MoIAT License: AE-DXB-2026-778',
        address: 'Al Quoz Industrial Area 3, Warehouse 14',
        cityStateZip: 'P.O. Box 98210, Dubai',
        country: 'United Arab Emirates',
        contactPerson: 'Tariq Al-Mansoor (Supply Chain Director)',
        phone: '+971-4-889-1122',
        email: 'tariq@gulfoasis.ae',
        poNumber: 'PO-2026-UAE-5511',
      };
    }

    if (onApplyPreset) {
      onApplyPreset(preset);
    }
  };

  return (
    <div className="bg-[#12121c] border border-stone-800 rounded-xl p-5 space-y-4 no-print-area">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-sm">🏢</span>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Buyer to Fill (수입자/유통사 세부 스펙 직접 입력)
            </h3>
          </div>
          <p className="text-xs text-stone-400 mt-0.5">
            바이어사의 정보 및 현지 통관 라이선스를 입력하면 우측 스펙시트에 실시간 즉시 반영됩니다.
          </p>
        </div>
        <button
          type="button"
          onClick={handleQuickPreset}
          className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
        >
          <span>⚡ {targetCountry} 표준 바이어 예시 자동 입력</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div>
          <label className="block text-stone-300 font-medium mb-1">
            수입사 / 유통사 명 (Importer Company Name)
          </label>
          <input
            type="text"
            value={data.companyName}
            onChange={(e) => onChange('companyName', e.target.value)}
            placeholder="예: Pacific Rim Foods USA LLC"
            className="w-full px-3 py-2 bg-stone-900 border border-stone-800 focus:border-[#c5a880] rounded text-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-stone-300 font-medium mb-1">
            현지 통관 / 시설 등록 번호 (License / Reg No)
          </label>
          <input
            type="text"
            value={data.registrationNumber}
            onChange={(e) => onChange('registrationNumber', e.target.value)}
            placeholder="예: FDA FFR, GACC No, VAT/EORI, MoIAT No"
            className="w-full px-3 py-2 bg-stone-900 border border-stone-800 focus:border-[#c5a880] rounded text-white focus:outline-none font-mono"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-stone-300 font-medium mb-1">
            사업장 주소 (Street Address)
          </label>
          <input
            type="text"
            value={data.address}
            onChange={(e) => onChange('address', e.target.value)}
            placeholder="예: 742 Evergreen Terrace, Suite 400"
            className="w-full px-3 py-2 bg-stone-900 border border-stone-800 focus:border-[#c5a880] rounded text-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-stone-300 font-medium mb-1">
            도시 / 주 / 우편번호 (City, State, Zip)
          </label>
          <input
            type="text"
            value={data.cityStateZip}
            onChange={(e) => onChange('cityStateZip', e.target.value)}
            placeholder="예: Los Angeles, CA 90012"
            className="w-full px-3 py-2 bg-stone-900 border border-stone-800 focus:border-[#c5a880] rounded text-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-stone-300 font-medium mb-1">
            수입 대상국 (Country)
          </label>
          <input
            type="text"
            value={data.country}
            onChange={(e) => onChange('country', e.target.value)}
            placeholder="예: United States"
            className="w-full px-3 py-2 bg-stone-900 border border-stone-800 focus:border-[#c5a880] rounded text-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-stone-300 font-medium mb-1">
            담당자 성명 및 직책 (Contact Person & Title)
          </label>
          <input
            type="text"
            value={data.contactPerson}
            onChange={(e) => onChange('contactPerson', e.target.value)}
            placeholder="예: David Miller (VP Procurement)"
            className="w-full px-3 py-2 bg-stone-900 border border-stone-800 focus:border-[#c5a880] rounded text-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-stone-300 font-medium mb-1">
            이메일 및 전화번호 (Email / Phone)
          </label>
          <input
            type="text"
            value={data.email}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="예: buyer@company.com / +1-213-555-0199"
            className="w-full px-3 py-2 bg-stone-900 border border-stone-800 focus:border-[#c5a880] rounded text-white focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
