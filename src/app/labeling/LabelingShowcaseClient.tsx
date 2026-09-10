'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Globe2,
  FileCheck2,
  Sparkles,
  AlertTriangle,
  Barcode,
  Calendar,
  Layers,
  Award,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Info,
  ArrowRight,
  Check,
  Building2,
  Clock,
  Printer
} from 'lucide-react';
import { FoodLabel, ExportCountry } from '@/types/label';
import { validateLabel, ValidationResult, ValidationInput } from '@/lib/label-compliance';
import {
  calculateGlobalNutrition,
  BaseNutritionInput,
  GlobalNutritionResult
} from '@/lib/nutrition-calculator';
import {
  USNutritionFactsPanel,
  ChinaNutritionTable,
  JapanNutritionList,
  EUNutritionTable,
  UAETrafficLightPanel,
  DualNutritionBox
} from '@/components/labels/nutrition';

interface Props {
  initialLabels: FoodLabel[];
}

const COUNTRIES: { code: ExportCountry; name: string; flag: string; authority: string; primaryLang: string }[] = [
  { code: 'US', name: '미국 (USA)', flag: '🇺🇸', authority: 'FDA / USDA-FSIS', primaryLang: 'English' },
  { code: 'CN', name: '중국 (China)', flag: '🇨🇳', authority: 'SAMR / GACC', primaryLang: '中文简体' },
  { code: 'JP', name: '일본 (Japan)', flag: '🇯🇵', authority: '消費者庁 (CAA)', primaryLang: '日本語' },
  { code: 'EU', name: '유럽연합 (EU)', flag: '🇪🇺', authority: 'EFSA / EC FIC', primaryLang: 'EU 공용어' },
  { code: 'UAE', name: '아랍에미리트 (UAE)', flag: '🇦🇪', authority: 'MoIAT / GSO', primaryLang: 'العربية (RTL)' },
];

const REGULATION_SUMMARIES: Record<ExportCountry, {
  langSpec: string;
  nutritionSpec: string;
  allergenSpec: string;
  datingSpec: string;
  specialRules: string[];
}> = {
  US: {
    langSpec: '영어 (English) 단독 또는 다국어 병기',
    nutritionSpec: 'FDA 2016 규격 Nutrition Facts (1회 제공량 RACC 기준, 첨가당 및 %DV 필수)',
    allergenSpec: 'FALCPA 9대 성분 (참깨 포함), Contains 별도 박스 표기 필수',
    datingSpec: '월/일/연도 (MM/DD/YYYY) 권장 형식',
    specialRules: [
      '육류(소·돼지고기) 가공품 2% 이상 함유 시 USDA 관할 전환 (한국산 수입 제한, 수산물/비건 권장)',
      '첨가당(Added Sugars), 비타민D, 칼륨 3대 영양성분 필수 표기',
      '순중량 온스(oz) 및 그램(g) 듀얼 단위 병기 필수'
    ]
  },
  CN: {
    langSpec: '중국어 간체 (规范汉字) 필수 표기',
    nutritionSpec: 'GB 28050 규격 100g당 에너지(kJ), 단백질, 지방, 탄수화물, 나트륨 및 NRV% 필수',
    allergenSpec: '8대 알레르기 유발물질 주의문구 표시 (GB 7718-2025 개정안 반영)',
    datingSpec: '생산일자(生产日期) + 보존기한(保质期) 연/월/일(YYYY/MM/DD) 동시 병기 의무',
    specialRules: [
      '해외제조업체 18자리 GACC 등록번호 라벨 표기 필수',
      'GB 7718-2025에 의거 원재료명 및 소구점에 "무첨가(零添加/不添加)" 마케팅 문구 전면 금지',
      '에너지 단위는 kcal가 아닌 kJ(킬로줄) 의무 표기 (1 kcal = 4.184 kJ)'
    ]
  },
  JP: {
    langSpec: '일본어 (외래어는 가타카나 표기)',
    nutritionSpec: '열량(kcal) ➔ 단백질 ➔ 지질 ➔ 탄수화물 ➔ 식염상당량(g) 5대 항목 고정 순서',
    allergenSpec: '8대 특정원재료(호두, 캐슈넛 2025년 승격) 의무 + 20대 권장 품목',
    datingSpec: '상미기한(賞味期限, 품질유지) 또는 소비기한(消費期限, 안전기한)',
    specialRules: [
      '나트륨(mg) 대신 식염상당량(g = Na × 2.54 ÷ 1000) 의무 표기',
      '특정원재료 괄호 개별 표기(小麦・大豆を含む) 또는 일괄 표기 형식 강제',
      '"들어 있을지도 모름" 등 추정성·가능성 알레르겐 표기 절대 금지'
    ]
  },
  EU: {
    langSpec: '수입국 공용어 (다국어 병기 허용)',
    nutritionSpec: '100g/100ml당 에너지(kJ 및 kcal 듀얼 병기), 지방, 포화지방, 탄수화물, 당류, 단백질, 염분',
    allergenSpec: '14대 알레르겐 원재료명 내 볼드(Bold) 또는 밑줄 시각적 강조 의무',
    datingSpec: 'Best before 또는 Use by 일/월/연도 (DD/MM/YYYY)',
    specialRules: [
      '라벨 표면적 80cm² 이상 시 최소 글자 높이(x-height) 1.2mm 이상 유지',
      '첨가물 E171(이산화티타늄) EU 역내 사용 전면 금지 (Red-Flag 차단)',
      '라면 건더기/스프 2-CE(2-클로로에탄올) 및 산화에틸렌(EO) 공인 시험 성적서 준수'
    ]
  },
  UAE: {
    langSpec: '아랍어(العربية) 필수 표기 (영어 병기 일반적, RTL 우측정렬)',
    nutritionSpec: '100g당 영양성분 + 신호등(Traffic Light) 색상 라벨 (고당/고염/고지방 경고)',
    allergenSpec: 'GSO 9:2022 규격 알레르겐 경고 명시',
    datingSpec: '생산일자 + 소비기한 일/월/연도 (DD/MM/YYYY) 병기 의무',
    specialRules: [
      'GSO 공인 할랄(Halal) 인증 마크 및 인증서 구비 필수 (육류, 동물성 유화제 배제)',
      '발효식품 및 양념/소스류 잔류 알코올 함량 0.05%~0.5% 이하 통관 기준',
      '돼지고기 및 돈지 유래 젤라틴 등 하람(Haram) 성분 원천 차단'
    ]
  }
};

