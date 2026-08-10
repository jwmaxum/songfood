'use client';

import React from 'react';
import Link from 'next/link';
import { Download, FileText, Globe, ShieldCheck, Sparkles, ArrowRight, Search, FileDown, Eye } from 'lucide-react';

interface CatalogueItem {
  id: string;
  title_ko: string;
  title_en: string;
  category: string;
  file_size: string;
  file_format: string;
  date: string;
  description_ko: string;
  description_en: string;
  download_url: string;
  badge?: string;
  icon_color: string;
}

const CATALOGUES_DATA: CatalogueItem[] = [
  {
    id: 'cat-1',
    title_ko: '2026-2027 송영민푸드 K-Food 종합 수출 카탈로그',
    title_en: '2026-2027 Song Youngmin Food Comprehensive K-Food Export Catalogue',
    category: '종합 카탈로그',
    file_size: '45.2 MB',
    file_format: 'PDF',
    date: '2026.08.01',
    description_ko: 'K-냉동식품, 포기김치, HMR 밀키트, K-치킨, 소스류 및 전통주 라인업 전체 8종의 패키징, CBM, 물류 사양 수록.',
    description_en: 'Complete specifications for frozen foods, poggi kimchi, HMR kits, sauces, and artisanal spirits including CBM & logistics.',
    download_url: '#',
    badge: 'OFFICIAL',
    icon_color: 'text-amber-400',
  },
  {
    id: 'cat-2',
    title_ko: 'K-전통 발효식품 & 명품 포기김치 B2B 수출 사양서',
    title_en: 'Artisanal Poggi Kimchi & Fermented Foods B2B Specification Sheet',
    category: '제품 사양서',
    file_size: '18.4 MB',
    file_format: 'PDF',
    date: '2026.07.15',
    description_ko: '100% 해남 배추 포기김치 및 가공 발효식품의 유통기한, 보관온도(0~4℃), 가스차단 진공포장 기술 사양서.',
    description_en: 'Detailed storage guidelines (0-4°C), shelf life, and vacuum gas-barrier packaging specs for premium Poggi Kimchi.',
    download_url: '#',
    badge: 'FEATURED',
    icon_color: 'text-emerald-400',
  },
  {
    id: 'cat-3',
    title_ko: 'K-주류 & 전통주 (원소주 & 생막걸리) 해외 수출 가이드북',
    title_en: 'K-Liquor & Artisanal Spirits (Won Soju & Makgeolli) Export Guide',
    category: '주류 가이드북',
    file_size: '24.1 MB',
    file_format: 'PDF',
    date: '2026.06.30',
    description_ko: '원소주 24% 증류식 소주 및 느린마을 생막걸리 콜드체인 리퍼 컨테이너/에어 프레이트 물류 가이드.',
    description_en: 'Reefer container cold-chain and air-freight shipping protocols for Won Soju 24% and fresh raw Makgeolli.',
    download_url: '#',
    icon_color: 'text-blue-400',
  },
  {
    id: 'cat-4',
    title_ko: '송영민푸드 국제 품질 & 위생 인증서 모음집 (HACCP/Halal/FSSC)',
    title_en: 'Global Quality & Sanitation Certification Dossier (HACCP/Halal/FSSC 22000)',
    category: '품질 인증서',
    file_size: '12.8 MB',
    file_format: 'PDF',
    date: '2026.05.20',
    description_ko: 'HACCP, FSSC 22000, Halal(할랄), Vegan(비건), Gluten Free 국제 식품 안전 및 품질 인증서 원본 사본.',
    description_en: 'Certified food safety, Halal, Vegan, and FSSC 22000 compliance documentation for global FDA & import clearance.',
    download_url: '#',
    badge: 'MUST-HAVE',
    icon_color: 'text-red-400',
  },
  {
    id: 'cat-5',
    title_ko: 'B2B 대용량 식자재 & HMR 수제 밀키트 프랜차이즈 공급 카탈로그',
    title_en: 'Wholesale B2B Bulk Ingredients & Franchise HMR Meal Kit Catalogue',
    category: '도매/식자재',
    file_size: '31.5 MB',
    file_format: 'PDF',
    date: '2026.05.05',
    description_ko: '국내외 식자재 마트, 한국식당 프랜차이즈, 급식용 10개입 Box 및 대용량 소스 공급 단가 및 할인율 가이드.',
    description_en: 'Bulk box discount rates, wholesale pricing, and custom sauce marinade supply plans for restaurant chains.',
    download_url: '#',
    icon_color: 'text-purple-400',
  },
];

