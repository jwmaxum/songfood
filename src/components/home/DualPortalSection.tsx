'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingBag, Building2, Globe, FileText, ArrowRight, ShieldCheck, Truck, Calculator, BadgeCheck } from 'lucide-react';

export default function DualPortalSection() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0A0A0C] via-stone-900 to-[#121218] text-white">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-[11px] uppercase tracking-[0.3em] font-extrabold text-[#EAB308] font-jakarta">
            Dual Business Access Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-jakarta">
            K-FOOD Trading Platform Access Point
          </h2>
          <p className="text-stone-400 text-sm">
            국내 일반 소비자/식당/도매상과 해외 수출 바이어를 위한 맞춤형 비즈니스 플랫폼에 접속하세요.
          </p>
        </div>

        {/* Dual Portal Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Portal 1: DOMESTIC CONSUMER & B2B SHOP */}
          <div className="relative group rounded-2xl bg-gradient-to-br from-stone-900/90 to-emerald-950/40 border border-emerald-800/40 p-8 shadow-2xl hover:border-emerald-500/80 transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <StoreIcon className="w-40 h-40 text-emerald-400" />
            </div>

            <div className="space-y-6 relative z-10">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-300 text-xs font-bold">
                <span>🇰🇷 국내 고객 &amp; 식당/도매</span>
              </div>

              <div>
                <h3 className="text-2xl font-extrabold text-white mb-2 font-jakarta">
                  K-FOOD DOMESTIC SHOP &amp; WHOLESALE
                </h3>
                <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
                  국내 소비자를 위한 소량 신선 주문부터 식당·마트·도매상을 위한 업소용 대용량 식자재 공급까지 빠른 국내 익일배송 및 도매가 적용.
                </p>
              </div>

              {/* Feature Pills */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex items-center space-x-2 bg-stone-950/60 border border-stone-800 p-2.5 rounded-lg text-xs text-stone-200">
                  <ShoppingBag size={15} className="text-emerald-400" />
                  <span>상품 ➔ 장바구니 ➔ 즉시결제</span>
                </div>
                <div className="flex items-center space-x-2 bg-stone-950/60 border border-stone-800 p-2.5 rounded-lg text-xs text-stone-200">
                  <Truck size={15} className="text-emerald-400" />
                  <span>콜드체인 전국 익일배송</span>
                </div>
                <div className="flex items-center space-x-2 bg-stone-950/60 border border-stone-800 p-2.5 rounded-lg text-xs text-stone-200">
                  <Building2 size={15} className="text-emerald-400" />
                  <span>식당/도매상 대량 구매 할인</span>
                </div>
                <div className="flex items-center space-x-2 bg-stone-950/60 border border-stone-800 p-2.5 rounded-lg text-xs text-stone-200">
                  <ShieldCheck size={15} className="text-emerald-400" />
                  <span>100% 국내산 정품 품질보증</span>
                </div>
              </div>
            </div>

            <div className="pt-8 relative z-10">
              <Link
                href="/shop"
                className="w-full px-5 py-3.5 bg-[#14532D] hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg"
              >
                <ShoppingBag size={16} />
                <span>국내 K-FOOD 쇼핑몰 입장</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Portal 2: GLOBAL B2B & EXPORT PLATFORM */}
          <div className="relative group rounded-2xl bg-gradient-to-br from-stone-900/90 to-amber-950/40 border border-amber-500/50 p-8 shadow-2xl hover:border-amber-400 transition-all duration-300 flex flex-col justify-between overflow-hidden ring-1 ring-amber-500/20">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Globe className="w-40 h-40 text-amber-400" />
            </div>

            <div className="space-y-6 relative z-10">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-400/50 text-amber-300 text-xs font-extrabold">
                <Globe size={13} className="animate-spin" />
                <span>🌎 GLOBAL B2B &amp; EXPORT PLATFORM</span>
              </div>

              <div>
                <h3 className="text-2xl font-extrabold text-white mb-2 font-jakarta">
                  K-FOOD OVERSEAS BUYER HUB
                </h3>
                <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
                  해외 바이어 및 무역상 전용 허브. 수출 전용 CBM/HS Code/MOQ 데이터, Incoterms 견적 자동 계산기, Pro Forma PDF 견적서 실시간 출력 지원.
                </p>
              </div>

              {/* Feature Pills */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex items-center space-x-2 bg-stone-950/60 border border-amber-900/40 p-2.5 rounded-lg text-xs text-amber-100">
                  <Calculator size={15} className="text-[#EAB308]" />
                  <span>FOB/CIF Quote Calculator</span>
                </div>
                <div className="flex items-center space-x-2 bg-stone-950/60 border border-amber-900/40 p-2.5 rounded-lg text-xs text-amber-100">
                  <FileText size={15} className="text-[#EAB308]" />
                  <span>Instant Pro Forma PDF Quote</span>
                </div>
                <div className="flex items-center space-x-2 bg-stone-950/60 border border-amber-900/40 p-2.5 rounded-lg text-xs text-amber-100">
                  <BadgeCheck size={15} className="text-[#EAB308]" />
                  <span>HACCP / Halal / Vegan Filter</span>
                </div>
                <div className="flex items-center space-x-2 bg-stone-950/60 border border-amber-900/40 p-2.5 rounded-lg text-xs text-amber-100">
                  <Building2 size={15} className="text-[#EAB308]" />
                  <span>OEM / Private Label Support</span>
                </div>
              </div>
            </div>

            <div className="pt-8 flex flex-col sm:flex-row gap-3 relative z-10">
              <Link
                href="/rfq"
                className="flex-1 px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center space-x-2 shadow-xl"
              >
                <Globe size={16} />
                <span>Overseas Buyer RFQ 입장</span>
                <ArrowRight size={14} />
              </Link>

              <Link
                href="/rfq"
                className="px-5 py-3 bg-black/80 hover:bg-stone-900 text-amber-400 border border-amber-500/60 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center space-x-2"
              >
                <FileText size={16} />
                <span>Request a Quote (RFQ)</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StoreIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
      />
    </svg>
  );
}
