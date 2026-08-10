'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ProductItem, RFQItem, RFQRequest } from '@/lib/types';
import { Globe, Calculator, FileText, CheckCircle2, ChevronRight, ArrowLeft, ShieldCheck, Printer, CheckSquare, Square } from 'lucide-react';

const FALLBACK_RFQ_PRODUCTS: ProductItem[] = [
  {
    id: 'prod-1',
    name: 'CJ 비비고 수제 프리미엄 왕교자 만두 (Bibigo Mandu)',
    name_en: 'Bibigo Premium Pork & Leek Mandu Dumplings',
    collection: 'K-냉동식품',
    category: '만두 & 교자',
    price: 10000,
    format: '1.05kg 패밀리팩',
    finish: '-40°C IQF 급속냉동',
    color: '노릇노릇한 바삭함',
    look: '수제 손주름 왕교자',
    image_url: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=800&q=80',
    description: '100% 얇은 피 속 국내산 돼지고기와 신선한 부추, 당면이 듬뿍 들어간 대한민국 대표 비비고 왕교자 만두.',
    carton_qty: 10,
    wholesale_discount_rate: 0.15,
    gross_weight: 11.2,
    cbm: 0.037,
    moq_cartons: 50,
    hs_code: '1902.20-1000',
    export_price_usd: 7.50,
    wholesale_price_krw: 85000,
  },
  {
    id: 'prod-kimchi',
    name: '송영민푸드 명품 전통 포기김치 5kg (Premium Poggi Kimchi)',
    name_en: 'Song Youngmin Food Premium Artisanal Poggi Kimchi 5kg',
    collection: 'K-전통식품',
    category: '김치 & 발효식품',
    price: 10000,
    format: '5kg 업소용/가정용',
    finish: '자연 유산균 발효',
    color: '진한 붉은빛 갓담근 김치',
    look: '해남 배추 수제 포기김치',
    image_url: 'https://images.unsplash.com/photo-1583224964978-2257b960c3d3?auto=format&fit=crop&w=800&q=80',
    description: '100% 해남 배추와 고춧가루, 황석어젓, 멸치액젓으로 정성껏 담근 한국 전통 발효 명품 포기김치.',
    carton_qty: 10,
    wholesale_discount_rate: 0.15,
    gross_weight: 21.5,
    cbm: 0.052,
    moq_cartons: 40,
    hs_code: '2005.99-1000',
    export_price_usd: 7.50,
    wholesale_price_krw: 85000,
  },
  {
    id: 'prod-3',
    name: 'K-수제 눈꽃 떡볶이 & 모둠튀김 3인분 밀키트 (Tteokbokki Kit)',
    name_en: 'K-Street Spicy Tteokbokki & Assorted Tempura Kit',
    collection: 'K-간편식/HMR',
    category: '떡볶이 & 밀키트',
    price: 10000,
    format: '720g (3인분 구성)',
    finish: '특제 붉은 고춧가루 양념',
    color: '매콤달콤 붉은 떡볶이 양념',
    look: '쫄깃한 쌀떡 & 찰밀떡 믹스',
    image_url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=800&q=80',
    description: '한국 길거리 분식의 진수. 쫄깃한 떡과 부산 수제 어묵, 김말이 튀김이 어우러진 특제 떡볶이 밀키트.',
    carton_qty: 10,
    wholesale_discount_rate: 0.15,
    gross_weight: 8.5,
    cbm: 0.032,
    moq_cartons: 50,
    hs_code: '1902.30-9000',
    export_price_usd: 7.50,
    wholesale_price_krw: 85000,
  },
  {
    id: 'prod-5',
    name: '프리미엄 궁중 소불고기 밀키트 600g (Bulgogi Kit)',
    name_en: 'Premium Korean Royal Beef Bulgogi Kit 600g',
    collection: 'K-간편식/HMR',
    category: '육류 & 불고기',
    price: 10000,
    format: '600g 냉동팩',
    finish: '특제 간장 비법 양념',
    color: '달콤 짭조름한 양념색',
    look: '얇게 썬 청정 소고기',
    image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
    description: '배즙과 양파, 특제 마늘 간장 소스로 숙성한 연하고 부드러운 대한민국 전통 궁중 소불고기.',
    carton_qty: 10,
    wholesale_discount_rate: 0.15,
    gross_weight: 7.8,
    cbm: 0.029,
    moq_cartons: 50,
    hs_code: '1602.50-1000',
    export_price_usd: 7.50,
    wholesale_price_krw: 85000,
  },
  {
    id: 'prod-sauce',
    name: '송영민푸드 만능 K-BBQ 불고기&갈비 양념소스 2kg (K-BBQ Sauce)',
    name_en: 'Song Youngmin Food Master K-BBQ Soy Marinade Sauce 2kg',
    collection: 'K-소스/조미료',
    category: '양념 & 소스',
    price: 10000,
    format: '2kg 업소용 대용량',
    finish: '저온 저장 장기 숙성',
    color: '진한 흑갈색 전통 간장색',
    look: '다진 마늘 & 국산 배 원물',
    image_url: 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?auto=format&fit=crop&w=800&q=80',
    description: '전 세계 셰프들이 인정하는 만능 K-BBQ 갈비/불고기/삼겹살 볶음 양념소스 2kg 대용량.',
    carton_qty: 10,
    wholesale_discount_rate: 0.15,
    gross_weight: 21.0,
    cbm: 0.045,
    moq_cartons: 30,
    hs_code: '2103.90-9030',
    export_price_usd: 7.50,
    wholesale_price_krw: 85000,
  },
  {
    id: 'prod-2',
    name: '원소주 오리지널 24% 375ml (WON SOJU Original 24%)',
    name_en: 'WON SOJU Original 24% Premium Spirits 375ml',
    collection: 'K-주류 & 전통주',
    category: '전통주 & 소주',
    price: 10000,
    format: '375ml 유리병',
    finish: '옹기 감압증류 원액',
    color: '크리스탈 투명 맑은 빛',
    look: '라벨 모던 엠보싱 자개',
    image_url: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&w=800&q=80',
    description: '100% 국내산 쌀과 옹기 찜 증류 공법으로 만들어 부드럽고 맑은 목넘김을 자랑하는 원소주 오리지널.',
    carton_qty: 10,
    wholesale_discount_rate: 0.15,
    gross_weight: 9.8,
    cbm: 0.028,
    moq_cartons: 60,
    hs_code: '2208.90-4000',
    export_price_usd: 7.50,
    wholesale_price_krw: 85000,
  },
  {
    id: 'prod-4',
    name: '느린마을 수제 생막걸리 750ml (Neurinmaeul Makgeolli)',
    name_en: 'Neurinmaeul Handcrafted Raw Rice Wine 750ml',
    collection: 'K-주류 & 전통주',
    category: '막걸리 & 탁주',
    price: 10000,
    format: '750ml 콜드체인 PET',
    finish: '무인공감미료 100% 순수발효',
    color: '뽀얀 순백의 유산균 미색',
    look: '부드러운 크림 탄산 입자',
    image_url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80',
    description: '인공감미료(아스파탐) 0%. 100% 국산 쌀과 누룩으로만 발효시켜 시간이 지날수록 풍미가 변하는 고급 생막걸리.',
    carton_qty: 10,
    wholesale_discount_rate: 0.15,
    gross_weight: 9.2,
    cbm: 0.030,
    moq_cartons: 60,
    hs_code: '2206.00-2010',
    export_price_usd: 7.50,
    wholesale_price_krw: 85000,
  },
  {
    id: 'prod-snack',
    name: '송영민푸드 프리미엄 K-스낵 바삭 고구마칩 100g (Sweet Potato Chips)',
    name_en: 'Song Youngmin Premium Crunchy Sweet Potato Chips 100g',
    collection: 'K-스낵/음료',
    category: '과자 & 스낵',
    price: 10000,
    format: '100g 알루미늄 파우치',
    finish: '진공 저온 유탕 공법',
    color: '황금빛 자색 고구마색',
    look: '국산 100% 고구마 원물 스낵',
    image_url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=800&q=80',
    description: '국산 고구마 100%를 진공 저온 공법으로 튀겨 고구마 본연의 달콤함과 바삭함을 살린 프리미엄 K-웰빙 스낵.',
    carton_qty: 10,
    wholesale_discount_rate: 0.15,
    gross_weight: 2.5,
    cbm: 0.022,
    moq_cartons: 50,
    hs_code: '1905.90-1000',
    export_price_usd: 7.50,
    wholesale_price_krw: 85000,
  },
];

function RFQContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<ProductItem[]>(FALLBACK_RFQ_PRODUCTS);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // RFQ Form State
  const [selectedProducts, setSelectedProducts] = useState<{ [id: string]: number }>({
    'prod-1': 50,
    'prod-kimchi': 50,
  });
  const [country, setCountry] = useState('USA');
  const [destinationPort, setDestinationPort] = useState('Los Angeles Port (USLAX)');
  const [incoterms, setIncoterms] = useState<'FOB Busan' | 'CIF' | 'CFR' | 'EXW'>('FOB Busan');
  
  // Buyer Company State
  const [company, setCompany] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessType, setBusinessType] = useState('Importer / Distributor');
  const [notes, setNotes] = useState('');

  // Generated Quote State
  const [generatedQuote, setGeneratedQuote] = useState<RFQRequest | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/products');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            setProducts(data.data);
          }
        }
      } catch (err) {
        console.warn('API /api/products fetch failed, using preloaded catalog dataset:', err);
      }

      // Handle URL query parameters (e.g. /rfq?products=prod-1,prod-kimchi)
      const rawProducts = searchParams.get('products') || searchParams.get('product');
      if (rawProducts) {
        const productIds = rawProducts.split(',').map((s) => s.trim());
        const initialSelection: { [id: string]: number } = {};
        productIds.forEach((id) => {
          initialSelection[id] = 50; // default 50 CTNs
        });
        setSelectedProducts(initialSelection);
      }
    }
    loadData();
  }, [searchParams]);

  const toggleProduct = (id: string) => {
    setSelectedProducts((prev) => {
      const next = { ...prev };
      if (next[id] !== undefined) {
        delete next[id];
      } else {
        next[id] = 50; // default 50 CTNs
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const allSelected: { [id: string]: number } = {};
    products.forEach((p) => {
      allSelected[p.id] = 50;
    });
    setSelectedProducts(allSelected);
  };

  const handleDeselectAll = () => {
    setSelectedProducts({});
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty < 1) return;
    setSelectedProducts((prev) => ({
      ...prev,
      [id]: qty,
    }));
  };

  // Calculation Engine based on Carton (Master Carton) Standard Pricing
  const selectedProductList = products.filter((p) => selectedProducts[p.id] !== undefined);
  
  const rfqItems: RFQItem[] = selectedProductList.map((p) => {
    const qty = selectedProducts[p.id] || 0;
    const cartonQty = p.carton_qty || 10;
    const cartonPriceKrw = p.carton_price || Math.round((p.price || 10000) * cartonQty);
    const cartonPriceUsd = p.export_price_usd
      ? Math.round(p.export_price_usd * cartonQty * 100) / 100
      : Math.round((cartonPriceKrw / 1350) * 100) / 100;

    const totalUsd = Math.round(cartonPriceUsd * qty * 100) / 100;
    const cbmPerCtn = p.cbm || 0.035;
    const grossWeightPerCtn = p.gross_weight || 11.0;

    return {
      productId: p.id,
      name: p.name,
      quantityCartons: qty,
      unitPriceUsd: cartonPriceUsd,
      totalUsd,
      cbm: Math.round(cbmPerCtn * qty * 1000) / 1000,
      grossWeight: Math.round(grossWeightPerCtn * qty * 10) / 10,
      hsCode: p.hs_code || '1902.20-1000',
    };
  });

  const subtotalUsd = Math.round(rfqItems.reduce((sum, item) => sum + item.totalUsd, 0) * 100) / 100;
  const subtotalKrw = Math.round(subtotalUsd * 1350);
  const packingFeeUsd = selectedProductList.length > 0 ? 150 : 0;
  const totalUsd = Math.round((subtotalUsd + packingFeeUsd) * 100) / 100;
  const totalCbm = Math.round(rfqItems.reduce((sum, item) => sum + item.cbm, 0) * 1000) / 1000;
  const totalGrossWeight = Math.round(rfqItems.reduce((sum, item) => sum + item.grossWeight, 0) * 10) / 10;
  const fillRate = Math.min(100, Math.round((totalCbm / 28.0) * 100));

  const handleGenerateQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !name || !email) {
      alert('바이어 기업 정보(회사명, 담당자 성함, 이메일)를 입력해주세요.');
      return;
    }

    const quoteNo = `EXQ-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const newQuote: RFQRequest = {
      id: `rfq-${Date.now()}`,
      quoteNo,
      company,
      name,
      email,
      phone,
      country,
      destinationPort,
      incoterms,
      items: rfqItems,
      subtotalUsd,
      packingFeeUsd,
      totalUsd,
      totalCbm,
      totalGrossWeight,
      reeferContainerFillPercent: fillRate,
      notes: notes,
      status: 'NEW_LEAD',
      createdAt: new Date().toISOString(),
      businessType,
    };

    setGeneratedQuote(newQuote);
    setStep(7);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-stone-100 font-sans pb-24">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-amber-950 border-b border-stone-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <Link href="/global" className="inline-flex items-center text-xs text-amber-400 hover:underline mb-2 space-x-1 font-bold">
              <ArrowLeft size={14} />
              <span>해외 B2B 카탈로그로 돌아가기</span>
            </Link>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white font-jakarta tracking-tight">
              도매 &amp; 해외바이어 견적 신청 (RFQ)
            </h1>
            <p className="text-stone-300 text-xs sm:text-sm mt-2 max-w-2xl">
              DB에 등록된 K-Food 상품을 자유롭게 선택하여 표준 Carton(마스터 카톤) 단가 기준 수량별 견적을 즉시 산출하고 공식 Pro Forma Invoice를 발행받으실 수 있습니다.
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-stone-900/80 border border-amber-500/40 p-4 rounded-xl backdrop-blur shadow-2xl">
            <Calculator className="text-[#EAB308] w-8 h-8" />
            <div>
              <div className="text-[10px] uppercase text-stone-400 font-bold">견적 예상 총액 (FOB USD)</div>
              <div className="text-2xl font-extrabold text-[#EAB308] font-jakarta">${totalUsd.toLocaleString()} USD</div>
              <div className="text-xs text-stone-400 font-mono">약 ₩{subtotalKrw.toLocaleString()}원 (Carton 단가 기준)</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        {/* Progress Step Bar */}
        <div className="grid grid-cols-7 gap-2 mb-10 text-center text-xs">
          {[
            { num: 1, title: '상품 선택' },
            { num: 2, title: '수량 설정' },
            { num: 3, title: '목적지 국가' },
            { num: 4, title: '입항 항구' },
            { num: 5, title: '무역 조건' },
            { num: 6, title: '바이어 정보' },
            { num: 7, title: '견적서 발행' },
          ].map((s) => (
            <button
              key={s.num}
              onClick={() => s.num < step && setStep(s.num)}
              className={`py-2.5 px-1 rounded-xl border font-bold transition-all text-[11px] ${
                step === s.num
                  ? 'bg-[#14532D] text-white border-emerald-400 shadow-md ring-2 ring-emerald-400/30'
                  : step > s.num
                  ? 'bg-amber-950/60 text-amber-300 border-amber-500/50'
                  : 'bg-stone-900/40 text-stone-600 border-stone-800'
              }`}
            >
              Step {s.num}. {s.title}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Form Left Column (8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* STEP 1: Select Products */}
            {step === 1 && (
              <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-stone-800 pb-4 gap-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-white font-jakarta flex items-center space-x-2">
                      <span>Step 1. 견적 대상 상품 선택</span>
                    </h2>
                    <p className="text-xs text-stone-400 mt-1">
                      상품 카드를 클릭하여 견적에 포함할 K-Food 제품을 선택하세요. (Master Carton 단가 표기)
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-amber-400 font-extrabold px-3 py-1 bg-amber-950/50 border border-amber-500/30 rounded-lg">
                      {selectedProductList.length} / {products.length}개 선택됨
                    </span>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded text-xs font-bold transition-colors flex items-center space-x-1"
                    >
                      <CheckSquare size={13} />
                      <span>전체 선택</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 rounded text-xs transition-colors flex items-center space-x-1"
                    >
                      <Square size={13} />
                      <span>선택 해제</span>
                    </button>
                  </div>
                </div>

                {/* Product Catalog Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {products.map((p) => {
                    const isSelected = selectedProducts[p.id] !== undefined;
                    const cartonQty = p.carton_qty || 10;
                    const cartonPriceKrw = p.wholesale_price_krw || Math.round((p.price || 10000) * cartonQty * 0.85);
                    const cartonPriceUsd = p.export_price_usd
                      ? Math.round(p.export_price_usd * cartonQty * 100) / 100
                      : Math.round((cartonPriceKrw / 1350) * 100) / 100;

                    return (
                      <div
                        key={p.id}
                        onClick={() => toggleProduct(p.id)}
                        className={`cursor-pointer rounded-xl border p-4 transition-all flex items-center space-x-4 group hover:scale-[1.01] ${
                          isSelected
                            ? 'bg-emerald-950/50 border-emerald-500 shadow-xl ring-2 ring-emerald-500/40'
                            : 'bg-stone-950/80 border-stone-800 hover:border-emerald-600/60'
                        }`}
                      >
                        <div className="relative overflow-hidden rounded-lg flex-shrink-0 w-24 h-24 bg-stone-900">
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="w-full h-full object-cover rounded-lg border border-stone-700/60 shadow-md group-hover:scale-105 transition-transform duration-300"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-emerald-950/50 backdrop-blur-[1px] flex items-center justify-center">
                              <CheckCircle2 className="w-9 h-9 text-emerald-400 drop-shadow-md" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 overflow-hidden space-y-1">
                          <div className="flex items-center space-x-1.5">
                            <span className="bg-stone-800 text-stone-300 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                              {p.collection}
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono">
                              HS: {p.hs_code || '1902.20'}
                            </span>
                          </div>

                          <h3 className="text-xs font-bold text-stone-100 group-hover:text-amber-400 transition-colors leading-snug line-clamp-2">
                            {p.name}
                          </h3>

                          {/* Master Carton Price Badge */}
                          <div className="bg-stone-900/90 border border-stone-800 rounded px-2.5 py-1 text-[11px] font-mono">
                            <div className="flex justify-between items-center text-stone-400 font-bold text-[10px]">
                              <span>📦 1 Master Carton ({cartonQty}개입)</span>
                              <span>MOQ: {p.moq_cartons || 50} CTN</span>
                            </div>
                            <div className="flex justify-between items-center text-[#EAB308] font-extrabold mt-0.5">
                              <span>₩{cartonPriceKrw.toLocaleString()}원</span>
                              <span className="text-emerald-400">(${cartonPriceUsd} USD)</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex-shrink-0 pl-1">
                          <CheckCircle2 className={`w-6 h-6 transition-colors ${isSelected ? 'text-emerald-400' : 'text-stone-700 group-hover:text-stone-500'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 flex justify-between items-center border-t border-stone-800">
                  <div className="text-xs text-stone-400">
                    선택된 상품: <strong className="text-amber-400">{selectedProductList.length}개</strong> (수량은 다음 단계에서 설정)
                  </div>
                  <button
                    disabled={selectedProductList.length === 0}
                    onClick={() => setStep(2)}
                    className="px-8 py-3 bg-[#14532D] hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center space-x-2 disabled:opacity-50 shadow-lg"
                  >
                    <span>다음: 수량 입력하기</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Quantities */}
            {step === 2 && (
              <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
                <div className="border-b border-stone-800 pb-4">
                  <h2 className="text-xl font-bold text-white font-jakarta">Step 2. Quantity (Master Cartons)</h2>
                  <p className="text-xs text-stone-400">Specify order volume in standard master carton (CTN) units.</p>
                </div>

                <div className="space-y-4">
                  {selectedProductList.map((p) => {
                    const cartonQty = p.carton_qty || 10;
                    const cartonPriceKrw = p.wholesale_price_krw || Math.round((p.price || 10000) * cartonQty * 0.85);
                    const cartonPriceUsd = p.export_price_usd
                      ? Math.round(p.export_price_usd * cartonQty * 100) / 100
                      : Math.round((cartonPriceKrw / 1350) * 100) / 100;
                    const ctnQty = selectedProducts[p.id] || 0;
                    const lineTotalUsd = Math.round(cartonPriceUsd * ctnQty * 100) / 100;

                    return (
                      <div key={p.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-stone-950/80 border border-stone-800 p-4 rounded-xl gap-4">
                        <div className="flex items-center space-x-3">
                          <img src={p.image_url} alt={p.name} className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
                          <div>
                            <div className="text-xs font-bold text-stone-100">{p.name_en || p.name}</div>
                            <div className="text-[11px] text-stone-400 font-mono">
                              📦 1 CTN ({cartonQty}개입): ${cartonPriceUsd} USD (₩{cartonPriceKrw.toLocaleString()}원)
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => updateQuantity(p.id, (selectedProducts[p.id] || 10) - 10)}
                              className="w-8 h-8 rounded-lg bg-stone-800 text-stone-300 font-bold hover:bg-stone-700"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              value={selectedProducts[p.id] || 0}
                              onChange={(e) => updateQuantity(p.id, parseInt(e.target.value) || 0)}
                              className="w-20 bg-stone-900 border border-stone-700 rounded-lg py-1 px-2 text-center text-xs font-bold text-amber-400"
                            />
                            <button
                              onClick={() => updateQuantity(p.id, (selectedProducts[p.id] || 0) + 10)}
                              className="w-8 h-8 rounded-lg bg-stone-800 text-stone-300 font-bold hover:bg-stone-700"
                            >
                              +
                            </button>
                            <span className="text-xs text-stone-400 font-bold">CTNs</span>
                          </div>
                          <div className="text-xs font-extrabold text-[#EAB308] w-28 text-right font-mono">
                            ${lineTotalUsd.toLocaleString()} USD
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 flex justify-between">
                  <button onClick={() => setStep(1)} className="px-6 py-3 bg-stone-800 text-stone-300 text-xs font-bold rounded-xl">Back</button>
                  <button onClick={() => setStep(3)} className="px-8 py-3 bg-[#14532D] text-white font-bold text-xs uppercase tracking-wider rounded-xl">Next: Select Country</button>
                </div>
              </div>
            )}

            {/* STEP 3 & 4 & 5: Country, Port, Incoterms */}
            {step >= 3 && step <= 5 && (
              <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
                <div className="border-b border-stone-800 pb-4">
                  <h2 className="text-xl font-bold text-white font-jakarta">Step 3-5. Destination &amp; Incoterms</h2>
                  <p className="text-xs text-stone-400">Set shipping destination, port of entry, and trade terms.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-2">Destination Country</label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs text-stone-100 font-bold"
                    >
                      <option value="USA">United States (USA)</option>
                      <option value="Japan">Japan</option>
                      <option value="China">China</option>
                      <option value="Germany">Germany (EU)</option>
                      <option value="UAE">United Arab Emirates (Dubai)</option>
                      <option value="Vietnam">Vietnam</option>
                      <option value="Australia">Australia</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-2">Destination Port / City</label>
                    <input
                      type="text"
                      value={destinationPort}
                      onChange={(e) => setDestinationPort(e.target.value)}
                      placeholder="e.g. Los Angeles Port, Tokyo Port, Hamburg"
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs text-stone-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-2">Incoterms Trade Terms</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(['FOB Busan', 'CIF', 'CFR', 'EXW'] as const).map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => setIncoterms(term)}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                          incoterms === term
                            ? 'bg-amber-950/80 border-amber-400 text-amber-300 shadow-md ring-1 ring-amber-400'
                            : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                        }`}
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex justify-between">
                  <button onClick={() => setStep(2)} className="px-6 py-3 bg-stone-800 text-stone-300 text-xs font-bold rounded-xl">Back</button>
                  <button onClick={() => setStep(6)} className="px-8 py-3 bg-[#14532D] text-white font-bold text-xs uppercase tracking-wider rounded-xl">Next: Buyer Details</button>
                </div>
              </div>
            )}

            {/* STEP 6: Buyer Info Form */}
            {step === 6 && (
              <form onSubmit={handleGenerateQuote} className="bg-stone-900/80 border border-stone-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
                <div className="border-b border-stone-800 pb-4">
                  <h2 className="text-xl font-bold text-white font-jakarta">Step 6. Buyer Contact Information</h2>
                  <p className="text-xs text-stone-400">Enter your company and contact details to issue official Pro Forma Invoice.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1">Company Name *</label>
                    <input
                      required
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="e.g. Pacific Foods Import Co."
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs text-stone-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1">Contact Name *</label>
                    <input
                      required
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Smith (Purchasing Manager)"
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs text-stone-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1">Business Email *</label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. john@pacificfoods.com"
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs text-stone-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1">Phone / WhatsApp</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +1 310 555 0199"
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs text-stone-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1">Business Type</label>
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs text-stone-100 font-bold"
                    >
                      <option value="Importer / Distributor">Importer / Distributor</option>
                      <option value="Supermarket Chain">Supermarket / Retail Chain</option>
                      <option value="Restaurant Group">Restaurant Group / Catering</option>
                      <option value="Private Label / OEM">Private Label / OEM Brand Owner</option>
                      <option value="Online Retailer">Online Retailer / E-Commerce</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1">Additional Notes / Special Request</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Halal certification required, custom label"
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs text-stone-100"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-between items-center">
                  <button type="button" onClick={() => setStep(5)} className="px-6 py-3 bg-stone-800 text-stone-300 text-xs font-bold rounded-xl">Back</button>
                  <button
                    type="submit"
                    className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xl flex items-center space-x-2"
                  >
                    <FileText size={16} />
                    <span>Submit RFQ &amp; Generate Pro Forma Invoice</span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 7: Generated Official Pro Forma PDF Quotation */}
            {step === 7 && generatedQuote && (
              <div className="bg-white text-stone-900 rounded-2xl p-8 sm:p-12 shadow-2xl space-y-8 font-sans border-4 border-amber-500/80 print:p-0 print:border-none">
                {/* Print / Download Bar */}
                <div className="flex justify-between items-center border-b pb-6 border-stone-200 print:hidden">
                  <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <span>Export Quotation No. {generatedQuote.quoteNo} Generated Successfully</span>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold flex items-center space-x-2 hover:bg-stone-800"
                    >
                      <Printer size={14} />
                      <span>Print / Save PDF</span>
                    </button>
                  </div>
                </div>

                {/* PDF Quotation Document Header */}
                <div className="flex justify-between items-start border-b-2 border-stone-900 pb-6">
                  <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-stone-900 font-jakarta">
                      K-FOOD EXPORT QUOTATION
                    </h2>
                    <div className="text-xs font-bold text-amber-700 mt-1">PRO FORMA INVOICE / OFFICIAL QUOTE</div>
                    <div className="text-xs text-stone-500 mt-2">
                      Quotation No: <strong className="text-stone-900">{generatedQuote.quoteNo}</strong><br />
                      Date: {new Date().toLocaleDateString()}<br />
                      Validity: 30 Days from issuance
                    </div>
                  </div>

                  <div className="text-right text-xs space-y-1">
                    <div className="font-extrabold text-stone-900 text-sm">SONG YOUNGMIN FOOD CO., LTD.</div>
                    <div className="text-stone-600">Premium K-Food Export &amp; Distribution Platform</div>
                    <div className="text-stone-600">Busan Port Cold-Chain Trade Hub, South Korea</div>
                    <div className="text-stone-600">Email: export@songyoungminfood.com</div>
                    <div className="text-stone-600">Web: www.songyoungminfood.com</div>
                  </div>
                </div>

                {/* Buyer & Seller Info Box */}
                <div className="grid grid-cols-2 gap-6 bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs">
                  <div>
                    <div className="font-extrabold text-stone-800 uppercase tracking-wider mb-2">Buyer Information</div>
                    <div>Company: <strong>{generatedQuote.company}</strong></div>
                    <div>Contact: {generatedQuote.name} ({generatedQuote.businessType})</div>
                    <div>Email: {generatedQuote.email}</div>
                    <div>Phone: {generatedQuote.phone || 'N/A'}</div>
                    <div>Destination: <strong>{generatedQuote.country} ({generatedQuote.destinationPort})</strong></div>
                  </div>

                  <div>
                    <div className="font-extrabold text-stone-800 uppercase tracking-wider mb-2">Trade &amp; Export Terms</div>
                    <div>Incoterms: <strong>{generatedQuote.incoterms}</strong></div>
                    <div>Loading Port: <strong>Busan Port, Korea</strong></div>
                    <div>Production Lead Time: 14 Days</div>
                    <div>Payment Terms: T/T 30% Deposit, 70% against B/L</div>
                    <div>Container Spec: Reefer Cold Chain Container (-18°C)</div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-stone-900 text-white uppercase text-[10px] tracking-wider">
                        <th className="p-3">No</th>
                        <th className="p-3">Product Description</th>
                        <th className="p-3">HS Code</th>
                        <th className="p-3 text-right">Qty (CTN)</th>
                        <th className="p-3 text-right">Unit Price (USD)</th>
                        <th className="p-3 text-right">Total Amount (USD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {generatedQuote.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-stone-50">
                          <td className="p-3 font-bold text-stone-500">{idx + 1}</td>
                          <td className="p-3 font-bold text-stone-900">{item.name}</td>
                          <td className="p-3 text-stone-600 font-mono">{item.hsCode}</td>
                          <td className="p-3 text-right font-bold">{item.quantityCartons} CTN</td>
                          <td className="p-3 text-right">${item.unitPriceUsd.toFixed(2)}</td>
                          <td className="p-3 text-right font-bold text-stone-900">${item.totalUsd.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary Totals */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-amber-50 border border-amber-200 p-6 rounded-xl gap-4">
                  <div className="text-xs space-y-1">
                    <div>Total Order CBM: <strong className="text-stone-900">{generatedQuote.totalCbm} m³</strong></div>
                    <div>Total Gross Weight: <strong className="text-stone-900">{generatedQuote.totalGrossWeight} kg</strong></div>
                    <div>20ft Reefer Container Utilization: <strong className="text-amber-800">{generatedQuote.reeferContainerFillPercent}%</strong></div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-xs text-stone-600">Subtotal: ${generatedQuote.subtotalUsd.toLocaleString()} USD</div>
                    <div className="text-xs text-stone-600">Export Packing / Palletization Fee: ${generatedQuote.packingFeeUsd} USD</div>
                    <div className="text-xl font-extrabold text-stone-900 font-jakarta border-t border-amber-300 pt-1">
                      TOTAL ({generatedQuote.incoterms}): <span className="text-[#14532D]">${generatedQuote.totalUsd.toLocaleString()} USD</span>
                    </div>
                  </div>
                </div>

                {/* Footer Terms */}
                <div className="text-[11px] text-stone-500 border-t border-stone-200 pt-4 space-y-1">
                  <p>• All export products are manufactured in HACCP &amp; FSSC 22000 certified facilities in South Korea.</p>
                  <p>• Freight rates and insurance (if CIF) are calculated based on current shipping schedule and subject to final confirmation upon Purchase Order issuance.</p>
                </div>
              </div>
            )}

          </div>

          {/* Live Calculation Sidebar Right Column (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-stone-900/80 border border-amber-500/40 rounded-2xl p-6 space-y-6 sticky top-24 backdrop-blur shadow-2xl">
              <h3 className="text-base font-bold text-white font-jakarta flex items-center space-x-2 border-b border-stone-800 pb-3">
                <Calculator size={18} className="text-[#EAB308]" />
                <span>Real-time Quote Summary</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between text-stone-300">
                  <span>Selected Products:</span>
                  <strong className="text-white">{selectedProductList.length} Items</strong>
                </div>
                <div className="flex justify-between text-stone-300">
                  <span>Total Volume (CBM):</span>
                  <strong className="text-amber-400">{totalCbm} m³</strong>
                </div>
                <div className="flex justify-between text-stone-300">
                  <span>Gross Weight:</span>
                  <strong className="text-stone-100">{totalGrossWeight} kg</strong>
                </div>

                {/* Reefer Container Progress Bar */}
                <div className="pt-2">
                  <div className="flex justify-between text-[11px] font-bold text-stone-300 mb-1">
                    <span>20ft Reefer Fill Rate:</span>
                    <span className="text-amber-400">{fillRate}%</span>
                  </div>
                  <div className="w-full bg-stone-950 rounded-full h-2.5 overflow-hidden border border-stone-800">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${fillRate}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-stone-500 mt-1">Full 20ft Container ~ 28.0 CBM</p>
                </div>

                <div className="border-t border-stone-800 pt-3 flex justify-between items-center">
                  <span className="text-stone-300 font-bold">Estimated Quote:</span>
                  <span className="text-xl font-extrabold text-[#EAB308] font-jakarta">${totalUsd.toLocaleString()} USD</span>
                </div>
              </div>

              <div className="bg-emerald-950/60 border border-emerald-800/40 p-4 rounded-xl text-xs space-y-2 text-emerald-200">
                <div className="font-bold flex items-center space-x-1.5 text-white">
                  <ShieldCheck size={14} className="text-[#EAB308]" />
                  <span>Song Youngmin Export Guarantee</span>
                </div>
                <p className="text-[11px] text-stone-300">
                  Official Pro Forma Invoice with HS Code classification &amp; custom loading schedule provided upon RFQ submission.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RFQPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0C] text-stone-400 p-10 font-mono text-xs">Loading RFQ Platform...</div>}>
      <RFQContent />
    </Suspense>
  );
}
