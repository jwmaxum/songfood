'use client';

import React, { useMemo } from 'react';
import { ExportCountry, BarcodeType } from '@/types/label';
import { validateEan13, validateUpcA } from '@/lib/label-compliance/engines/barcode-engine';
import RecyclingSymbol from '@/components/labels/recycling-symbols';

interface BlockBarcodeEditorProps {
  country: ExportCountry;
  barcodeType: BarcodeType;
  barcodeNumber: string;
  recyclingMarks: string[];
  registrationNumbers: {
    fdaFacilityNo?: string;
    gaccRegNo?: string;
    halalCertNo?: string;
    euApprovalNo?: string;
  };
  onChange: (field: string, value: any) => void;
}

const RECYCLING_OPTIONS: { id: string; label: string; country: string; subText: string }[] = [
  { id: 'KR_CAN_RECYCLE', label: '한국 분리배출', country: 'KR', subText: '비닐류/플라스틱' },
  { id: 'JP_PLA_MARK', label: 'プラ 플라스틱 식별 마크', country: 'JP', subText: '일본 용기포장리사이클법 의무' },
  { id: 'JP_PAPER_MARK', label: '紙 종이 식별 마크', country: 'JP', subText: '일본 지제용기포장 의무' },
  { id: 'EU_GREEN_DOT', label: 'EU Der Grüne Punkt', country: 'EU', subText: '독일 VerpackG 포장재법' },
  { id: 'EU_TRIMAN_LOGO', label: '프랑스 Triman 로고', country: 'EU', subText: 'AGEC법률 Info-tri 의무' },
  { id: 'US_HOW2RECYCLE', label: '미국 How2Recycle', country: 'US', subText: 'SPC 리테일 표준 마크' },
];