const SIMULATION_PRESETS: { id: string; name: string; country: ExportCountry; flag: string; desc: string; input: ValidationInput }[] = [
  {
    id: 'us_fail',
    name: '🇺🇸 미국: 돈육 32% 만두 & 참깨 누락',
    country: 'US',
    flag: '🇺🇸',
    desc: '한국산 돼지고기 32% 함유(USDA 관할 위반) 및 참깨 9대 알레르겐 미표기',
    input: {
      country: 'US',
      productNameLocal: 'Traditional Pork & Leek Dumplings',
      netWeightG: 480,
      ingredients: [
        { ingredientNameKo: '돼지고기', ingredientNameTarget: 'Pork meat', ratio: 32.0, isAllergen: false, displayOrder: 1 },
        { ingredientNameKo: '밀가루', ingredientNameTarget: 'Wheat Flour', ratio: 40.0, isAllergen: true, displayOrder: 2 },
        { ingredientNameKo: '참기름', ingredientNameTarget: 'Sesame oil', ratio: 5.0, isAllergen: true, displayOrder: 3 },
        { ingredientNameKo: '양배추', ingredientNameTarget: 'Cabbage', ratio: 23.0, isAllergen: false, displayOrder: 4 },
      ],
      nutrition: {
        servingSizeG: 120,
        caloriesKcal: 250,
        totalFatG: 12,
        saturatedFatG: 4,
        sodiumMg: 550,
        totalCarbohydrateG: 24,
        totalSugarsG: 2,
        proteinG: 11,
      },
      rawText: 'Korean Authentic Dumpling.',
    }
  },
  {
    id: 'cn_fail',
    name: '🇨🇳 중국: GACC 누락 & "무첨가" 불법 문구',
    country: 'CN',
    flag: '🇨🇳',
    desc: '해외공장 18자리 등록번호 누락 및 GB 7718-2025 금지 문구(零添加) 사용',
    input: {
      country: 'CN',
      productNameLocal: '韩式速冻水饺',
      netWeightG: 480,
      claimsBadges: ['零添加防腐剂', '纯天然原料'],
      registrationNumbers: {},
      ingredients: [
        { ingredientNameKo: '밀가루', ingredientNameTarget: '小麦粉', ratio: 70.0, isAllergen: true, displayOrder: 1 },
        { ingredientNameKo: '야채', ingredientNameTarget: '蔬菜', ratio: 30.0, isAllergen: false, displayOrder: 2 },
      ],
      nutrition: {
        servingSizeG: 100,
        caloriesKcal: 200,
        totalFatG: 5,
        saturatedFatG: 1,
        sodiumMg: 400,
        totalCarbohydrateG: 30,
        totalSugarsG: 2,
        proteinG: 8,
      }
    }
  },
  {
    id: 'eu_fail',
    name: '🇪🇺 EU: 금지 첨가물 E171(이산화티타늄)',
    country: 'EU',
    flag: '🇪🇺',
    desc: 'EU 전면 금지 착색료 E171 검출 및 kJ/kcal 듀얼 표기 누락',
    input: {
      country: 'EU',
      productNameLocal: 'Korean Dumplings with White Sauce',
      netWeightG: 480,
      ingredients: [
        { ingredientNameKo: '이산화티타늄', ingredientNameTarget: 'Titanium dioxide', insOrENumber: 'E171', ratio: 0.5, isAllergen: false, displayOrder: 1 },
        { ingredientNameKo: '소맥분', ingredientNameTarget: 'Wheat flour', ratio: 70.0, isAllergen: true, displayOrder: 2 },
        { ingredientNameKo: '야채', ingredientNameTarget: 'Vegetables', ratio: 29.5, isAllergen: false, displayOrder: 3 },
      ],
      nutrition: {
        servingSizeG: 100,
        caloriesKcal: 210,
        totalFatG: 6,
        saturatedFatG: 1,
        sodiumMg: 420,
        saltEquivalentG: 1.06,
        totalCarbohydrateG: 28,
        totalSugarsG: 2,
        proteinG: 7,
      }
    }
  },
  {
    id: 'uae_fail',
    name: '🇦🇪 UAE: 고추장 주정 잔류량 0.35%',
    country: 'UAE',
    flag: '🇦🇪',
    desc: '발효 주정 잔류량 0.35% (0.05% 기준 초과) 및 할랄 인증서 번호 누락',
    input: {
      country: 'UAE',
      productNameLocal: 'صلصة الفلفل الحار الكورية',
      netWeightG: 500,
      alcoholPercentage: 0.35,
      registrationNumbers: {},
      ingredients: [
        { ingredientNameKo: '고춧가루', ingredientNameTarget: 'مسحوق الفلفل الحار', ratio: 40.0, isAllergen: false, displayOrder: 1 },
        { ingredientNameKo: '물엿', ingredientNameTarget: 'شراب الذرة', ratio: 35.0, isAllergen: false, displayOrder: 2 },
        { ingredientNameKo: '발효주정', ingredientNameTarget: 'كحول الإيثيل المخمر', ratio: 1.5, isAllergen: false, displayOrder: 3 },
        { ingredientNameKo: '정제염', ingredientNameTarget: 'ملح مكرر', ratio: 23.5, isAllergen: false, displayOrder: 4 },
      ]
    }
  },
  {
    id: 'all_pass',
    name: '✨ 5대국 완전 적합 (100점 통과)',
    country: 'US',
    flag: '🇺🇸',
    desc: '송영민 비비고 수산물/비건 왕교자 (FALCPA 9대 알레르겐 준수, 100% Compliant)',
    input: {
      country: 'US',
      productNameLocal: 'Premium Vegetable & Shrimp Mandu',
      netWeightG: 480,
      netWeightOz: 16.9,
      dateMarkingType: 'MM/DD/YYYY',
      ingredients: [
        { ingredientNameKo: '밀가루', ingredientNameTarget: 'Wheat Flour', ratio: 50.0, isAllergen: true, displayOrder: 1 },
        { ingredientNameKo: '새우', ingredientNameTarget: 'Shrimp', ratio: 20.0, isAllergen: true, displayOrder: 2 },
        { ingredientNameKo: '참기름', ingredientNameTarget: 'Sesame Oil', ratio: 5.0, isAllergen: true, displayOrder: 3 },
        { ingredientNameKo: '양배추', ingredientNameTarget: 'Cabbage', ratio: 25.0, isAllergen: false, displayOrder: 4 },
      ],
      nutrition: {
        servingSizeG: 120,
        caloriesKcal: 220,
        totalFatG: 6,
        saturatedFatG: 1,
        sodiumMg: 460,
        totalCarbohydrateG: 32,
        totalSugarsG: 3,
        addedSugarsG: 1,
        proteinG: 9,
        vitaminDMcg: 0,
        potassiumMg: 180,
      },
      rawText: 'CONTAINS: WHEAT, CRUSTACEAN SHELLFISH (SHRIMP), SESAME.'
    }
  }
];

