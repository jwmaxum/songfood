import React from 'react';
import { getProducts } from '@/lib/products-db';
import LabelDashboardTable from '@/components/admin/labels/LabelDashboardTable';

export const metadata = {
  title: 'K-Food 글로벌 라벨링 스튜디오 | 송영민푸드 관리자',
  description: '송영민푸드 300여 K-Food 품목의 5대 수출 대상국(미국, 중국, 일본, EU, UAE) 라벨링 컴플라이언스 현황 및 6대 표준 블록 통합 관리 스튜디오.',
};

export default async function AdminLabelsPage() {
  const products = await getProducts();

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 타이틀 헤더 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-stone-800 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#c5a880]/20 text-[#c5a880] border border-[#c5a880]/30 font-mono">
              GLOBAL FOOD MASTER LABELING
            </span>
            <span className="text-xs text-stone-400 font-mono">Ver 2.5 Multi-Country Engine</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1">
            🏷️ K-Food 수출 라벨링 통합 워크스페이스
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            미국 FDA/USDA, 중국 SAMR/GACC, 일본 소비자청, 유럽연합 EFSA, 중동 MoIAT 5대 권역 규정 실시간 검증 & 6대 블록 스튜디오.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <a
            href="/labeling"
            target="_blank"
            className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5"
          >
            <span>🌐 공개 쇼케이스 보기</span>
            <span>&nearr;</span>
          </a>
        </div>
      </div>

      {/* 대시보드 테이블 */}
      <LabelDashboardTable products={products} />
    </div>
  );
}