export default function BlockBarcodeEditor({
  country,
  barcodeType,
  barcodeNumber,
  recyclingMarks,
  registrationNumbers,
  onChange,
}: BlockBarcodeEditorProps) {
  // 실시간 체크디지트 검증
  const checkDigitAudit = useMemo(() => {
    const raw = (barcodeNumber || '').trim().replace(/[\s-]/g, '');
    if (!raw) return null;

    if (barcodeType === 'UPC-A' || (country === 'US' && raw.length === 12)) {
      if (raw.length === 12) {
        return { type: 'UPC-A', ...validateUpcA(raw) };
      }
    }
    if (raw.length === 13) {
      return { type: 'EAN-13', ...validateEan13(raw) };
    }
    return null;
  }, [barcodeNumber, barcodeType, country]);

  const handleToggleRecycle = (id: string) => {
    const updated = recyclingMarks.includes(id)
      ? recyclingMarks.filter((m) => m !== id)
      : [...recyclingMarks, id];
    onChange('recyclingMarks', updated);
  };

  const handleUpdateRegNo = (key: string, val: string) => {
    onChange('registrationNumbers', {
      ...registrationNumbers,
      [key]: val,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-stone-800">
        <div>
          <h4 className="text-xs font-bold text-[#c5a880] uppercase tracking-wider font-mono">
            Block 6: Barcode & Marking (GS1 바코드 & 법적 등록번호)
          </h4>
          <span className="text-[11px] text-stone-400">
            유통 POS 스캔용 GS1 표준 바코드 및 통관 인허가 공장등록번호
          </span>
        </div>
      </div>

      {/* 바코드 설정 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-stone-300 font-semibold mb-1">
            바코드 표준 유형 (Barcode Type) <span className="text-rose-400">*</span>
          </label>
          <select
            value={barcodeType}
            onChange={(e) => onChange('barcodeType', e.target.value as BarcodeType)}
            className="w-full px-3 py-2 bg-stone-900 border border-stone-800 focus:border-[#c5a880] rounded text-xs text-white focus:outline-none font-mono"
          >
            <option value="EAN-13">EAN-13 (글로벌 13자리, 한국 880 prefix)</option>
            <option value="UPC-A">UPC-A (미국/북미 12자리 유통 표준)</option>
            <option value="GS1-128">GS1-128 (물류 박스 및 컨테이너용)</option>
            <option value="QR">QR Code (디지털 스마트 라벨)</option>
          </select>
          {country === 'US' && barcodeType !== 'UPC-A' && (
            <p className="text-[10px] text-amber-400 mt-1">
              ℹ️ 미국 대형 유통체인(Walmart, Costco, Kroger)은 UPC-A 12자리 바코드를 기본 요구합니다.
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs text-stone-300 font-semibold">
              바코드 번호 (GTIN / Barcode Number) <span className="text-rose-400">*</span>
            </label>
            {checkDigitAudit && (
              <span className={`text-[10px] font-mono font-bold ${checkDigitAudit.isValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                {checkDigitAudit.isValid ? '✓ Modulo-10 검증 통과' : '🚨 체크디지트 불일치'}
              </span>
            )}
          </div>
          <input
            type="text"
            value={barcodeNumber || ''}
            onChange={(e) => onChange('barcodeNumber', e.target.value)}
            placeholder={barcodeType === 'UPC-A' ? '예: 850012345678' : '예: 8809123456789'}
            className={`w-full px-3 py-2 bg-stone-900 border rounded text-xs text-white focus:outline-none font-mono ${
              checkDigitAudit && !checkDigitAudit.isValid ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-stone-800 focus:border-[#c5a880]'
            }`}
          />
          {checkDigitAudit && !checkDigitAudit.isValid && (
            <p className="text-[10px] text-rose-400 mt-1">
              마지막 검증 번호 불일치: 입력값 {checkDigitAudit.actualCheckDigit} ➔ 올바른 체크디지트: <strong className="text-emerald-400">{checkDigitAudit.expectedCheckDigit}</strong>
            </p>
          )}
        </div>
      </div>

      {/* 수입국 관할 등록 번호 */}
      <div className="bg-stone-900/60 p-3 rounded-lg border border-stone-800 space-y-3">
        <h5 className="text-xs font-semibold text-stone-300">
          🏛️ 수출국별 법정 해외제조시설 등록번호 (Regulatory Registration)
        </h5>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {country === 'US' && (
            <div>
              <label className="block text-stone-400 mb-1">
                미 FDA 해외시설 등록번호 (FFRN 11자리) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={registrationNumbers?.fdaFacilityNo || ''}
                onChange={(e) => handleUpdateRegNo('fdaFacilityNo', e.target.value)}
                placeholder="예: 12345678901"
                className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-700 rounded font-mono text-white"
              />
            </div>
          )}

          {country === 'CN' && (
            <div>
              <label className="block text-stone-400 mb-1">
                중국 해관총서 GACC 등록번호 (18자리) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={registrationNumbers?.gaccRegNo || ''}
                onChange={(e) => handleUpdateRegNo('gaccRegNo', e.target.value)}
                placeholder="예: CKOR24012301010001"
                className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-700 rounded font-mono text-white"
              />
            </div>
          )}

          {country === 'UAE' && (
            <div>
              <label className="block text-stone-400 mb-1">
                MoIAT / ESMA 공인 할랄 인증 번호 (Halal Cert No)
              </label>
              <input
                type="text"
                value={registrationNumbers?.halalCertNo || ''}
                onChange={(e) => handleUpdateRegNo('halalCertNo', e.target.value)}
                placeholder="예: HALAL-KMF-2026-0891"
                className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-700 rounded font-mono text-white"
              />
            </div>
          )}

          {country === 'EU' && (
            <div>
              <label className="block text-stone-400 mb-1">
                EU TRACES 수입 인허가 식별 번호 (Approval No)
              </label>
              <input
                type="text"
                value={registrationNumbers?.euApprovalNo || ''}
                onChange={(e) => handleUpdateRegNo('euApprovalNo', e.target.value)}
                placeholder="예: EU-KOR-PLANT-092"
                className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-700 rounded font-mono text-white"
              />
            </div>
          )}

          {country === 'JP' && (
            <div>
              <label className="block text-stone-400 mb-1">
                후생노동성(MHLW) 식품등수입신고필증 참조 번호
              </label>
              <input
                type="text"
                value={registrationNumbers?.fdaFacilityNo || ''}
                onChange={(e) => handleUpdateRegNo('fdaFacilityNo', e.target.value)}
                placeholder="예: MHLW-IMP-2026-JP01"
                className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-700 rounded font-mono text-white"
              />
            </div>
          )}
        </div>
      </div>

      {/* 분리배출 재활용 심볼 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs text-stone-300 font-semibold">
            포장재 분리배출 재활용 심볼 (Recycling Marks)
          </label>
          <span className="text-[10px] text-stone-400 font-mono">수입국 환경법 규정</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {RECYCLING_OPTIONS.map((mark) => {
            const isChecked = recyclingMarks.includes(mark.id);
            return (
              <label
                key={mark.id}
                onClick={() => handleToggleRecycle(mark.id)}
                className={`cursor-pointer p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all select-none ${
                  isChecked
                    ? 'bg-[#c5a880]/15 border-[#c5a880] text-amber-200 font-semibold'
                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:bg-stone-850'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="rounded border-stone-700 text-[#c5a880] focus:ring-0"
                  />
                  <div>
                    <div className="font-bold text-white text-xs">{mark.label}</div>
                    <div className="text-[10px] text-stone-500">{mark.subText}</div>
                  </div>
                </div>

                {/* Vector Symbol Preview */}
                <div className="w-8 h-8 rounded bg-stone-950 p-1 flex items-center justify-center border border-stone-800 text-stone-300 shrink-0">
                  <RecyclingSymbol symbolId={mark.id} size={24} />
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
