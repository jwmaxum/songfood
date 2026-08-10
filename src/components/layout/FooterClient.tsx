'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import LanguageSelector from './LanguageSelector';
import { ArrowUpRight, ShieldCheck, Globe, Mail, Phone, MapPin } from 'lucide-react';

export default function FooterClient({ menus }: { menus: any[] }) {
  const { t } = useLanguage();

  return (
    <footer className="bg-[#050806] text-stone-400 border-t border-emerald-900/40 pt-16 pb-12 font-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-16 border-b border-emerald-900/30">
          
          {/* Brand Info & Language Selector */}
          <div className="md:col-span-4 space-y-4">
            <Link href="/" className="inline-block">
              <img
                src="/logo.png"
                alt="송영민푸드 (Song Youngmin Food) - K-Food, Korea Food &amp; K-Fresh Food"
                className="h-10 w-auto object-contain"
              />
            </Link>
            <p className="text-xs text-stone-400 leading-relaxed max-w-sm">
              송영민푸드 (Song Youngmin Food Co., Ltd.) | Premium K-Food, Korea Food &amp; K-Fresh Food Marketplace. 대한민국 대표 K-냉동식품, 포기김치, K-치킨 및 명품 전통주 24시간 에어 프레시 직배송.
            </p>
            
            <div className="text-[11px] text-stone-500 space-y-1 font-mono pt-1">
              <div className="flex items-center space-x-1.5">
                <MapPin size={12} className="text-[#c59b27]" />
                <span>부산광역시 동구 초량상로 123 송영민푸드 빌딩 / 부산항 콜드체인 물류센터</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Mail size={12} className="text-[#c59b27]" />
                <span>export@songyoungminfood.com | support@songyoungminfood.com</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Phone size={12} className="text-[#c59b27]" />
                <span>고객센터: 1588-1004 / 해외 수출 직통: +82-51-714-1004</span>
              </div>
            </div>

            <div className="pt-2">
              <LanguageSelector />
            </div>
          </div>

          {/* Policy, Terms & Navigation Links */}
          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {/* Group 1: 회사 소개 & 브랜딩 */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase font-mono tracking-widest text-[#c59b27] font-semibold">
                Company &amp; Story
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/about" className="hover:text-white transition-colors duration-200 inline-flex items-center group">
                    <span>🏢 회사 소개 &amp; 경영철학</span>
                    <ArrowUpRight size={12} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-[#c59b27]" />
                  </Link>
                </li>
                <li>
                  <Link href="/why-kfood" className="hover:text-white transition-colors duration-200 inline-flex items-center group">
                    <span>🏆 Why K-Food &amp; 품질인증</span>
                    <ArrowUpRight size={12} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-[#c59b27]" />
                  </Link>
                </li>
                <li>
                  <Link href="/rfq" className="hover:text-white transition-colors duration-200 inline-flex items-center group">
                    <span>🌐 Overseas Buyer RFQ</span>
                    <ArrowUpRight size={12} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-[#c59b27]" />
                  </Link>
                </li>
                <li>
                  <Link href="/news-events" className="hover:text-white transition-colors duration-200 inline-flex items-center group">
                    <span>📰 Media Lab &amp; 뉴스&amp;이벤트</span>
                    <ArrowUpRight size={12} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-[#c59b27]" />
                  </Link>
                </li>
              </ul>
            </div>

            {/* Group 2: 쇼핑 & B2B 수출 */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase font-mono tracking-widest text-[#c59b27] font-semibold">
                Shopping &amp; B2B Export
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/shop" className="hover:text-white transition-colors duration-200 inline-flex items-center group">
                    <span>🛒 K-Food 프리미엄 쇼핑몰</span>
                    <ArrowUpRight size={12} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-[#c59b27]" />
                  </Link>
                </li>
                <li>
                  <Link href="/rfq" className="hover:text-white transition-colors duration-200 inline-flex items-center group">
                    <span>📋 B2B / RFQ 견적 신청</span>
                    <ArrowUpRight size={12} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-[#c59b27]" />
                  </Link>
                </li>
                <li>
                  <Link href="/news-events" className="hover:text-white transition-colors duration-200 inline-flex items-center group">
                    <span>📰 뉴스&amp;이벤트 (News &amp; Events)</span>
                    <ArrowUpRight size={12} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-[#c59b27]" />
                  </Link>
                </li>
                <li>
                  <Link href="/catalogues" className="hover:text-white transition-colors duration-200 inline-flex items-center group">
                    <span>📁 자료실 (Catalogues)</span>
                    <ArrowUpRight size={12} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-[#c59b27]" />
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white transition-colors duration-200 inline-flex items-center group">
                    <span>✉️ 1:1 도매 문의하기</span>
                    <ArrowUpRight size={12} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-[#c59b27]" />
                  </Link>
                </li>
              </ul>
            </div>

            {/* Group 3: 회사 정책 & 약관 */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase font-mono tracking-widest text-[#c59b27] font-semibold">
                Legal &amp; Policy
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/privacy" className="text-stone-200 font-bold hover:text-[#c59b27] transition-colors duration-200 inline-flex items-center group">
                    <span>🔒 개인정보처리방침</span>
                    <ArrowUpRight size={12} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-[#c59b27]" />
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-stone-200 font-bold hover:text-[#c59b27] transition-colors duration-200 inline-flex items-center group">
                    <span>📜 서비스 이용약관</span>
                    <ArrowUpRight size={12} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-[#c59b27]" />
                  </Link>
                </li>
                <li>
                  <Link href="/terms#shipping" className="hover:text-white transition-colors duration-200 inline-flex items-center group">
                    <span>🚚 배송 &amp; 환불 정책</span>
                    <ArrowUpRight size={12} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-[#c59b27]" />
                  </Link>
                </li>
                <li>
                  <Link href="/admin" className="text-[#c59b27] font-bold hover:underline inline-flex items-center group">
                    <span>🛡️ 관리자 백오피스</span>
                    <ArrowUpRight size={12} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-[#c59b27]" />
                  </Link>
                </li>
              </ul>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-stone-500 gap-4 font-light">
          <p>© {new Date().getFullYear()} 송영민푸드 (Song Youngmin Food Co., Ltd.). All rights reserved.</p>
          <div className="flex space-x-6 text-[11px]">
            <Link href="/privacy" className="hover:text-stone-300 font-medium transition-colors">개인정보처리방침</Link>
            <Link href="/terms" className="hover:text-stone-300 font-medium transition-colors">이용약관</Link>
            <Link href="/contact" className="hover:text-stone-300 transition-colors">고객지원</Link>
            <Link href="/admin" className="text-[#c59b27] hover:underline font-bold">Admin Studio</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
