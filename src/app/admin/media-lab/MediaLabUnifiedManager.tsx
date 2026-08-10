'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { JournalArticle } from '@/lib/types';
import JournalManager from '../journal/JournalManager';
import ContentBlockManager from '../content-blocks/ContentBlockManager';
import MediaManager from '../media/MediaManager';
import {
  FileText,
  FolderDown,
  ImageIcon,
  Sparkles,
  Layers,
  ArrowLeft,
  Plus,
  Trash2,
  Download,
  Upload,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

interface CatalogueAdminItem {
  id: string;
  title_ko: string;
  title_en: string;
  category: string;
  file_size: string;
  file_format: string;
  date: string;
  download_url: string;
}

const INITIAL_ADMIN_CATALOGUES: CatalogueAdminItem[] = [
  {
    id: 'cat-1',
    title_ko: '2026-2027 송영민푸드 K-Food 종합 수출 카탈로그',
    title_en: '2026-2027 Song Youngmin Food Comprehensive K-Food Export Catalogue',
    category: '종합 카탈로그',
    file_size: '45.2 MB',
    file_format: 'PDF',
    date: '2026.08.01',
    download_url: '/uploads/catalogue_2026_songfood.pdf',
  },
  {
    id: 'cat-2',
    title_ko: 'K-전통 발효식품 & 명품 포기김치 B2B 수출 사양서',
    title_en: 'Artisanal Poggi Kimchi & Fermented Foods B2B Specification Sheet',
    category: '제품 사양서',
    file_size: '18.4 MB',
    file_format: 'PDF',
    date: '2026.07.15',
    download_url: '/uploads/kimchi_b2b_spec.pdf',
  },
  {
    id: 'cat-3',
    title_ko: 'K-주류 & 전통주 (원소주 & 생막걸리) 해외 수출 가이드북',
    title_en: 'K-Liquor & Artisanal Spirits (Won Soju & Makgeolli) Export Guide',
    category: '주류 가이드북',
    file_size: '24.1 MB',
    file_format: 'PDF',
    date: '2026.06.30',
    download_url: '/uploads/k_liquor_export_guide.pdf',
  },
  {
    id: 'cat-4',
    title_ko: '송영민푸드 국제 품질 & 위생 인증서 모음집 (HACCP/Halal/FSSC)',
    title_en: 'Global Quality & Sanitation Certification Dossier (HACCP/Halal/FSSC 22000)',
    category: '품질 인증서',
    file_size: '12.8 MB',
    file_format: 'PDF',
    date: '2026.05.20',
    download_url: '/uploads/quality_certifications_dossier.pdf',
  },
];

export default function MediaLabUnifiedManager() {
  const [activeTab, setActiveTab] = useState<'news' | 'catalogues' | 'cdn'>('news');
  const [catalogues, setCatalogues] = useState<CatalogueAdminItem[]>(INITIAL_ADMIN_CATALOGUES);
  
  // Catalogue Upload Modal
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catTitleKo, setCatTitleKo] = useState('');
  const [catTitleEn, setCatTitleEn] = useState('');
  const [catCategory, setCatCategory] = useState('종합 카탈로그');
  const [catFileUrl, setCatFileUrl] = useState('');
  const [catFileSize, setCatFileSize] = useState('15.0 MB');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddCatalogue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catTitleKo) {
      alert('카탈로그 제목(한글)을 입력하세요.');
      return;
    }
    const newCat: CatalogueAdminItem = {
      id: `cat-${Date.now()}`,
      title_ko: catTitleKo,
      title_en: catTitleEn || catTitleKo,
      category: catCategory,
      file_size: catFileSize,
      file_format: 'PDF',
      date: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
      download_url: catFileUrl || '#',
    };
    setCatalogues([newCat, ...catalogues]);
    setIsCatModalOpen(false);
    setCatTitleKo('');
    setCatTitleEn('');
    setCatFileUrl('');
    showToast('새 자료실 카탈로그가 추가되었습니다.');
  };

  const handleDeleteCatalogue = (id: string) => {
    if (confirm('해당 카탈로그 자료를 삭제하시겠습니까?')) {
      setCatalogues(catalogues.filter((c) => c.id !== id));
      showToast('자료가 삭제되었습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-stone-100 font-sans p-6 sm:p-10">
      {/* Toast Notice */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border border-emerald-400 font-bold text-xs animate-bounce">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-stone-800">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 text-[#EAB308] text-xs font-mono uppercase tracking-widest bg-amber-950/40 border border-amber-500/30 px-3 py-1 rounded-full">
              <Sparkles size={13} />
              <span>UNIFIED MEDIA LAB CMS STUDIO</span>
            </div>
            <h1 className="font-serif-luxury text-2xl sm:text-3xl font-extrabold text-white">
              🎬 미디어랩 통합 관리 센터
            </h1>
            <p className="text-xs text-stone-400 font-light">
              뉴스&amp;이벤트 게시글 편집, 자료실 PDF 카탈로그 등록, 미디어 라이브러리 CDN을 한곳에서 통합 관리합니다.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/news-events"
              target="_blank"
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-stone-900 border border-stone-700 hover:border-amber-400 text-stone-300 hover:text-white rounded-lg text-xs font-bold transition-all"
            >
              <span>🌐 프론트 뉴스&amp;이벤트</span>
              <ExternalLink size={13} />
            </Link>
            <Link
              href="/catalogues"
              target="_blank"
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-stone-900 border border-stone-700 hover:border-amber-400 text-stone-300 hover:text-white rounded-lg text-xs font-bold transition-all"
            >
              <span>📁 프론트 자료실</span>
              <ExternalLink size={13} />
            </Link>
          </div>
        </div>

        {/* 3 Unified Tabs Navigation */}
        <div className="flex items-center space-x-2 border-b border-stone-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('news')}
            className={`flex items-center space-x-2 px-5 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'news'
                ? 'bg-[#14532D] text-white shadow-lg ring-1 ring-emerald-400/40'
                : 'bg-stone-900/80 text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <FileText size={16} className={activeTab === 'news' ? 'text-[#EAB308]' : ''} />
            <span>1. 뉴스&amp;이벤트 에디터 (News &amp; Events)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('catalogues')}
            className={`flex items-center space-x-2 px-5 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'catalogues'
                ? 'bg-amber-600 text-white shadow-lg ring-1 ring-amber-400/40'
                : 'bg-stone-900/80 text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <FolderDown size={16} className={activeTab === 'catalogues' ? 'text-yellow-200' : ''} />
            <span>2. 자료실 카탈로그 관리 (Catalogues)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cdn')}
            className={`flex items-center space-x-2 px-5 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'cdn'
                ? 'bg-purple-900 text-white shadow-lg ring-1 ring-purple-400/40'
                : 'bg-stone-900/80 text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <ImageIcon size={16} className={activeTab === 'cdn' ? 'text-purple-300' : ''} />
            <span>3. 미디어 CDN &amp; 섹션 콘텐츠</span>
          </button>
        </div>

        {/* Tab 1: News & Events Manager */}
        {activeTab === 'news' && (
          <div className="bg-[#111118] border border-stone-800/80 rounded-2xl p-6 shadow-2xl">
            <JournalManager />
          </div>
        )}

        {/* Tab 2: Catalogues Manager */}
        {activeTab === 'catalogues' && (
          <div className="bg-[#111118] border border-stone-800/80 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-stone-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <FolderDown size={20} className="text-[#EAB308]" />
                  <span>자료실 (Catalogues) 다운로드 파일 관리</span>
                </h2>
                <p className="text-xs text-stone-400 mt-1">
                  프론트엔드 `/catalogues` 페이지에 노출되는 PDF 종합 카탈로그, 사양서, 품질 인증서를 등록/삭제합니다.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCatModalOpen(true)}
                className="inline-flex items-center space-x-2 bg-[#EAB308] hover:bg-amber-400 text-black font-extrabold px-4 py-2 rounded-lg text-xs transition-all shadow-md"
              >
                <Plus size={15} />
                <span>새 카탈로그 자료 추가</span>
              </button>
            </div>

            {/* Catalogues Admin Table */}
            <div className="overflow-x-auto rounded-xl border border-stone-800">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0A0A0C] text-stone-400 uppercase border-b border-stone-800">
                  <tr>
                    <th className="py-3 px-4">카테고리</th>
                    <th className="py-3 px-4">자료명 (한글 / 영문)</th>
                    <th className="py-3 px-4">용량</th>
                    <th className="py-3 px-4">등록일</th>
                    <th className="py-3 px-4 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 bg-[#121218] text-stone-200">
                  {catalogues.map((cat) => (
                    <tr key={cat.id} className="hover:bg-stone-900/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-amber-400">
                        <span className="bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded text-[11px]">
                          {cat.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white font-sans">{cat.title_ko}</div>
                        <div className="text-[11px] text-stone-400 italic">{cat.title_en}</div>
                      </td>
                      <td className="py-3.5 px-4 text-stone-300">{cat.file_size}</td>
                      <td className="py-3.5 px-4 text-stone-400">{cat.date}</td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleDeleteCatalogue(cat.id)}
                          className="p-1.5 bg-red-950/50 hover:bg-red-900 border border-red-500/30 text-red-400 rounded transition-colors"
                          title="삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: CDN Media Library & Content Blocks */}
        {activeTab === 'cdn' && (
          <div className="space-y-8">
            <div className="bg-[#111118] border border-stone-800/80 rounded-2xl p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2 border-b border-stone-800 pb-3">
                <ImageIcon size={20} className="text-purple-400" />
                <span>미디어 라이브러리 CDN 이미지/동영상 업로드</span>
              </h2>
              <MediaManager />
            </div>

            <div className="bg-[#111118] border border-stone-800/80 rounded-2xl p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2 border-b border-stone-800 pb-3">
                <Layers size={20} className="text-emerald-400" />
                <span>페이지 섹션 타이틀 &amp; 미디어 블록 편집</span>
              </h2>
              <ContentBlockManager />
            </div>
          </div>
        )}
      </div>

      {/* Catalogue Add Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121218] border border-stone-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2 pb-3 border-b border-stone-800">
              <FolderDown size={18} className="text-[#EAB308]" />
              <span>새 자료실 카탈로그 추가</span>
            </h3>

            <form onSubmit={handleAddCatalogue} className="space-y-4 text-xs">
              <div>
                <label className="block text-stone-300 font-bold mb-1">카테고리</label>
                <select
                  value={catCategory}
                  onChange={(e) => setCatCategory(e.target.value)}
                  className="w-full bg-[#0A0A0C] border border-stone-700 rounded-lg p-2.5 text-white"
                >
                  <option value="종합 카탈로그">종합 카탈로그</option>
                  <option value="제품 사양서">제품 사양서</option>
                  <option value="주류 가이드북">주류 가이드북</option>
                  <option value="품질 인증서">품질 인증서</option>
                  <option value="도매/식자재">도매/식자재</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-300 font-bold mb-1">자료명 (한글)</label>
                <input
                  type="text"
                  required
                  value={catTitleKo}
                  onChange={(e) => setCatTitleKo(e.target.value)}
                  placeholder="예: 2026 송영민푸드 K-Food 종합 수출 카탈로그"
                  className="w-full bg-[#0A0A0C] border border-stone-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-bold mb-1">자료명 (영문)</label>
                <input
                  type="text"
                  value={catTitleEn}
                  onChange={(e) => setCatTitleEn(e.target.value)}
                  placeholder="e.g. 2026 Song Youngmin Food Export Catalogue"
                  className="w-full bg-[#0A0A0C] border border-stone-700 rounded-lg p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-bold mb-1">PDF 파일 URL 또는 파일 선택</label>
                <input
                  type="text"
                  value={catFileUrl}
                  onChange={(e) => setCatFileUrl(e.target.value)}
                  placeholder="https://... 또는 /uploads/catalogue.pdf"
                  className="w-full bg-[#0A0A0C] border border-stone-700 rounded-lg p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-bold mb-1">파일 용량 (표기용)</label>
                <input
                  type="text"
                  value={catFileSize}
                  onChange={(e) => setCatFileSize(e.target.value)}
                  placeholder="예: 25.4 MB"
                  className="w-full bg-[#0A0A0C] border border-stone-700 rounded-lg p-2.5 text-white font-mono"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg font-bold"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#EAB308] hover:bg-amber-400 text-black font-extrabold rounded-lg shadow-md"
                >
                  추가 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