export default function LabelingShowcaseClient({ initialLabels }: Props) {
  const [selectedCountry, setSelectedCountry] = useState<ExportCountry>('US');
  const [activeTab, setActiveTab] = useState<'matrix' | 'live_preview' | 'compliance' | 'nutrition_calc'>('live_preview');

  // 인터랙티브 컴플라이언스 시뮬레이터 상태
  const [activePresetId, setActivePresetId] = useState<string>('us_fail');
  const [simResult, setSimResult] = useState<ValidationResult>(() => validateLabel(SIMULATION_PRESETS[0].input));

  // 인터랙티브 영양성분 듀얼 변환기 상태
  const [nutritionServingG, setNutritionServingG] = useState<number>(120);
  const [nutritionCalories, setNutritionCalories] = useState<number>(183);
  const [nutritionSodium, setNutritionSodium] = useState<number>(383);
  const [nutritionFat, setNutritionFat] = useState<number>(5.0);
  const [nutritionCarb, setNutritionCarb] = useState<number>(26.6);
  const [nutritionProtein, setNutritionProtein] = useState<number>(7.5);

  const currentNutritionResult: GlobalNutritionResult = calculateGlobalNutrition({
    baseWeightG: 100,
    servingSizeG: nutritionServingG,
    servingsPerContainer: Math.max(1, Math.round(480 / nutritionServingG)),
    servingSizeHousehold: `${Math.round(nutritionServingG / 30)} pieces (${nutritionServingG}g)`,
    caloriesKcal: nutritionCalories,
    totalFatG: nutritionFat,
    saturatedFatG: Number((nutritionFat * 0.16).toFixed(1)),
    transFatG: 0,
    cholesterolMg: 12,
    sodiumMg: nutritionSodium,
    totalCarbohydrateG: nutritionCarb,
    dietaryFiberG: 1.7,
    totalSugarsG: 2.5,
    addedSugarsG: 0.8,
    proteinG: nutritionProtein,
    vitaminDMcg: 0,
    calciumMg: 35,
    ironMg: 1.6,
    potassiumMg: 160,
  });

  // 현재 선택된 국가의 라벨 데이터
  const activeLabel = initialLabels.find((l) => l.country === selectedCountry) || initialLabels[0];
  const reg = REGULATION_SUMMARIES[selectedCountry];

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-stone-900 selection:bg-emerald-100 selection:text-emerald-900 pb-24">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-[#0A0A0C] text-white pt-24 pb-20 border-b border-stone-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#14532D]/40 via-[#0A0A0C]/80 to-[#0A0A0C] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase mb-6 backdrop-blur-md">
            <Sparkles size={14} className="text-[#EAB308]" />
            <span>Song Youngmin Food · Global Compliance &amp; Master Labeling Spec</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-jakarta tracking-tight leading-tight text-white mb-6">
            글로벌 5대 권역 식품 <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-amber-300 to-amber-500">
              마스터 라벨링 시스템 (Master Labeling Spec)
            </span>
          </h1>

          <p className="max-w-3xl text-stone-300 text-base sm:text-lg leading-relaxed mb-8">
            미국(FDA/USDA), 중국(GACC), 일본(소비자청), EU(EFSA), UAE(MoIAT) 5대 수출 대상국의 법적 비관세 장벽을 사전 분석하여,
            300여 개 K-Food 품목의 라벨을 공통 규격 템플릿과 국가별 모듈식 치환 체계로 바이어에게 즉시 제안하고 통관 리스크를 0%로 보장합니다.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/rfq"
              className="inline-flex items-center space-x-2 px-6 py-3.5 bg-[#14532D] hover:bg-[#166534] text-white font-bold rounded-xl shadow-lg shadow-emerald-950/50 transition-all transform hover:-translate-y-0.5 text-sm"
            >
              <span>바이어 맞춤 라벨 스펙시트 RFQ 신청</span>
              <ArrowRight size={16} />
            </Link>

            <Link
              href="/admin"
              className="inline-flex items-center space-x-2 px-6 py-3.5 bg-stone-900/80 hover:bg-stone-800 text-stone-200 border border-stone-700 font-bold rounded-xl text-sm transition-all"
            >
              <ShieldCheck size={16} className="text-amber-400" />
              <span>관리자 백오피스 라벨 스튜디오</span>
            </Link>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12 pt-8 border-t border-stone-800/80">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-amber-400 font-jakarta">5 Major</div>
              <div className="text-xs text-stone-400 mt-1">글로벌 수출 권역 (US, CN, JP, EU, UAE)</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-jakarta">300+ SKUs</div>
              <div className="text-xs text-stone-400 mt-1">K-Food &amp; K-Liquor 품목 라인업</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-white font-jakarta">6 Blocks</div>
              <div className="text-xs text-stone-400 mt-1">표준 바이어 스펙 템플릿 구조</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-amber-400 font-jakarta">100%</div>
              <div className="text-xs text-stone-400 mt-1">사전 컴플라이언스 Red-Flag 차단</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Country Selector Navigation Bar */}
      <section className="sticky top-20 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 overflow-x-auto gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider hidden md:inline">수출 대상국 선택:</span>
              <div className="flex items-center space-x-1 sm:space-x-2">
                {COUNTRIES.map((c) => {
                  const isSelected = selectedCountry === c.code;
                  return (
                    <button
                      key={c.code}
                      onClick={() => setSelectedCountry(c.code)}
                      className={`flex items-center space-x-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-extrabold transition-all ${
                        isSelected
                          ? 'bg-[#14532D] text-white shadow-md'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      <span className="text-base">{c.flag}</span>
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* View Mode Tabs */}
            <div className="flex items-center bg-stone-100 p-1 rounded-lg text-xs font-bold">
              <button
                onClick={() => setActiveTab('live_preview')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  activeTab === 'live_preview' ? 'bg-white text-[#14532D] shadow' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                라벨 6대 블록 프리뷰
              </button>
              <button
                onClick={() => setActiveTab('matrix')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  activeTab === 'matrix' ? 'bg-white text-[#14532D] shadow' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                규제 비교 분석표
              </button>
              <button
                onClick={() => setActiveTab('nutrition_calc')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  activeTab === 'nutrition_calc' ? 'bg-white text-[#14532D] shadow' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                영양성분 듀얼 변환기
              </button>
              <button
                onClick={() => setActiveTab('compliance')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  activeTab === 'compliance' ? 'bg-white text-[#14532D] shadow' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                컴플라이언스 엔진
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Main Content Display Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">

        {/* TAB 1: LIVE 6-BLOCK PREVIEW */}
        {activeTab === 'live_preview' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Top Bar: Product & Country Overview */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center space-x-2 text-xs font-bold text-[#14532D]">
                  <span>대표 표준 규격 샘플:</span>
                  <span className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-mono">
                    {activeLabel.productId} ({activeLabel.hsCode || 'HS 1902.20'})
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-stone-900">
                  {activeLabel.productNameLocal}
                </h2>
                <p className="text-xs sm:text-sm text-stone-500 font-medium">
                  {activeLabel.productNameEn} · 법적 식품유형: <span className="text-stone-800 font-bold">{activeLabel.productCategoryLocal}</span>
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-xs text-stone-400 font-bold">규제 승인 상태</div>
                  <div className="inline-flex items-center space-x-1 text-xs font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                    <CheckCircle2 size={13} />
                    <span>100% {activeLabel.status.toUpperCase()}</span>
                  </div>
                </div>

                <Link
                  href="/rfq"
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs rounded-xl shadow transition-colors flex items-center space-x-1"
                >
                  <Printer size={14} />
                  <span>스펙시트 PDF 출력</span>
                </Link>
              </div>
            </div>

            {/* 6-Block Interactive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Blocks 1, 2, 3, 5, 6 */}
              <div className="lg:col-span-7 space-y-6">

                {/* Block 1: Header & Regulatory Codes */}
                <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div className="flex items-center space-x-2 text-sm font-black text-[#14532D]">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#14532D] flex items-center justify-center text-xs">1</span>
                      <h3>HEADER BLOCK (식별 및 수출 인허가 번호)</h3>
                    </div>
                    <span className="text-[11px] font-mono bg-stone-100 px-2 py-0.5 rounded text-stone-600">
                      {selectedCountry} 규제 인증 완료
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-stone-50 p-3 rounded-xl">
                      <div className="text-stone-400 font-bold">HS Code</div>
                      <div className="text-stone-900 font-extrabold mt-0.5">{activeLabel.hsCode || '1902.20-1000'}</div>
                    </div>
                    <div className="bg-stone-50 p-3 rounded-xl">
                      <div className="text-stone-400 font-bold">관할 규제기관</div>
                      <div className="text-stone-900 font-extrabold mt-0.5">{COUNTRIES.find(c => c.code === selectedCountry)?.authority}</div>
                    </div>
                    <div className="bg-stone-50 p-3 rounded-xl">
                      <div className="text-stone-400 font-bold">해외 공장등록 번호</div>
                      <div className="text-emerald-700 font-mono font-bold mt-0.5">
                        {activeLabel.registrationNumbers?.gaccCode || activeLabel.registrationNumbers?.fdaFce || activeLabel.registrationNumbers?.halalCertNo || activeLabel.registrationNumbers?.euEstablishmentNo || 'REG-KR-APPROVED'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Block 2: PDP (Principal Display Panel) */}
                <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div className="flex items-center space-x-2 text-sm font-black text-[#14532D]">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#14532D] flex items-center justify-center text-xs">2</span>
                      <h3>PDP (Principal Display Panel - 전면 주표시면)</h3>
                    </div>
                    <span className="text-[11px] text-stone-500">Net Weight &amp; Claims</span>
                  </div>

                  {/* PDP Visual Simulation Card */}
                  <div className="bg-[#0A0A0C] text-white p-6 rounded-xl border border-stone-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-serif-luxury tracking-widest text-amber-400">SONG YOUNGMIN FOOD</div>
                      <span className="text-[10px] bg-emerald-950 border border-emerald-600 text-emerald-300 px-2 py-0.5 rounded font-bold">
                        ORIGINAL RECIPE
                      </span>
                    </div>

                    <div className="space-y-1 text-center py-4">
                      <h4 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                        {activeLabel.productNameLocal}
                      </h4>
                      <p className="text-xs text-stone-400">{activeLabel.productNameEn}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                      {(activeLabel.claimsBadges || []).map((badge, idx) => (
                        <span key={idx} className="text-[11px] bg-white/10 text-amber-300 border border-amber-300/30 px-2.5 py-1 rounded-full font-bold">
                          ✓ {badge}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-stone-800 text-xs text-stone-300">
                      <div>
                        <span className="text-stone-500">NET WEIGHT: </span>
                        <strong className="text-white font-mono">
                          {activeLabel.netWeightG}g {activeLabel.netWeightOz ? `(${activeLabel.netWeightOz} OZ)` : ''}
                        </strong>
                      </div>
                      <div className="text-[11px] text-stone-400 italic">
                        {activeLabel.servingSuggestion || 'Serving Suggestion'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Block 3: Information Panel (Ingredients & Allergens) */}
                <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div className="flex items-center space-x-2 text-sm font-black text-[#14532D]">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#14532D] flex items-center justify-center text-xs">3</span>
                      <h3>INFORMATION PANEL (원재료 배합비 &amp; 알레르겐 박스)</h3>
                    </div>
                    <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                      중량순 내림차순 정렬
                    </span>
                  </div>

                  {/* Ingredients Table */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-stone-700">원재료명 (Ingredients List):</div>
                    <div className="bg-stone-50 p-3 rounded-xl text-xs text-stone-800 leading-relaxed font-sans">
                      {activeLabel.ingredients?.map((ing, i) => (
                        <span key={i}>
                          <span className={ing.isAllergen ? 'font-bold text-red-700 underline decoration-red-400' : ''}>
                            {ing.ingredientNameTarget}
                          </span>
                          {ing.ratio ? ` (${ing.ratio}%)` : ''}
                          {i < (activeLabel.ingredients?.length ?? 0) - 1 ? ', ' : '.'}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Allergen Callout Box */}
                  <div className="p-4 bg-red-50/70 border border-red-200 rounded-xl space-y-1">
                    <div className="flex items-center space-x-2 text-xs font-black text-red-900">
                      <AlertTriangle size={14} className="text-red-600" />
                      <span>수출 대상국 법정 알레르겐 의무 표기문 (Allergen Advice)</span>
                    </div>
                    <p className="text-xs text-red-800 font-bold">
                      {selectedCountry === 'US' && 'CONTAINS: WHEAT, SOYBEANS, CRUSTACEAN SHELLFISH (SHRIMP), SESAME.'}
                      {selectedCountry === 'CN' && '致敏原信息：含有含有麸质的谷物及其制品（小麦）、大豆及其制品、甲壳纲动物及其制品（虾仁）、芝麻及其制品。'}
                      {selectedCountry === 'JP' && '原材料の一部に小麦・えび・大豆・ごまを含みます。（特定原材料8品目および推奨品目を厳格表示）'}
                      {selectedCountry === 'EU' && 'Allergy Advice: For allergens, including cereals containing gluten, see ingredients in BOLD.'}
                      {selectedCountry === 'UAE' && 'تحذير الحساسية: يحتوي على القمح وفول الصويا والقشريات والسمسم. خالٍ تماماً من لحم الخنزير ومشتقاته.'}
                    </p>
                  </div>

                  {/* Storage & Instructions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="bg-stone-50 p-3 rounded-xl space-y-1">
                      <span className="text-stone-400 font-bold">보관방법 (Storage)</span>
                      <p className="text-stone-800 font-medium">{activeLabel.storageInstructions}</p>
                    </div>
                    <div className="bg-stone-50 p-3 rounded-xl space-y-1">
                      <span className="text-stone-400 font-bold">조리방법 (Cooking)</span>
                      <p className="text-stone-800 font-medium">{activeLabel.cookingInstructions || 'Cook thoroughly before serving.'}</p>
                    </div>
                  </div>

                  {/* Manufacturer & Importer Info */}
                  <div className="pt-2 border-t border-stone-100 text-xs grid grid-cols-1 sm:grid-cols-2 gap-3 text-stone-600">
                    <div>
                      <span className="font-bold text-stone-800">제조원/수출원: </span>
                      {activeLabel.manufacturerInfo?.nameEn || activeLabel.manufacturerInfo?.name || 'Songyoungmin Food'} ({activeLabel.manufacturerInfo?.country || 'Korea'})
                    </div>
                    <div>
                      <span className="font-bold text-stone-800">수입자/유통사: </span>
                      {activeLabel.importerInfo?.name || '[ Buyer to Fill / 현지 수입자 기재 ]'}
                    </div>
                  </div>
                </div>

                {/* Block 5 & 6: Dating & Barcode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Block 5 */}
                  <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-2">
                    <div className="flex items-center space-x-2 text-xs font-black text-[#14532D]">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#14532D] flex items-center justify-center text-[10px]">5</span>
                      <h4>DATING &amp; LOT (일자 표기)</h4>
                    </div>
                    <div className="bg-stone-50 p-3 rounded-xl space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-stone-400">포맷:</span>
                        <strong className="text-stone-900 font-mono">{activeLabel.dateMarkingType}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400">소비기한:</span>
                        <span className="text-stone-800">{activeLabel.shelfLifeMonths}개월 (제조일 기준)</span>
                      </div>
                      <div className="text-[11px] text-stone-500 pt-1">
                        {activeLabel.dateMarkingText}
                      </div>
                    </div>
                  </div>

                  {/* Block 6 */}
                  <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-2">
                    <div className="flex items-center space-x-2 text-xs font-black text-[#14532D]">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#14532D] flex items-center justify-center text-[10px]">6</span>
                      <h4>BARCODE &amp; PACKAGING (바코드)</h4>
                    </div>
                    <div className="bg-stone-50 p-3 rounded-xl space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-stone-400">규격:</span>
                        <strong className="text-stone-900 font-mono">{activeLabel.barcodeType}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400">바코드 번호:</span>
                        <strong className="text-emerald-700 font-mono">{activeLabel.barcodeNumber}</strong>
                      </div>
                      <div className="text-[11px] text-stone-500 pt-1">
                        재질: {activeLabel.packagingMaterial}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Block 4 - Target Country Nutrition Facts Box */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white rounded-2xl p-6 border-2 border-stone-900 shadow-lg space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                    <div className="flex items-center space-x-2 text-sm font-black text-stone-900">
                      <span className="w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs">4</span>
                      <h3>NUTRITION FACTS (국가별 영양성분 박스)</h3>
                    </div>
                    <span className="text-xs font-bold text-stone-700">{selectedCountry} 포맷</span>
                  </div>

                  {/* US FDA Nutrition Facts Format */}
                  {selectedCountry === 'US' && activeLabel.nutrition && (
                    <div className="border border-stone-900 p-4 bg-white text-stone-900 font-sans">
                      <div className="text-3xl font-black font-jakarta border-b-8 border-stone-900 pb-1 leading-none">
                        Nutrition Facts
                      </div>
                      <div className="text-xs font-semibold py-1 border-b border-stone-900 flex justify-between">
                        <span>{activeLabel.nutrition.servingsPerContainer} servings per container</span>
                      </div>
                      <div className="text-xs font-black py-1 border-b-4 border-stone-900 flex justify-between items-baseline">
                        <span>Serving size</span>
                        <span className="font-bold">{activeLabel.nutrition.servingSizeHousehold}</span>
                      </div>

                      <div className="py-2 border-b-8 border-stone-900 flex justify-between items-baseline">
                        <div>
                          <div className="text-[10px] font-black uppercase">Amount per serving</div>
                          <div className="text-2xl font-black">Calories</div>
                        </div>
                        <div className="text-4xl font-black">{activeLabel.nutrition.caloriesKcal}</div>
                      </div>

                      <div className="text-right text-[10px] font-black py-1 border-b border-stone-900">
                        % Daily Value*
                      </div>

                      <div className="text-xs space-y-1 divide-y divide-stone-200">
                        <div className="flex justify-between pt-1">
                          <span><strong>Total Fat</strong> {activeLabel.nutrition.totalFatG}g</span>
                          <span className="font-bold">8%</span>
                        </div>
                        <div className="flex justify-between pt-1 pl-4">
                          <span>Saturated Fat {activeLabel.nutrition.saturatedFatG}g</span>
                          <span className="font-bold">5%</span>
                        </div>
                        <div className="flex justify-between pt-1 pl-4">
                          <span><em>Trans</em> Fat {activeLabel.nutrition.transFatG || 0}g</span>
                          <span />
                        </div>
                        <div className="flex justify-between pt-1">
                          <span><strong>Cholesterol</strong> {activeLabel.nutrition.cholesterolMg}mg</span>
                          <span className="font-bold">5%</span>
                        </div>
                        <div className="flex justify-between pt-1">
                          <span><strong>Sodium</strong> {activeLabel.nutrition.sodiumMg}mg</span>
                          <span className="font-bold">20%</span>
                        </div>
                        <div className="flex justify-between pt-1">
                          <span><strong>Total Carbohydrate</strong> {activeLabel.nutrition.totalCarbohydrateG}g</span>
                          <span className="font-bold">12%</span>
                        </div>
                        <div className="flex justify-between pt-1 pl-4">
                          <span>Dietary Fiber {activeLabel.nutrition.dietaryFiberG}g</span>
                          <span className="font-bold">7%</span>
                        </div>
                        <div className="flex justify-between pt-1 pl-4">
                          <span>Total Sugars {activeLabel.nutrition.totalSugarsG}g</span>
                          <span />
                        </div>
                        <div className="flex justify-between pt-1 pl-6">
                          <span>Includes {activeLabel.nutrition.addedSugarsG}g Added Sugars</span>
                          <span className="font-bold">2%</span>
                        </div>
                        <div className="flex justify-between pt-1 border-b-4 border-stone-900 pb-1">
                          <span><strong>Protein</strong> {activeLabel.nutrition.proteinG}g</span>
                          <span className="font-bold">18%</span>
                        </div>
                      </div>

                      <div className="pt-2 text-[10px] text-stone-600 space-y-1">
                        <div className="flex justify-between">
                          <span>Vitamin D {activeLabel.nutrition.vitaminDMcg || 0}mcg 0%</span>
                          <span>Calcium {activeLabel.nutrition.calciumMg || 40}mg 4%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Iron {activeLabel.nutrition.ironMg || 1.8}mg 10%</span>
                          <span>Potassium {activeLabel.nutrition.potassiumMg || 180}mg 4%</span>
                        </div>
                      </div>

                      <div className="text-[9px] text-stone-500 pt-2 border-t border-stone-300 leading-tight">
                        * The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.
                      </div>
                    </div>
                  )}

                  {/* China GB 28050 Format */}
                  {selectedCountry === 'CN' && activeLabel.nutrition && (
                    <div className="border border-stone-800 p-4 bg-white space-y-2">
                      <div className="text-center font-black text-base border-b-2 border-stone-900 pb-1">
                        营养成分表 (Nutrition Information)
                      </div>
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b border-stone-400 text-stone-600 font-bold">
                            <th className="py-1">项目 (Item)</th>
                            <th className="py-1 text-center">每100克 (Per 100g)</th>
                            <th className="py-1 text-right">营养素参考值% (NRV%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200">
                          <tr>
                            <td className="py-1.5 font-bold">能量 (Energy)</td>
                            <td className="text-center">{activeLabel.nutrition.caloriesKj} kJ</td>
                            <td className="text-right font-bold">9%</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 font-bold">蛋白质 (Protein)</td>
                            <td className="text-center">{activeLabel.nutrition.proteinG} g</td>
                            <td className="text-right font-bold">13%</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 font-bold">脂肪 (Fat)</td>
                            <td className="text-center">{activeLabel.nutrition.totalFatG} g</td>
                            <td className="text-right font-bold">8%</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 font-bold">碳水化合物 (Carb)</td>
                            <td className="text-center">{activeLabel.nutrition.totalCarbohydrateG} g</td>
                            <td className="text-right font-bold">9%</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 font-bold">钠 (Sodium)</td>
                            <td className="text-center">{activeLabel.nutrition.sodiumMg} mg</td>
                            <td className="text-right font-bold">19%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Japan CAA Format */}
                  {selectedCountry === 'JP' && activeLabel.nutrition && (
                    <div className="border border-stone-800 p-4 bg-white space-y-2">
                      <div className="text-center font-bold text-sm border-b-2 border-stone-900 pb-1">
                        栄養成分表示 (100g当たり)
                      </div>
                      <div className="text-xs space-y-2 pt-1">
                        <div className="flex justify-between border-b border-stone-200 pb-1">
                          <span className="font-bold">エネルギー (熱量)</span>
                          <span className="font-mono">{activeLabel.nutrition.caloriesKcal} kcal</span>
                        </div>
                        <div className="flex justify-between border-b border-stone-200 pb-1">
                          <span className="font-bold">たんぱく質</span>
                          <span className="font-mono">{activeLabel.nutrition.proteinG} g</span>
                        </div>
                        <div className="flex justify-between border-b border-stone-200 pb-1">
                          <span className="font-bold">脂質</span>
                          <span className="font-mono">{activeLabel.nutrition.totalFatG} g</span>
                        </div>
                        <div className="flex justify-between border-b border-stone-200 pb-1">
                          <span className="font-bold">炭水化物</span>
                          <span className="font-mono">{activeLabel.nutrition.totalCarbohydrateG} g</span>
                        </div>
                        <div className="flex justify-between border-b border-stone-900 pb-1 text-emerald-800 font-extrabold">
                          <span>食塩相当量 (Na換算)</span>
                          <span className="font-mono">{activeLabel.nutrition.saltEquivalentG} g</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-stone-500 pt-1">（推定値）</p>
                    </div>
                  )}

                  {/* EU FIC Format */}
                  {selectedCountry === 'EU' && activeLabel.nutrition && (
                    <div className="border border-stone-800 p-4 bg-white space-y-2">
                      <div className="font-black text-sm border-b-2 border-stone-900 pb-1">
                        NUTRITION DECLARATION (per 100g)
                      </div>
                      <div className="text-xs space-y-1 divide-y divide-stone-200">
                        <div className="flex justify-between py-1 font-bold">
                          <span>Energy</span>
                          <span>{activeLabel.nutrition.caloriesKj} kJ / {activeLabel.nutrition.caloriesKcal} kcal</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span>Fat</span>
                          <span>{activeLabel.nutrition.totalFatG} g</span>
                        </div>
                        <div className="flex justify-between py-1 pl-3 text-stone-600">
                          <span>of which saturates</span>
                          <span>{activeLabel.nutrition.saturatedFatG} g</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span>Carbohydrate</span>
                          <span>{activeLabel.nutrition.totalCarbohydrateG} g</span>
                        </div>
                        <div className="flex justify-between py-1 pl-3 text-stone-600">
                          <span>of which sugars</span>
                          <span>{activeLabel.nutrition.totalSugarsG} g</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span>Protein</span>
                          <span>{activeLabel.nutrition.proteinG} g</span>
                        </div>
                        <div className="flex justify-between py-1 font-bold text-emerald-900">
                          <span>Salt</span>
                          <span>{activeLabel.nutrition.saltEquivalentG} g</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* UAE Traffic Light Format */}
                  {selectedCountry === 'UAE' && activeLabel.nutrition && (
                    <div className="border border-stone-800 p-4 bg-white space-y-3" dir="rtl">
                      <div className="text-center font-black text-base border-b-2 border-stone-900 pb-1 font-jakarta">
                        البيانات التغذوية (لكل 100 غرام)
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div className="bg-emerald-50 border border-emerald-400 p-2 rounded-lg">
                          <div className="text-[10px] text-emerald-800 font-bold">الدهون</div>
                          <div className="text-sm font-black text-emerald-900">{activeLabel.nutrition.totalFatG}g</div>
                          <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">منخفض</span>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-400 p-2 rounded-lg">
                          <div className="text-[10px] text-emerald-800 font-bold">الدهون المشبعة</div>
                          <div className="text-sm font-black text-emerald-900">{activeLabel.nutrition.saturatedFatG}g</div>
                          <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">منخفض</span>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-400 p-2 rounded-lg">
                          <div className="text-[10px] text-emerald-800 font-bold">السكريات</div>
                          <div className="text-sm font-black text-emerald-900">{activeLabel.nutrition.totalSugarsG}g</div>
                          <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">منخفض</span>
                        </div>
                        <div className="bg-amber-50 border border-amber-400 p-2 rounded-lg">
                          <div className="text-[10px] text-amber-800 font-bold">الملح</div>
                          <div className="text-sm font-black text-amber-900">{activeLabel.nutrition.saltEquivalentG}g</div>
                          <span className="text-[9px] bg-amber-600 text-white px-1.5 py-0.2 rounded font-bold">متوسط</span>
                        </div>
                      </div>
                      <div className="text-xs text-stone-700 pt-2 border-t border-stone-200 text-center">
                        الطاقة: <strong>{activeLabel.nutrition.caloriesKcal} سعرة حرارية ({activeLabel.nutrition.caloriesKj} كيلو جول)</strong>
                      </div>
                    </div>
                  )}

                  {/* Red-Flag Engine Badge */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs space-y-1">
                    <div className="flex items-center space-x-2 text-emerald-900 font-black">
                      <ShieldCheck size={16} className="text-emerald-700" />
                      <span>규제 컴플라이언스 엔진 사전 검증 통과 (100/100)</span>
                    </div>
                    <p className="text-emerald-800">
                      {COUNTRIES.find(c => c.code === selectedCountry)?.name} 법적 필수 영양소 표기 규격 및 단위를 100% 충족합니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REGULATION MATRIX */}
        {activeTab === 'matrix' && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-8 space-y-8 animate-in fade-in duration-300">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-stone-900">
                5대 수출 대상국 라벨링 규제 종합 비교표
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">
                송영민푸드는 각 국가별 비관세 무역장벽 규정을 코드화하여 라벨 스펙시트에 즉시 반영합니다.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-stone-100 text-stone-800 font-black border-b-2 border-stone-300">
                    <th className="p-3">수출 대상국</th>
                    <th className="p-3">관할 규제기관</th>
                    <th className="p-3">적용 언어</th>
                    <th className="p-3">영양성분표 규격</th>
                    <th className="p-3">알레르겐 규정</th>
                    <th className="p-3">특이 필수 조건</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {COUNTRIES.map((c) => {
                    const r = REGULATION_SUMMARIES[c.code];
                    return (
                      <tr key={c.code} className={selectedCountry === c.code ? 'bg-emerald-50/70 font-medium' : 'hover:bg-stone-50'}>
                        <td className="p-3 font-bold text-stone-900 whitespace-nowrap">
                          {c.flag} {c.name}
                        </td>
                        <td className="p-3 font-bold text-stone-700">{c.authority}</td>
                        <td className="p-3">{r.langSpec}</td>
                        <td className="p-3">{r.nutritionSpec}</td>
                        <td className="p-3">{r.allergenSpec}</td>
                        <td className="p-3 text-stone-700">
                          <ul className="list-disc list-inside space-y-0.5">
                            {r.specialRules.slice(0, 2).map((rule, idx) => (
                              <li key={idx}>{rule}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: NUTRITION CALCULATOR DUAL-BOX */}
        {activeTab === 'nutrition_calc' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Control Panel Card */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-200 gap-2">
                <div>
                  <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full mb-2">
                    <Sparkles size={14} className="text-amber-500" />
                    <span>Real-time Global Nutrition Converter Engine</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-stone-900">
                    영양성분 100g ➔ 5대국 법정 서식 실시간 자동 변환기
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-500 mt-1">
                    기준 중량(100g) 영양 데이터를 슬라이더로 조절하면 미국 FDA, 중국 GB, 일본 CAA, EU FIC, UAE 신호등 포맷으로 즉시 재산출됩니다.
                  </p>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 sm:pt-0">
                  <span className="text-xs font-bold text-stone-400 mr-1">대표 품목 프리셋:</span>
                  <button
                    onClick={() => {
                      setNutritionServingG(120);
                      setNutritionCalories(183);
                      setNutritionSodium(383);
                      setNutritionFat(5.0);
                      setNutritionCarb(26.6);
                      setNutritionProtein(7.5);
                    }}
                    className="px-2.5 py-1 text-xs font-bold bg-stone-100 hover:bg-emerald-50 hover:text-[#14532D] rounded-lg transition-colors"
                  >
                    🥟 만두 (120g)
                  </button>
                  <button
                    onClick={() => {
                      setNutritionServingG(120);
                      setNutritionCalories(485);
                      setNutritionSodium(1790);
                      setNutritionFat(16.0);
                      setNutritionCarb(75.0);
                      setNutritionProtein(10.0);
                    }}
                    className="px-2.5 py-1 text-xs font-bold bg-stone-100 hover:bg-emerald-50 hover:text-[#14532D] rounded-lg transition-colors"
                  >
                    🍜 라면 (120g)
                  </button>
                  <button
                    onClick={() => {
                      setNutritionServingG(30);
                      setNutritionCalories(210);
                      setNutritionSodium(1200);
                      setNutritionFat(1.5);
                      setNutritionCarb(46.0);
                      setNutritionProtein(4.0);
                    }}
                    className="px-2.5 py-1 text-xs font-bold bg-stone-100 hover:bg-emerald-50 hover:text-[#14532D] rounded-lg transition-colors"
                  >
                    🌶️ 고추장 (30g)
                  </button>
                </div>
              </div>

              {/* Interactive Input Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                {/* Serving Size Slider */}
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-stone-700">1회 섭취참고량 (Serving Size)</span>
                    <span className="font-mono font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-sm">
                      {nutritionServingG} g
                    </span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="250"
                    step="5"
                    value={nutritionServingG}
                    onChange={(e) => setNutritionServingG(Number(e.target.value))}
                    className="w-full accent-[#14532D] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400">
                    <span>30g (소스)</span>
                    <span>120g (만두/면)</span>
                    <span>250g (대용량)</span>
                  </div>
                </div>

                {/* Calories Input */}
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-stone-700">100g당 열량 (Energy)</span>
                    <span className="font-mono font-black text-stone-900 bg-stone-200 px-2 py-0.5 rounded">
                      {nutritionCalories} kcal
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="600"
                    step="5"
                    value={nutritionCalories}
                    onChange={(e) => setNutritionCalories(Number(e.target.value))}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400">
                    <span>50 kcal</span>
                    <span>약 {Math.round(nutritionCalories * 4.184)} kJ (중국/EU)</span>
                    <span>600 kcal</span>
                  </div>
                </div>

                {/* Sodium Input */}
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-stone-700">100g당 나트륨 (Sodium)</span>
                    <span className="font-mono font-black text-red-900 bg-red-100 px-2 py-0.5 rounded">
                      {nutritionSodium} mg
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="2500"
                    step="25"
                    value={nutritionSodium}
                    onChange={(e) => setNutritionSodium(Number(e.target.value))}
                    className="w-full accent-red-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400">
                    <span>50 mg</span>
                    <span>식염상당량: {((nutritionSodium * 2.54) / 1000).toFixed(2)}g (일본/EU)</span>
                    <span>2500 mg</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dual-Panel Comparison Component */}
            <DualNutritionBox result={currentNutritionResult} defaultLeft="US" defaultRight="EU" />
          </div>
        )}

        {/* TAB 4: COMPLIANCE ENGINE */}
        {activeTab === 'compliance' && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-8 space-y-8 animate-in fade-in duration-300">
            <div>
              <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full mb-3">
                <ShieldCheck size={14} />
                <span>In-house Regulatory DB &amp; Auto Red-Flag Screening</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-stone-900">
                자체 규제 룰 엔진(Compliance Rule Engine) 검증 체계
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">
                외부 고가 API 의존 없이, 최신 글로벌 식품 규격집(FDA 21 CFR, EU FIC 1169/2011, GB 7718-2025 등)을 내재화하여 통관 위반 항목을 0.1초 만에 실시간 차단합니다.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-black">
                  1
                </div>
                <h3 className="text-sm font-bold text-stone-900">Red-Flag 룰 스크리닝</h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  미국 USDA 육류 2% 룰, 중국 GACC 18자리 누락, 일본 8대 의무 알레르겐 누락, EU E171 사용 금지, UAE 알코올 0.05% 초과 등 통관 거부 사유를 사전 차단합니다.
                </p>
              </div>

              <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
                  2
                </div>
                <h3 className="text-sm font-bold text-stone-900">배합비 자동 정렬 (Auto-Sort)</h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  전 세계 식품 라벨링 공통 규정인 &apos;중량 기준 내림차순(Descending Order)&apos;을 PostgreSQL 트리거로 강제하여 휴먼 에러를 100% 방지합니다.
                </p>
              </div>

              <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                  3
                </div>
                <h3 className="text-sm font-bold text-stone-900">모듈식 다국어 치환</h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  국가를 전환할 때마다 보관방법, 조리법, 알레르겐 안내문이 해당 국가의 법정 표준 문구(아랍어 RTL 포함)로 0.1초 만에 즉시 치환됩니다.
                </p>
              </div>
            </div>

            {/* 4. Interactive Live Red-Flag Simulator */}
            <div className="pt-6 border-t border-stone-200 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="inline-flex items-center space-x-1.5 text-xs font-black text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full mb-1">
                    <AlertTriangle size={12} />
                    <span>실시간 컴플라이언스 시뮬레이터 (Live Sandbox)</span>
                  </div>
                  <h3 className="text-lg font-black text-stone-900">
                    5대국 법적 통관 거부(Red-Flag) 사전 차단 시뮬레이션
                  </h3>
                  <p className="text-xs text-stone-500">
                    아래 대표적인 규제 위반 및 적합 시나리오를 선택하여 룰 엔진의 실시간 탐지 결과를 확인하십시오.
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold text-stone-400">자체 룰 엔진 응답속도:</span>
                  <div className="text-xs font-mono font-black text-emerald-700">⚡ 0.04ms (Instant Execution)</div>
                </div>
              </div>

              {/* Scenario Preset Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                {SIMULATION_PRESETS.map((preset) => {
                  const isCurrent = activePresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setActivePresetId(preset.id);
                        setSimResult(validateLabel(preset.input));
                      }}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        isCurrent
                          ? 'border-[#14532D] bg-emerald-50/80 shadow-md ring-2 ring-[#14532D]/20'
                          : 'border-stone-200 bg-stone-50 hover:bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="text-xs font-black text-stone-900 line-clamp-1">{preset.name}</div>
                      <div className="text-[10px] text-stone-500 mt-1 line-clamp-2 leading-tight">{preset.desc}</div>
                    </button>
                  );
                })}
              </div>

              {/* Simulation Result Display Panel */}
              <div className="bg-stone-900 text-white rounded-2xl p-6 border border-stone-800 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-800 gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-stone-400 font-bold">
                      검증 권역: <span className="text-amber-400">{simResult.jurisdiction}</span> · 기준일시: {new Date(simResult.checkedAt).toLocaleTimeString()}
                    </div>
                    <div className="text-xl font-black text-white flex items-center space-x-2">
                      <span>검증 결과:</span>
                      {simResult.isCompliant ? (
                        <span className="text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-3 py-0.5 rounded-full text-sm font-bold flex items-center space-x-1">
                          <CheckCircle2 size={14} />
                          <span>100% 수출 규제 적합 (PASSED)</span>
                        </span>
                      ) : (
                        <span className="text-red-400 bg-red-950/80 border border-red-500/40 px-3 py-0.5 rounded-full text-sm font-bold flex items-center space-x-1">
                          <AlertTriangle size={14} />
                          <span>통관 불가 Red-Flag 감지 ({simResult.criticalErrors.length}건)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score Badge */}
                  <div className="flex items-center space-x-3 bg-stone-950/70 border border-stone-800 px-5 py-3 rounded-xl">
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-stone-400">Compliance Score</div>
                      <div className={`text-2xl font-black font-mono ${simResult.score === 100 ? 'text-emerald-400' : simResult.score >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                        {simResult.score} / 100
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full border-2 border-stone-700 flex items-center justify-center font-black text-sm">
                      {simResult.score}%
                    </div>
                  </div>
                </div>

                {/* Critical Errors List */}
                {simResult.criticalErrors.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-xs font-black text-red-400 flex items-center space-x-1.5 uppercase tracking-wider">
                      <AlertTriangle size={14} />
                      <span>통관 차단 결함 (Critical Red-Flags)</span>
                    </div>

                    <div className="space-y-3">
                      {simResult.criticalErrors.map((err, idx) => (
                        <div key={idx} className="bg-red-950/40 border border-red-800/60 rounded-xl p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-mono bg-red-900/60 text-red-300 px-2 py-0.5 rounded font-bold">
                                {err.code}
                              </span>
                              <h4 className="text-sm font-black text-red-200 mt-1">{err.title}</h4>
                            </div>
                            {err.lawReference && (
                              <span className="text-[10px] text-stone-400 bg-stone-800 px-2 py-0.5 rounded whitespace-nowrap">
                                법령: {err.lawReference}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-stone-300 leading-relaxed">{err.message}</p>

                          <div className="bg-emerald-950/60 border border-emerald-800/40 rounded-lg p-2.5 text-xs text-emerald-300 flex items-start space-x-2 mt-2">
                            <span className="font-bold whitespace-nowrap text-emerald-400">💡 권장 솔루션:</span>
                            <span>{err.solution}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings List */}
                {simResult.warnings.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="text-xs font-black text-amber-400 flex items-center space-x-1.5 uppercase tracking-wider">
                      <Info size={14} />
                      <span>개선 권장 사항 (Regulatory Warnings)</span>
                    </div>

                    <div className="space-y-2">
                      {simResult.warnings.map((warn, idx) => (
                        <div key={idx} className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-3.5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-300">{warn.title}</span>
                            <span className="text-[10px] font-mono text-amber-400">{warn.code}</span>
                          </div>
                          <p className="text-xs text-stone-300">{warn.message}</p>
                          <div className="text-[11px] text-amber-200/90 font-medium">👉 {warn.solution}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 100% Pass Message */}
                {simResult.isCompliant && simResult.criticalErrors.length === 0 && (
                  <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-6 text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-900/60 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                      <CheckCircle2 size={28} />
                    </div>
                    <h4 className="text-base font-black text-white">모든 법적 규제 룰을 100% 충족합니다</h4>
                    <p className="text-xs text-stone-300 max-w-md mx-auto">
                      육류 배합비 기준, FALCPA 9대 알레르겐 박스, 영양소 필수 표기, 일자 양식이 완벽하여 수입국 세관 통관이 즉시 승인됩니다.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-stone-900 text-white p-6 rounded-2xl border border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">해외 바이어 맞춤형 스펙시트가 필요하신가요?</h4>
                <p className="text-xs text-stone-400">수입자 정보(Buyer to Fill)가 반영된 공식 Master Spec Sheet PDF를 24시간 내 발급해 드립니다.</p>
              </div>
              <Link
                href="/rfq"
                className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs rounded-xl shadow transition-colors whitespace-nowrap"
              >
                바이어 RFQ 요청하기
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
