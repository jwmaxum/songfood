import React from 'react';
import Link from 'next/link';
import { getJournalBySlug, getJournalArticles } from '@/lib/journal-db';
import { Calendar, ArrowLeft, Tag, Share2 } from 'lucide-react';

export async function generateStaticParams() {
  const articles = await getJournalArticles(true);
  return articles.map((a) => ({
    slug: a.slug,
  }));
}

export default async function NewsEventsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const article = await getJournalBySlug(resolvedParams.slug);

  if (!article) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] text-stone-100 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">기사를 찾을 수 없습니다.</h1>
          <Link href="/news-events" className="text-[#EAB308] hover:underline text-xs">
            ← 뉴스&amp;이벤트 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <article className="min-h-screen bg-[#0a0a0c] text-stone-100 font-sans pb-24">
      {/* Top Banner */}
      <div className="relative py-16 bg-gradient-to-b from-[#121814] via-[#0e120f] to-[#0a0a0c] border-b border-stone-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <Link
            href="/news-events"
            className="inline-flex items-center space-x-1.5 text-xs text-[#EAB308] hover:underline font-bold font-mono"
          >
            <ArrowLeft size={14} />
            <span>뉴스&amp;이벤트 목록</span>
          </Link>

          <div className="flex items-center space-x-3 text-xs text-stone-400 font-mono">
            <span className="px-2.5 py-0.5 bg-amber-950/60 border border-amber-500/30 text-amber-400 font-bold rounded">
              {article.category}
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <Calendar size={13} className="text-[#EAB308]" />
              <span>{article.published_date}</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
            {article.title}
          </h1>
        </div>
      </div>

      {/* Hero Cover Image */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="relative rounded-2xl overflow-hidden border border-stone-800 shadow-2xl">
          <img
            src={article.cover_image}
            alt={article.title}
            className="w-full h-80 sm:h-[420px] object-cover"
          />
        </div>

        {/* Content Body */}
        <div className="pt-10 text-stone-200 text-sm sm:text-base leading-relaxed space-y-6 font-light">
          <div className="p-4 bg-[#111118] border-l-4 border-[#EAB308] rounded-r-lg text-stone-300 italic font-mono text-xs sm:text-sm">
            {article.excerpt}
          </div>

          <div className="prose prose-invert max-w-none space-y-4 whitespace-pre-line text-stone-300">
            {article.content}
          </div>
        </div>

        {/* Bottom Back Button */}
        <div className="mt-12 pt-6 border-t border-stone-800 flex justify-between items-center">
          <Link
            href="/news-events"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-stone-900 border border-stone-700 hover:border-amber-400 text-stone-300 hover:text-white rounded-lg text-xs font-bold transition-all"
          >
            <ArrowLeft size={14} />
            <span>전체 뉴스&amp;이벤트 목록으로</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
