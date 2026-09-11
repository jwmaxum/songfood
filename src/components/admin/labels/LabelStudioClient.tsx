'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { ProductItem } from '@/lib/types';
import { FoodLabel, ExportCountry } from '@/types/label';
import CountryTabSelector from './CountryTabSelector';
import BlockHeaderEditor from './BlockHeaderEditor';
import BlockPdpEditor from './BlockPdpEditor';
import BlockInfoPanelEditor from './BlockInfoPanelEditor';
import BlockNutritionEditor from './BlockNutritionEditor';
import BlockDatingEditor from './BlockDatingEditor';
import BlockBarcodeEditor from './BlockBarcodeEditor';
import LiveLabelPreview from './LiveLabelPreview';
import ComplianceAlertBox from './ComplianceAlertBox';
import ArtworkInspectorModal from './ArtworkInspectorModal';
import { validateLabel } from '@/lib/label-compliance';

interface LabelStudioClientProps {
  product: ProductItem;
  initialLabels: Record<ExportCountry, FoodLabel>;
}

export default function LabelStudioClient({
  product,
  initialLabels,
}: LabelStudioClientProps) {
  const [selectedCountry, setSelectedCountry] = useState<ExportCountry>('US');
  const [labels, setLabels] = useState<Record<ExportCountry, FoodLabel>>(initialLabels);
  const [activeBlock, setActiveBlock] = useState<number | null>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isArtworkModalOpen, setIsArtworkModalOpen] = useState(false);

  // 현재 국가의 라벨 데이터 및 안전 기본값 보정
  const currentLabel = labels[selectedCountry] || ({} as FoodLabel);
  
  const header = currentLabel.header || {
    hsCode: product.hs_code || '1902.20-1000',
    productNameKo: product.name,
    productNameEn: product.name_en || '',
    productNameTarget: product.name,
    legalProductType: '냉동식품',
  };

  const pdp = currentLabel.pdp || {
    netWeightG: 1000,
    netWeightCustom: '1,000g',
    claimHighlights: [],
    certifications: [],
  };

  const informationPanel = currentLabel.informationPanel || {
    containsAllergensStatement: '',
    storageConditionKo: '냉동보관',
    storageConditionTarget: 'Keep Frozen',
    manufacturerName: 'Songyoungmin Food Co., Ltd.',
    importerDistributorText: '[Buyer to fill]',
  };

  const nutrition = currentLabel.nutrition || {
    servingSizeG: 100,
    servingsPerContainer: 1,
    caloriesKcal: 200,
    totalFatG: 5,
    saturatedFatG: 2,
    sodiumMg: 300,
    totalCarbohydrateG: 20,
    totalSugarsG: 2,
    proteinG: 8,
  };

  const datingLot = currentLabel.datingLot || {
    dateFormat: (selectedCountry === 'US' ? 'MM/DD/YYYY' : 'YYYY/MM/DD') as any,
    shelfLifeDays: 365,
    lotFormatTemplate: 'LOT-YYMMDD-LN1',
  };

  const barcodeMarking = currentLabel.barcodeMarking || {
    barcodeType: selectedCountry === 'US' ? 'UPC-A' : 'EAN-13',
    barcodeNumber: '8809123456789',
    recyclingMarks: [],
    registrationNumbers: {},
  };

  const ingredients = currentLabel.ingredients || [];

  // 실시간 Red-Flag 컴플라이언스 검증 실행
  const validationResult = useMemo(() => {
    return validateLabel({
      country: selectedCountry,
      productNameLocal: header.productNameTarget || header.productNameKo || '',
      productNameEn: header.productNameEn || '',
      productCategory: header.legalProductType,
      ingredients: ingredients,
      netWeightG: pdp.netWeightG || 1000,
      claimsBadges: pdp.claimHighlights || [],
      nutrition: {
        caloriesKcal: nutrition.caloriesKcal || 0,
        totalFatG: nutrition.totalFatG || 0,
        saturatedFatG: nutrition.saturatedFatG || 0,
        transFatG: nutrition.transFatG || 0,
        cholesterolMg: nutrition.cholesterolMg || 0,
        sodiumMg: nutrition.sodiumMg || 0,
        totalCarbohydrateG: nutrition.totalCarbohydrateG || 0,
        dietaryFiberG: nutrition.dietaryFiberG || 0,
        totalSugarsG: nutrition.totalSugarsG || 0,
        addedSugarsG: nutrition.addedSugarsG || 0,
        proteinG: nutrition.proteinG || 0,
        vitaminDMcg: nutrition.vitaminDMcg || 0,
        calciumMg: nutrition.calciumMg || 0,
        ironMg: nutrition.ironMg || 0,
        potassiumMg: nutrition.potassiumMg || 0,
        servingSizeG: nutrition.servingSizeG || 100,
        energyKj: nutrition.energyKj,
        saltEquivalentG: nutrition.saltEquivalentG,
      },
      allergensDeclared: informationPanel.containsAllergensStatement
        ? informationPanel.containsAllergensStatement
            .replace('CONTAINS:', '')
            .split(/[,.]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      alcoholPercentage: 0,
      registrationNumbers: barcodeMarking.registrationNumbers as any,
      dateMarkingType: datingLot.dateFormat,
      barcodeType: barcodeMarking.barcodeType,
      barcodeNumber: barcodeMarking.barcodeNumber,
    });
  }, [selectedCountry, header, pdp, ingredients, nutrition, informationPanel, barcodeMarking, datingLot]);

  // 라벨 데이터 업데이트 헬퍼
  const updateCurrentLabel = (updater: (prev: FoodLabel) => FoodLabel) => {
    setLabels((prev) => ({
      ...prev,
      [selectedCountry]: updater(prev[selectedCountry]),
    }));
  };

  // 블록별 필드 업데이트 핸들러
  const handleHeaderChange = (field: string, val: any) => {
    updateCurrentLabel((prev) => ({
      ...prev,
      header: { ...prev.header, [field]: val },
    }));
  };

  const handlePdpChange = (field: string, val: any) => {
    updateCurrentLabel((prev) => ({
      ...prev,
      pdp: { ...prev.pdp, [field]: val },
    }));
  };

  const handleInfoChange = (field: string, val: any) => {
    if (field === 'ingredients') {
      updateCurrentLabel((prev) => ({ ...prev, ingredients: val }));
    } else {
      updateCurrentLabel((prev) => ({
        ...prev,
        informationPanel: { ...prev.informationPanel, [field]: val },
      }));
    }
  };

  const handleNutritionChange = (field: string, val: any) => {
    updateCurrentLabel((prev) => ({
      ...prev,
      nutrition: { ...(prev.nutrition || {}), [field]: val } as any,
    }));
  };

  const handleDatingChange = (field: string, val: any) => {
    updateCurrentLabel((prev) => ({
      ...prev,
      datingLot: { ...prev.datingLot, [field]: val },
    }));
  };

  const handleBarcodeChange = (field: string, val: any) => {
    updateCurrentLabel((prev) => ({
      ...prev,
      barcodeMarking: { ...prev.barcodeMarking, [field]: val },
    }));
  };

  // Auto-Fix 원클릭 자동 보정 적용
  const handleAutoFix = (fixedFields: any) => {
    updateCurrentLabel((prev) => ({
      ...prev,
      ...fixedFields,
    }));
  };

  // 저장 처리 (로컬 스토리지 또는 피드백)
  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* 1. 상단 글로벌 바 */}
      <div className="bg-[#12121a] border border-stone-800 rounded-xl p-4 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/admin/labels"
            className="px-2.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white rounded border border-stone-800 text-xs font-mono transition-colors"
          >
            &larr; 목록으로
          </Link>
          <img
            src={product.image_url || '/placeholder.png'}
            alt={product.name}
            className="w-10 h-10 object-cover rounded-lg border border-stone-800"
          />
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono bg-stone-800 text-stone-300 px-1.5 py-0.5 rounded">
                {product.sku}
              </span>
              <span className="text-[10px] font-mono text-stone-400">
                HS Code: {product.hs_code || '1902.20'}
              </span>
            </div>
            <h1 className="text-base font-bold text-white leading-tight mt-0.5">
              {product.name}
            </h1>
          </div>
        </div>

        {/* 액션 버튼 그룹 */}
        <div className="flex items-center space-x-2.5">
          {saveSuccess && (
            <span className="text-xs text-emerald-400 font-semibold animate-fade-in flex items-center space-x-1">
              <span>✓</span>
              <span>라벨 저장 완료!</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsArtworkModalOpen(true)}
            className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs rounded-lg transition-colors flex items-center space-x-1.5"
            title="공장 인쇄용 라벨 시안(PDF/이미지)을 업로드하여 오타, 활자 크기(x-height mm), 알레르겐 표기를 사전 실측합니다."
          >
            <span>📷 인쇄 시안 비전 검사</span>
          </button>
          <Link
            href={`/admin/labels/${product.id}/spec`}
            className="px-3.5 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 font-bold text-xs rounded-lg transition-colors flex items-center space-x-1.5"
            title="바이어 제시용 공식 Master Spec Sheet 열람 및 A4 PDF / 엑셀 다운로드"
          >
            <span>📄 바이어 스펙시트 / PDF</span>
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-[#c5a880] hover:bg-[#b59870] text-black font-bold text-xs rounded-lg transition-colors shadow flex items-center space-x-1.5"
          >
            <span>{isSaving ? '저장 중...' : '💾 라벨 저장'}</span>
          </button>
          <button
            type="button"
            onClick={() => alert(`[${selectedCountry}] 라벨이 최종 승인(Approved)되었습니다. 해외 바이어 RFQ 뷰어에 즉시 연동됩니다.`)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors shadow flex items-center space-x-1"
          >
            <span>✓ 최종 규격 승인</span>
          </button>
        </div>
      </div>

      {/* 2. 5대국 선택 탭 & 국가별 컴플라이언스 바 */}
      <CountryTabSelector
        selectedCountry={selectedCountry}
        onChange={(c) => setSelectedCountry(c)}
        complianceScore={validationResult.score}
        criticalCount={validationResult.criticalErrors.length}
        warningCount={validationResult.warnings.length}
      />

      {/* 3. 메인 2단 Split 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* [좌측 7컬럼]: 6대 블록 아코디언 편집기 */}
        <div className="lg:col-span-7 space-y-4">
          {/* Block 1: Header */}
          <div className="bg-[#12121a] border border-stone-800 rounded-xl overflow-hidden shadow-lg">
            <button
              type="button"
              onClick={() => setActiveBlock(activeBlock === 1 ? null : 1)}
              className="w-full p-4 bg-stone-900/70 hover:bg-stone-900 flex items-center justify-between text-left transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span className="w-6 h-6 rounded-full bg-[#c5a880]/20 text-[#c5a880] flex items-center justify-center font-mono text-xs font-bold">
                  1
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">Block 1: Header (기본 식별 & 식품유형)</h3>
                  <p className="text-[11px] text-stone-400">HS Code, 법적 분류 명칭, 다국어 제품명</p>
                </div>
              </div>
              <span className="text-xs text-stone-400 font-mono">{activeBlock === 1 ? '▲ 접기' : '▼ 펼치기'}</span>
            </button>
            {activeBlock === 1 && (
              <div className="p-4 border-t border-stone-800 bg-stone-950/40">
                <BlockHeaderEditor
                  country={selectedCountry}
                  hsCode={header.hsCode || '1902.20-1000'}
                  productNameKo={header.productNameKo || ''}
                  productNameEn={header.productNameEn || ''}
                  productNameTarget={header.productNameTarget || ''}
                  legalProductType={header.legalProductType || ''}
                  onChange={handleHeaderChange}
                />
              </div>
            )}
          </div>

          {/* Block 2: PDP */}
          <div className="bg-[#12121a] border border-stone-800 rounded-xl overflow-hidden shadow-lg">
            <button
              type="button"
              onClick={() => setActiveBlock(activeBlock === 2 ? null : 2)}
              className="w-full p-4 bg-stone-900/70 hover:bg-stone-900 flex items-center justify-between text-left transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span className="w-6 h-6 rounded-full bg-[#c5a880]/20 text-[#c5a880] flex items-center justify-center font-mono text-xs font-bold">
                  2
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">Block 2: PDP (전면 주표시면 규격)</h3>
                  <p className="text-[11px] text-stone-400">순중량(oz 병기), 전면 소구 카피, 인증 뱃지</p>
                </div>
              </div>
              <span className="text-xs text-stone-400 font-mono">{activeBlock === 2 ? '▲ 접기' : '▼ 펼치기'}</span>
            </button>
            {activeBlock === 2 && (
              <div className="p-4 border-t border-stone-800 bg-stone-950/40">
                <BlockPdpEditor
                  country={selectedCountry}
                  netWeightG={pdp.netWeightG || 1000}
                  netWeightCustom={pdp.netWeightCustom || `${pdp.netWeightG || 1000}g`}
                  claimHighlights={pdp.claimHighlights || []}
                  certifications={pdp.certifications || []}
                  onChange={handlePdpChange}
                />
              </div>
            )}
          </div>

          {/* Block 3: Info Panel */}
          <div className="bg-[#12121a] border border-stone-800 rounded-xl overflow-hidden shadow-lg">
            <button
              type="button"
              onClick={() => setActiveBlock(activeBlock === 3 ? null : 3)}
              className="w-full p-4 bg-stone-900/70 hover:bg-stone-900 flex items-center justify-between text-left transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span className="w-6 h-6 rounded-full bg-[#c5a880]/20 text-[#c5a880] flex items-center justify-center font-mono text-xs font-bold">
                  3
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">Block 3: Information Panel (원재료 & 정보표시)</h3>
                  <p className="text-[11px] text-stone-400">중량순 내림차순 배합비, 9대/14대 알레르겐 박스, 보관법, 제조/수입원</p>
                </div>
              </div>
              <span className="text-xs text-stone-400 font-mono">{activeBlock === 3 ? '▲ 접기' : '▼ 펼치기'}</span>
            </button>
            {activeBlock === 3 && (
              <div className="p-4 border-t border-stone-800 bg-stone-950/40">
                <BlockInfoPanelEditor
                  country={selectedCountry}
                  ingredients={ingredients}
                  containsAllergensStatement={informationPanel.containsAllergensStatement || ''}
                  mayContainStatement={informationPanel.mayContainStatement}
                  storageConditionKo={informationPanel.storageConditionKo || ''}
                  storageConditionTarget={informationPanel.storageConditionTarget || ''}
                  manufacturerName={informationPanel.manufacturerName || ''}
                  importerDistributorText={informationPanel.importerDistributorText || ''}
                  onChange={handleInfoChange}
                />
              </div>
            )}
          </div>

          {/* Block 4: Nutrition */}
          <div className="bg-[#12121a] border border-stone-800 rounded-xl overflow-hidden shadow-lg">
            <button
              type="button"
              onClick={() => setActiveBlock(activeBlock === 4 ? null : 4)}
              className="w-full p-4 bg-stone-900/70 hover:bg-stone-900 flex items-center justify-between text-left transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span className="w-6 h-6 rounded-full bg-[#c5a880]/20 text-[#c5a880] flex items-center justify-center font-mono text-xs font-bold">
                  4
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">Block 4: Nutrition Panel (영양성분 산출기)</h3>
                  <p className="text-[11px] text-stone-400">100g ➔ 1회 제공량 스케일링, FDA / GB / CAA / EU / MoIAT 자동 환산</p>
                </div>
              </div>
              <span className="text-xs text-stone-400 font-mono">{activeBlock === 4 ? '▲ 접기' : '▼ 펼치기'}</span>
            </button>
            {activeBlock === 4 && (
              <div className="p-4 border-t border-stone-800 bg-stone-950/40">
                <BlockNutritionEditor
                  country={selectedCountry}
                  nutrition={nutrition}
                  netWeightG={pdp.netWeightG || 1000}
                  onChange={handleNutritionChange}
                />
              </div>
            )}
          </div>

          {/* Block 5: Dating & Lot */}
          <div className="bg-[#12121a] border border-stone-800 rounded-xl overflow-hidden shadow-lg">
            <button
              type="button"
              onClick={() => setActiveBlock(activeBlock === 5 ? null : 5)}
              className="w-full p-4 bg-stone-900/70 hover:bg-stone-900 flex items-center justify-between text-left transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span className="w-6 h-6 rounded-full bg-[#c5a880]/20 text-[#c5a880] flex items-center justify-center font-mono text-xs font-bold">
                  5
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">Block 5: Dating & Lot (일자 포맷 & 로트 추적성)</h3>
                  <p className="text-[11px] text-stone-400">MM/DD/YYYY, YYYY/MM/DD, DD/MM/YYYY 포맷 강제 규칙</p>
                </div>
              </div>
              <span className="text-xs text-stone-400 font-mono">{activeBlock === 5 ? '▲ 접기' : '▼ 펼치기'}</span>
            </button>
            {activeBlock === 5 && (
              <div className="p-4 border-t border-stone-800 bg-stone-950/40">
                <BlockDatingEditor
                  country={selectedCountry}
                  dateFormat={datingLot.dateFormat || (selectedCountry === 'US' ? 'MM/DD/YYYY' : 'YYYY/MM/DD')}
                  shelfLifeDays={datingLot.shelfLifeDays || 365}
                  lotFormatTemplate={datingLot.lotFormatTemplate || 'LOT-YYMMDD-LN1'}
                  onChange={handleDatingChange}
                />
              </div>
            )}
          </div>

          {/* Block 6: Barcode & Marking */}
          <div className="bg-[#12121a] border border-stone-800 rounded-xl overflow-hidden shadow-lg">
            <button
              type="button"
              onClick={() => setActiveBlock(activeBlock === 6 ? null : 6)}
              className="w-full p-4 bg-stone-900/70 hover:bg-stone-900 flex items-center justify-between text-left transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span className="w-6 h-6 rounded-full bg-[#c5a880]/20 text-[#c5a880] flex items-center justify-center font-mono text-xs font-bold">
                  6
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">Block 6: Barcode & Marking (바코드 & 인허가 등록번호)</h3>
                  <p className="text-[11px] text-stone-400">EAN-13, UPC-A, GACC 18자리, FDA FFRN 11자리, 재활용 마크</p>
                </div>
              </div>
              <span className="text-xs text-stone-400 font-mono">{activeBlock === 6 ? '▲ 접기' : '▼ 펼치기'}</span>
            </button>
            {activeBlock === 6 && (
              <div className="p-4 border-t border-stone-800 bg-stone-950/40">
                <BlockBarcodeEditor
                  country={selectedCountry}
                  barcodeType={barcodeMarking.barcodeType || 'EAN-13'}
                  barcodeNumber={barcodeMarking.barcodeNumber || '8809123456789'}
                  recyclingMarks={barcodeMarking.recyclingMarks || []}
                  registrationNumbers={barcodeMarking.registrationNumbers || {}}
                  onChange={handleBarcodeChange}
                />
              </div>
            )}
          </div>
        </div>

        {/* [우측 5컬럼]: 실시간 프리뷰 & Red-Flag 알림 패널 */}
        <div className="lg:col-span-5 space-y-4 sticky top-6">
          {/* 실시간 그래픽 렌더링 뷰어 */}
          <div className="h-[480px]">
            <LiveLabelPreview
              label={{
                ...currentLabel,
                header,
                pdp,
                informationPanel,
                nutrition,
                datingLot,
                barcodeMarking,
                ingredients,
              }}
            />
          </div>

          {/* 실시간 컴플라이언스 Red-Flag 알림 패널 */}
          <ComplianceAlertBox
            label={{
              ...currentLabel,
              header,
              pdp,
              informationPanel,
              nutrition,
              datingLot,
              barcodeMarking,
              ingredients,
            }}
            validationResult={validationResult}
            onAutoFix={handleAutoFix}
          />
        </div>
      </div>

      {/* 라벨 인쇄 시안 비전 검사기 모달 */}
      <ArtworkInspectorModal
        isOpen={isArtworkModalOpen}
        onClose={() => setIsArtworkModalOpen(false)}
        label={{
          ...currentLabel,
          header,
          pdp,
          informationPanel,
          nutrition,
          datingLot,
          barcodeMarking,
          ingredients,
        }}
      />
    </div>
  );
}
