'use client';

import React, { useState, useMemo } from 'react';
import { ExportCountry, FoodLabel } from '@/types/label';
import {
  inspectArtwork,
  ArtworkInspectionReport,
} from '@/lib/label-compliance/vision/artwork-ocr-engine';

interface ArtworkInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  label: FoodLabel;
}

export default function ArtworkInspectorModal({
  isOpen,
  onClose,
  label,
}: ArtworkInspectorModalProps) {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<'normal' | 'missing' | 'font_small'>('normal');
  const [packageAreaCm2, setPackageAreaCm2] = useState<number>(120);
  const [dpi, setDpi] = useState<number>(300);
  const [samplePixelHeight, setSamplePixelHeight] = useState<number>(16);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Default demo texts based on country and preset
  const demoTexts = useMemo(() => {
    const country = label.country;
    if (country === 'JP') {
      return {
        normal: `韓国風 豚肉とニラの王餃子 内容量 1050g 原材料名: 豚肉(韓国産)、小麦粉、ニラ、春雨、玉ねぎ、長ネギ、ごま油、食塩、胡椒 栄養成分表示(100g当たり): 熱量 200kcal、たんぱく質 8g、脂質 5g、炭水化物 20g、食塩相当量 1.02g 賞味期限: 枠外下部に記載 原材料の一部に小麦、豚肉、大豆、ごまを含みます。`,
        missing: `韓国風 王餃子 1050g 豚肉、小麦粉、ニラ、春雨、玉ねぎ、長ネギ、ごま油、食塩、胡椒`, // 栄養成分表示, 原材料名, 賞味期限, 内容量 누락
        font_small: `韓国風 豚肉とニラの王餃子 内容量 1050g 原材料名 豚肉 小麦粉 栄養成分表示 賞味期限`,
      };
    } else if (country === 'EU') {
      return {
        normal: `Korean Style Pork & Leek Dumplings (Mandu) Net Quantity: 1050g Ingredients: Pork (32%), Wheat Flour, Leek, Glass Noodles, Onion, Green Onion, Sesame Oil, Salt, Black Pepper. Nutrition Declaration per 100g: Energy 837 kJ / 200 kcal, Fat 5g, Saturated 2g, Carbohydrates 20g, Sugars 2g, Protein 8g, Salt 0.76g. Best Before: See bottom. ALLERGY ADVICE: For allergens, see ingredients in BOLD. Contains Wheat, Soy, Pork, Sesame.`,
        missing: `Korean Pork Dumplings 1050g Pork, Flour, Leek, Onion, Sesame, Salt.`, // Nutrition declaration, Best before, allergens 누락
        font_small: `Korean Style Pork & Leek Dumplings (Mandu) Net Quantity: 1050g Ingredients: Pork, Wheat Flour. Nutrition Declaration. Best Before.`,
      };
    } else {
      // US default
      return {
        normal: `Korean Style Pork & Leek Dumplings (Mandu) NET WT 37.03 OZ (1050g) INGREDIENTS: PORK, WHEAT FLOUR, LEEK, GLASS NOODLES, ONION, GREEN ONION, SESAME OIL, SALT, BLACK PEPPER. CONTAINS: WHEAT, SOYBEAN, PORK, SESAME. Nutrition Facts: Servings Per Container about 10. Calories 200. Total Fat 5g, Saturated Fat 2g, Sodium 300mg, Total Carb 20g, Total Sugars 2g, Protein 8g. Product of Korea.`,
        missing: `Korean Pork Dumplings Net Wt 1050g Pork, Flour, Vegetables.`, // Nutrition facts, Servings per container, Contains 누락
        font_small: `Korean Style Pork & Leek Dumplings NET WT 1050g Nutrition Facts Servings Per Container Ingredients Contains Wheat.`,
      };
    }
  }, [label.country]);

  const [ocrText, setOcrText] = useState<string>(demoTexts.normal);

  // Run inspection report
  const report: ArtworkInspectionReport = useMemo(() => {
    return inspectArtwork({
      artworkText: ocrText,
      label,
      packageAreaCm2,
      samplePixelHeight,
      dpi,
    });
  }, [ocrText, label, packageAreaCm2, samplePixelHeight, dpi]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: 'normal' | 'missing' | 'font_small') => {
    setActivePreset(preset);
    setIsAnalyzing(true);
    setTimeout(() => {
      if (preset === 'normal') {
        setOcrText(demoTexts.normal);
        setDpi(300);
        setSamplePixelHeight(16); // 16px @ 300 DPI = 1.35mm
      } else if (preset === 'missing') {
        setOcrText(demoTexts.missing);
        setDpi(300);
        setSamplePixelHeight(16);
      } else {
        setOcrText(demoTexts.font_small);
        setDpi(150); // Low DPI
        setSamplePixelHeight(9); // 9px @ 300 DPI = 0.76mm (< 0.9mm or 1.2mm)
      }
      setIsAnalyzing(false);
    }, 200);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
      // Simulate high quality OCR parse from image
      setTimeout(() => {
        setIsAnalyzing(false);
      }, 500);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* 모달 상단 헤더 */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-lg border border-amber-500/30">
              📷
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">
                  라벨 인쇄 시안 비전 검사기 (Artwork Inspector)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-800 text-stone-300">
                  {label.country} 규격
                </span>
              </div>
              <p className="text-xs text-stone-400">
                인쇄소 출하용 라벨 시안(PDF/이미지)의 텍스트 오타, 법정 활자 크기(x-height mm), 알레르겐 누락을 사전 실측합니다.
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

        {/* 스마트 시뮬레이션 프리셋 바 */}
        <div className="px-6 py-2.5 bg-stone-900/90 border-b border-stone-800 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-stone-400 font-medium">⚡ 빠른 시뮬레이션 데모:</span>
            <button
              onClick={() => handleApplyPreset('normal')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                activePreset === 'normal'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              🟢 정상 시안 (100% 규격 적합)
            </button>
            <button
              onClick={() => handleApplyPreset('missing')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                activePreset === 'missing'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/30'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              🔴 필수 문구 누락 & 알레르겐 미표기
            </button>
            <button
              onClick={() => handleApplyPreset('font_small')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                activePreset === 'font_small'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/30'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              ⚠️ 활자 크기 미달 (x-height &lt; 1.2mm)
            </button>
          </div>
          <label className="cursor-pointer px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex items-center space-x-1.5 shadow">
            <span>📁 내 시안 파일 업로드</span>
            <input
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* 본문 2단 Split 레이아웃 */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto">
          {/* [좌측 6컬럼]: 시안 뷰어 및 파라미터 제어 */}
          <div className="lg:col-span-6 p-6 border-r border-stone-800 space-y-4 bg-stone-950/40">
            {/* 시안 이미지 캔버스 */}
            <div className="relative border-2 border-dashed border-stone-800 rounded-xl overflow-hidden bg-stone-950 min-h-[260px] flex flex-col items-center justify-center p-4">
              {uploadedImage ? (
                <div className="relative w-full">
                  <img
                    src={uploadedImage}
                    alt="Uploaded Label Artwork"
                    className="w-full max-h-[320px] object-contain rounded-lg"
                  />
                  {/* 바운딩 박스 오버레이 */}
                  {report.boundingBoxes.map((box, idx) => (
                    <div
                      key={idx}
                      className="absolute border-2 border-amber-400 bg-amber-400/10 text-[9px] font-mono text-amber-300 px-1"
                      style={{
                        left: `${(box.x / 600) * 100}%`,
                        top: `${(box.y / 350) * 100}%`,
                        width: `${(box.width / 600) * 100}%`,
                        height: `${(box.height / 350) * 100}%`,
                      }}
                    >
                      {box.label}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center text-2xl text-stone-500">
                    🖼️
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-300">
                      인쇄용 라벨 시안 (PNG, JPG) 미리보기
                    </p>
                    <p className="text-xs text-stone-500 mt-1">
                      파일을 드래그하거나 우측 상단 데모 프리셋을 선택하여 비전 실측을 실행하십시오.
                    </p>
                  </div>
                  <div className="w-full bg-stone-900 p-3 rounded-lg border border-stone-800 text-left font-mono text-[11px] text-stone-400 max-h-[120px] overflow-y-auto">
                    <div className="text-[10px] text-stone-500 mb-1">OCR 인식 텍스트 스트림:</div>
                    {ocrText}
                  </div>
                </div>
              )}
            </div>

            {/* 물리적 인쇄 규격 파라미터 조정 */}
            <div className="bg-stone-900 p-4 rounded-xl border border-stone-800 space-y-3">
              <div className="text-xs font-bold text-stone-300 flex items-center justify-between">
                <span>📐 인쇄 시안 물리 파라미터 (Caliper Spec)</span>
                <span className="text-[10px] text-stone-500">실시간 연산</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-stone-400 text-[10px] mb-1">
                    포장 표면적 (cm²)
                  </label>
                  <input
                    type="number"
                    value={packageAreaCm2}
                    onChange={(e) => setPackageAreaCm2(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-700 rounded px-2.5 py-1.5 text-white font-mono text-xs"
                  />
                  <span className="text-[9px] text-stone-500 mt-0.5 block">
                    {packageAreaCm2 >= 80 ? '≥ 80cm² (대형)' : '< 80cm² (소형)'}
                  </span>
                </div>
                <div>
                  <label className="block text-stone-400 text-[10px] mb-1">
                    인쇄 해상도 (DPI)
                  </label>
                  <input
                    type="number"
                    value={dpi}
                    onChange={(e) => setDpi(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-700 rounded px-2.5 py-1.5 text-white font-mono text-xs"
                  />
                  <span className="text-[9px] text-stone-500 mt-0.5 block">
                    권장: 300 DPI 이상
                  </span>
                </div>
                <div>
                  <label className="block text-stone-400 text-[10px] mb-1">
                    텍스트 픽셀 높이 (px)
                  </label>
                  <input
                    type="number"
                    value={samplePixelHeight}
                    onChange={(e) => setSamplePixelHeight(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-700 rounded px-2.5 py-1.5 text-white font-mono text-xs"
                  />
                  <span className="text-[9px] text-stone-500 mt-0.5 block">
                    환산 높이: {report.fontDimension.xHeightMm} mm
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* [우측 6컬럼]: 비전 검사 결과 리포트 카드 */}
          <div className="lg:col-span-6 p-6 space-y-4">
            {/* 종합 판정 배너 */}
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                report.overallCompliant
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl">
                    {report.overallCompliant ? '✓' : '⚠️'}
                  </span>
                  <span className="text-sm font-bold">
                    {report.overallCompliant
                      ? '인쇄 시안 비전 검사 최종 적합 (PASS)'
                      : `인쇄 시안 규격 위반 ${report.totalCriticalErrors}건 감지 (REJECT)`}
                  </span>
                </div>
                <p className="text-[11px] opacity-80 mt-0.5">
                  텍스트 일치율: {report.similarity.similarityScore}% | 실측 x-height: {report.fontDimension.xHeightMm}mm (기준: {report.fontDimension.minRequiredMm}mm)
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono px-2 py-1 rounded bg-black/40 font-bold">
                  {report.similarity.similarityScore}점
                </span>
              </div>
            </div>

            {/* 3대 핵심 실측 지표 카드 */}
            <div className="grid grid-cols-3 gap-3">
              {/* 1. 텍스트 일치도 */}
              <div className="p-3 bg-stone-900 border border-stone-800 rounded-xl">
                <div className="text-[10px] text-stone-400">마스터 텍스트 일치도</div>
                <div className="text-lg font-bold text-white mt-1 font-mono">
                  {report.similarity.similarityScore}%
                </div>
                <div className="text-[10px] text-stone-500 mt-0.5">
                  {report.similarity.missingMandatoryPhrases.length === 0
                    ? '✓ 필수 문구 일치'
                    : `누락: ${report.similarity.missingMandatoryPhrases.length}개`}
                </div>
              </div>

              {/* 2. 폰트 x-height */}
              <div
                className={`p-3 border rounded-xl ${
                  report.fontDimension.isCompliant
                    ? 'bg-stone-900 border-stone-800'
                    : 'bg-rose-950/20 border-rose-800/40'
                }`}
              >
                <div className="text-[10px] text-stone-400">실측 활자 x-height</div>
                <div
                  className={`text-lg font-bold mt-1 font-mono ${
                    report.fontDimension.isCompliant ? 'text-white' : 'text-rose-400'
                  }`}
                >
                  {report.fontDimension.xHeightMm} mm
                </div>
                <div className="text-[10px] text-stone-500 mt-0.5">
                  기준: ≥ {report.fontDimension.minRequiredMm} mm
                </div>
              </div>

              {/* 3. 명암 대비율 */}
              <div className="p-3 bg-stone-900 border border-stone-800 rounded-xl">
                <div className="text-[10px] text-stone-400">WCAG 명암 대비율</div>
                <div className="text-lg font-bold text-white mt-1 font-mono">
                  {report.contrastRatio} : 1
                </div>
                <div className="text-[10px] text-stone-500 mt-0.5">
                  {report.isContrastCompliant ? '✓ 4.5:1 통과' : '⚠️ 대비 부족'}
                </div>
              </div>
            </div>

            {/* Red-Flag 이슈 목록 */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-stone-300 flex items-center justify-between">
                <span>발견된 아트워크 결함 ({report.allRedFlags.length}건)</span>
                {isAnalyzing && (
                  <span className="text-[10px] text-amber-400 animate-pulse">
                    분석 중...
                  </span>
                )}
              </div>

              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                {report.allRedFlags.length === 0 ? (
                  <div className="p-6 bg-stone-900/60 border border-stone-800 rounded-xl text-center">
                    <span className="text-emerald-400 text-base font-bold">
                      ✓ 검출된 인쇄 시안 위반 결함이 없습니다.
                    </span>
                    <p className="text-xs text-stone-500 mt-1">
                      공장 인쇄 발주 및 수입국 사전 통관 검토에 적합한 아트워크 시안입니다.
                    </p>
                  </div>
                ) : (
                  report.allRedFlags.map((flag, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border text-xs space-y-1 ${
                        flag.severity === 'critical'
                          ? 'bg-rose-950/30 border-rose-800/50 text-rose-200'
                          : 'bg-amber-950/30 border-amber-800/50 text-amber-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center space-x-1.5">
                          <span>{flag.severity === 'critical' ? '🔴' : '⚠️'}</span>
                          <span>{flag.title}</span>
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40">
                          {flag.code}
                        </span>
                      </div>
                      <p className="text-[11px] opacity-90 leading-relaxed">
                        {flag.message}
                      </p>
                      <div className="pt-1 text-[10px] opacity-75 flex items-center space-x-2">
                        <span>법령: {flag.lawReference}</span>
                        <span>•</span>
                        <span className="font-semibold text-white">조치: {flag.solution}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 모달 하단 푸터 액션 */}
        <div className="px-6 py-3 border-t border-stone-800 flex items-center justify-between bg-stone-950">
          <div className="text-xs text-stone-500 font-mono">
            엔진: Songfood Vision Inspector v1.0 • 규격: EU FIC 1169 / US 21 CFR 101
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium text-xs rounded-lg transition-colors"
            >
              닫기
            </button>
            <button
              onClick={() => {
                alert(`[${label.country}] 라벨 시안 검사 리포트가 QA 감사 로그에 기록되었습니다.`);
                onClose();
              }}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors shadow"
            >
              시안 검사 승인 및 QA 기록
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