export default function CataloguesPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0C] text-stone-100 font-sans pb-24">
      {/* Top Hero Banner */}
      <div className="relative py-20 bg-gradient-to-b from-[#142319] via-[#0d140e] to-[#0A0A0C] border-b border-stone-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center space-x-2 text-[#EAB308] text-xs font-mono uppercase tracking-[0.25em] bg-amber-950/40 border border-amber-500/30 px-3 py-1 rounded-full">
            <Sparkles size={14} />
            <span>MEDIA LAB — 자료실 &amp; E-CATALOGUES</span>
          </div>

          <h1 className="font-serif-luxury text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            자료실 <span className="text-[#EAB308] font-normal">(Catalogues &amp; Resources)</span>
          </h1>

          <p className="text-stone-300 text-xs sm:text-sm max-w-2xl mx-auto font-light leading-relaxed">
            송영민푸드 K-Food 프리미엄 제품 카탈로그, 해외 수출용 사양서, 국제 식품 위생 인증서(HACCP/Halal) 및 물류 가이드북을 자유롭게 다운로드하실 수 있습니다.
          </p>

          <div className="pt-2 flex justify-center items-center space-x-4 text-xs text-stone-400 font-mono">
            <span className="flex items-center space-x-1">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>공식 인증 완료 (Verified PDF)</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <Globe size={14} className="text-amber-400" />
              <span>한글 &amp; 영문 겸용 지원</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Catalogues List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-stone-800 gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <FileDown className="text-[#EAB308]" size={20} />
              <span>E-카탈로그 &amp; 다운로드 자료 목록</span>
            </h2>
            <p className="text-xs text-stone-400 mt-1">
              해외 바이어 및 도매 파트너용 최신 사양서 (총 {CATALOGUES_DATA.length}건)
            </p>
          </div>

          <Link
            href="/rfq"
            className="inline-flex items-center space-x-2 bg-[#14532D] hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md"
          >
            <span>📋 맞춤 견적 신청 (RFQ)</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Catalogues Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
          {CATALOGUES_DATA.map((item) => (
            <div
              key={item.id}
              className="group bg-[#121218] border border-stone-800/90 hover:border-[#EAB308]/60 rounded-xl p-6 transition-all duration-300 shadow-xl flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Badge & Meta */}
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="px-2.5 py-1 bg-stone-900 border border-stone-700 text-amber-400 font-bold rounded">
                    {item.category}
                  </span>
                  <div className="flex items-center space-x-2 text-stone-400">
                    <span className="text-stone-300 font-bold">{item.file_format}</span>
                    <span>•</span>
                    <span>{item.file_size}</span>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-[#EAB308] transition-colors">
                    {item.title_ko}
                  </h3>
                  <p className="text-xs text-stone-400 font-mono mt-1 italic">
                    {item.title_en}
                  </p>
                </div>

                {/* Description */}
                <p className="text-xs text-stone-300 font-light leading-relaxed bg-[#0a0a0c] p-3 rounded-lg border border-stone-800/60">
                  {item.description_ko}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 mt-4 border-t border-stone-800/80 flex items-center justify-between gap-3">
                <span className="text-[11px] font-mono text-stone-500">
                  업데이트: {item.date}
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => alert(`${item.title_ko} 준비 중입니다.`)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded transition-colors"
                  >
                    <Eye size={13} />
                    <span>미리보기</span>
                  </button>

                  <a
                    href={item.download_url}
                    onClick={(e) => {
                      e.preventDefault();
                      alert(`[다운로드 시작] ${item.title_ko} (${item.file_size})`);
                    }}
                    className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-[#EAB308] hover:bg-amber-400 text-black text-xs font-extrabold rounded transition-colors shadow-md"
                  >
                    <Download size={13} />
                    <span>PDF 다운로드</span>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Global Inquiry Callout Box */}
        <div className="mt-16 bg-gradient-to-r from-stone-900 via-[#121814] to-stone-900 border border-emerald-800/50 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
          <h3 className="text-xl font-extrabold text-white">
            원하시는 제품 사양서나 영문 카탈로그가 없으신가요?
          </h3>
          <p className="text-xs sm:text-sm text-stone-300 max-w-xl mx-auto font-light">
            송영민푸드 글로벌 영업팀으로 문의해 주시면 custom MOQ, OEM/ODM 패키징 사양서 및 국가별 식약처 승인 서류를 즉시 전달해 드립니다.
          </p>
          <div className="pt-2">
            <Link
              href="/contact"
              className="inline-flex items-center space-x-2 bg-white text-stone-950 hover:bg-stone-200 font-extrabold px-6 py-3 rounded-lg text-xs transition-all shadow-lg"
            >
              <span>📩 1:1 담당자 문의하기</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
