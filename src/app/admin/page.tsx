import React from 'react';
import Link from 'next/link';
import {
  Layers,
  Film,
  FileText,
  Image as ImageIcon,
  ArrowRight,
  ShieldCheck,
  ShoppingCart,
  Users,
  TrendingUp,
  Package,
  Clock,
  BookOpen,
} from 'lucide-react';
import type { KpiData } from '@/app/api/kpi/route';

export const metadata = {
  title: '송영민푸드 관리자 대시보드 | Song Youngmin Food CMS',
  description: '송영민푸드 K-Food 마켓플레이스 실시간 대시보드 및 백오피스 관제실.',
};

async function fetchKpi(): Promise<KpiData & { configured: boolean }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/kpi`, {
      next: { revalidate: 60 }, // 1분 캐시
    });
    if (!res.ok) throw new Error('KPI fetch failed');
    const json = await res.json();
    return { ...json.data, configured: json.configured };
  } catch {
    // fallback: 모든 값 0
    return {
      totalOrders: 0,
      pendingOrders: 0,
      totalRevenue: 0,
      totalProducts: 0,
      publishedArticles: 0,
      totalUsers: 0,
      totalMediaItems: 0,
      activeMenus: 0,
      configured: false,
    };
  }
}

function formatCurrency(value: number) {
  if (value >= 1000000) return `₩${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `₩${(value / 1000).toFixed(0)}K`;
  return `₩${value}`;
}

export default async function AdminDashboardPage() {
  const kpi = await fetchKpi();

  const kpiCards = [
    {
      label: '총 주문 수',
      value: kpi.totalOrders.toString(),
      sub: `미처리 ${kpi.pendingOrders}건`,
      subColor: kpi.pendingOrders > 0 ? 'text-amber-400' : 'text-emerald-400',
      icon: ShoppingCart,
      iconColor: 'text-[#EAB308]',
    },
    {
      label: '총 매출액',
      value: formatCurrency(kpi.totalRevenue),
      sub: '누적 결제 합계',
      subColor: 'text-stone-500',
      icon: TrendingUp,
      iconColor: 'text-emerald-400',
    },
    {
      label: 'K-푸드 등록 상품',
      value: kpi.totalProducts.toString(),
      sub: '개 품목 판매중',
      subColor: 'text-stone-500',
      icon: Package,
      iconColor: 'text-sky-400',
    },
    {
      label: '가입 회원 수',
      value: kpi.totalUsers.toString(),
      sub: '명 등록됨',
      subColor: 'text-stone-500',
      icon: Users,
      iconColor: 'text-violet-400',
    },
  ];

  const cmsCards = [
    {
      label: '메뉴 엔진',
      value: kpi.activeMenus.toString(),
      sub: '활성 메뉴 개수',
      icon: Layers,
      iconColor: 'text-[#EAB308]',
      href: '/admin/navigation',
      linkLabel: '메뉴 관리 바로가기',
    },
    {
      label: '미디어 파일',
      value: kpi.totalMediaItems.toString(),
      sub: '업로드된 파일',
      icon: ImageIcon,
      iconColor: 'text-emerald-400',
      href: '/admin/media',
      linkLabel: '미디어 라이브러리',
    },
    {
      label: 'K-Food 저널 & Media Lab',
      value: kpi.publishedArticles.toString(),
      sub: '발행된 아티클 & 소식',
      icon: BookOpen,
      iconColor: 'text-amber-400',
      href: '/admin/journal',
      linkLabel: '저널 & Media Lab 바로가기',
    },
    {
      label: '미처리 대기 주문',
      value: kpi.pendingOrders.toString(),
      sub: '배송 대기중',
      icon: Clock,
      iconColor: kpi.pendingOrders > 0 ? 'text-red-400' : 'text-stone-500',
      href: '/admin/products',
      linkLabel: '제품/주문 확인',
    },
  ];

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto space-y-10 font-sans">

      {/* Top Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-stone-800 pb-6 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#EAB308] text-xs font-mono uppercase tracking-widest mb-1">
            <ShieldCheck size={16} />
            <span>송영민푸드 통합 관제실</span>
          </div>
          <h1 className="font-jakarta text-3xl font-bold text-white tracking-wide">
            실시간 백오피스 대시보드
          </h1>
          <p className="text-stone-400 text-xs mt-1">
            실시간 DB 연동 KPI · K-Food 제품/메뉴/히어로 CMS · 미디어 라이브러리 통합 관리
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!kpi.configured && (
            <span className="px-3 py-1 bg-amber-950/40 border border-amber-800/50 rounded text-amber-400 text-xs font-mono">
              ⚠ Supabase 미연결 (샘플 데이터)
            </span>
          )}
          <Link
            href="/"
            className="px-4 py-2 bg-[#14532D] hover:bg-[#1b6a3b] text-white font-semibold text-xs tracking-wider rounded transition-colors"
          >
            라이브 쇼핑몰 바로가기 &rarr;
          </Link>
        </div>
      </div>

      {/* Business KPI Cards */}
      <section>
        <h2 className="text-xs uppercase tracking-[0.2em] font-mono text-stone-500 mb-4">
          Business KPIs — Real-time DB
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="bg-[#121218] border border-stone-800 rounded-lg p-5 space-y-3 hover:border-[#c5a880]/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-mono text-stone-400">{card.label}</span>
                  <Icon className={card.iconColor} size={20} />
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="font-serif-luxury text-3xl text-white font-semibold">
                    {card.value}
                  </span>
                  <span className={`text-xs font-mono ${card.subColor}`}>{card.sub}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CMS Summary Cards */}
      <section>
        <h2 className="text-xs uppercase tracking-[0.2em] font-mono text-stone-500 mb-4">
          CMS Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {cmsCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="bg-[#121218] border border-stone-800 rounded-lg p-5 space-y-3 hover:border-[#c5a880]/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-mono text-stone-400">{card.label}</span>
                  <Icon className={card.iconColor} size={20} />
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="font-serif-luxury text-3xl text-white font-semibold">
                    {card.value}
                  </span>
                  <span className="text-xs text-stone-500 font-mono">{card.sub}</span>
                </div>
                <Link
                  href={card.href}
                  className="text-xs text-[#c5a880] hover:underline inline-flex items-center space-x-1 pt-1"
                >
                  <span>{card.linkLabel}</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* Feature Modules Quick Action Cards */}
      <section className="space-y-4">
        <h2 className="text-sm uppercase tracking-[0.2em] font-mono text-[#c5a880]">
          Admin Control Modules
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/admin/crm"
            className="group bg-[#121218] border border-amber-500/50 hover:border-amber-400 p-6 rounded-lg transition-all duration-300 flex items-start space-x-4 shadow-xl"
          >
            <div className="p-3 bg-amber-950/60 rounded border border-amber-500/50 text-amber-400">
              <Users size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif-luxury text-lg text-white group-hover:text-amber-300 transition-colors flex items-center space-x-2">
                <span>Buyer CRM &amp; RFQ Pipeline</span>
                <span className="bg-amber-500 text-black text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">B2B Trade</span>
              </h3>
              <p className="text-xs text-stone-400 font-light leading-relaxed">
                해외 바이어 관리, 8단계 파이프라인 (Lead ➔ Export), 글로벌 가격 마크업/할인 % Slider 제어.
              </p>
            </div>
          </Link>

          <Link
            href="/admin/navigation"
            className="group bg-[#121218] border border-stone-800 hover:border-[#c5a880] p-6 rounded-lg transition-all duration-300 flex items-start space-x-4"
          >
            <div className="p-3 bg-[#181822] rounded border border-stone-700 text-[#c5a880]">
              <Layers size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif-luxury text-lg text-white group-hover:text-[#c5a880] transition-colors">
                Menu Control Panel
              </h3>
              <p className="text-xs text-stone-400 font-light leading-relaxed">
                Header / Footer 메뉴 엔진 — Drag-and-drop 순서 변경 및 is_active 실시간 토글.
              </p>
            </div>
          </Link>

          <Link
            href="/admin/hero"
            className="group bg-[#121218] border border-stone-800 hover:border-[#c5a880] p-6 rounded-lg transition-all duration-300 flex items-start space-x-4"
          >
            <div className="p-3 bg-[#181822] rounded border border-stone-700 text-sky-400">
              <Film size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif-luxury text-lg text-white group-hover:text-[#c5a880] transition-colors">
                Hero Banner &amp; Media Slider
              </h3>
              <p className="text-xs text-stone-400 font-light leading-relaxed">
                MP4 영상 배경 및 고해상도 이미지 히어로 슬라이드 추가·수정.
              </p>
            </div>
          </Link>

          <Link
            href="/admin/content-blocks"
            className="group bg-[#121218] border border-stone-800 hover:border-[#c5a880] p-6 rounded-lg transition-all duration-300 flex items-start space-x-4"
          >
            <div className="p-3 bg-[#181822] rounded border border-stone-700 text-amber-400">
              <FileText size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif-luxury text-lg text-white group-hover:text-[#c5a880] transition-colors">
                Section Content Block Editor
              </h3>
              <p className="text-xs text-stone-400 font-light leading-relaxed">
                페이지별 섹션 헤드라인, 설명, 뱃지, 미디어 링크 편집.
              </p>
            </div>
          </Link>

          <Link
            href="/admin/media"
            className="group bg-[#121218] border border-stone-800 hover:border-[#c5a880] p-6 rounded-lg transition-all duration-300 flex items-start space-x-4"
          >
            <div className="p-3 bg-[#181822] rounded border border-stone-700 text-emerald-400">
              <ImageIcon size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif-luxury text-lg text-white group-hover:text-[#c5a880] transition-colors">
                Media Library &amp; File Upload
              </h3>
              <p className="text-xs text-stone-400 font-light leading-relaxed">
                이미지·영상 직접 업로드 또는 CDN URL 등록, URL 복사 기능.
              </p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
