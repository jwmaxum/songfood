import React from 'react';
import Link from 'next/link';
import { getJournalArticles } from '@/lib/journal-db';
import { Sparkles, Calendar, ArrowRight } from 'lucide-react';

export const metadata = {
  title: '뉴스&이벤트 (News & Events) | 송영민푸드 (Song Youngmin Food)',
  description: '송영민푸드 K-Food 신제품 출시 소식, 글로벌 식품 엑스포(Expo) 참관, 언론 보도자료 및 이벤트.',
};

export default async function NewsEventsPage() {
  const articles = await getJournalArticles(true);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-stone-100 font-sans pb-24">
      {/* Top Banner */}
      <div className="relative py-20 bg-gradient-to-b from-[#121814] via-[#0e120f] to-[#0a0a0c] border-b border-stone-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center space-x-2 text-[#EAB308] text-xs font-mono uppercase tracking-[0.25em] bg-amber-950/40 border border-amber-500/30 px-3 py-1 rounded-full">
            <Sparkles size={14} />
            <span>MEDIA LAB — NEWS &amp; EVENTS</span>
          </div>
          <h1 className="font-serif-luxury text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            뉴스&amp;이벤트 <span className="text-[#EAB308] font-normal">(News &amp; Events)</span>
          </h1>
          <p className="text-stone-300 text-xs sm:text-sm max-w-xl mx-auto font-light leading-relaxed">
            송영민푸드 최신 보도자료, 해외 K-Food 엑스포 참관 소식, 신제품 런칭 및 브랜드 스토리를 만나보세요.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.map((art) => (
            <div
              key={art.id}
              className="group bg-[#121217] border border-stone-800 rounded-xl overflow-hidden flex flex-col justify-between hover:border-[#EAB308]/60 transition-all duration-500 shadow-xl"
            >
              {/* Image */}
              <div className="relative h-60 overflow-hidden bg-stone-900">
                <img
                  src={art.cover_image}
                  alt={art.title}
                  className="w-full h-full object-cover img-zoom-hover"
                />
                <div className="absolute top-3 left-3 px-2.5 py-0.5 bg-black/80 border border-white/10 backdrop-blur-md rounded text-[10px] uppercase font-mono text-[#EAB308] font-bold">
                  {art.category}
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-3 flex-grow flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-[10px] text-stone-400 font-mono">
                    <Calendar size={12} className="text-[#EAB308]" />
                    <span>{art.published_date}</span>
                  </div>
                  <h2 className="font-serif-luxury text-lg text-white font-bold group-hover:text-[#EAB308] transition-colors leading-snug">
                    {art.title}
                  </h2>
                  <p className="text-xs text-stone-300 font-light leading-relaxed line-clamp-3">
                    {art.excerpt}
                  </p>
                </div>

                <div className="pt-4 border-t border-stone-800/60">
                  <Link
                    href={`/news-events/${art.slug}`}
                    className="inline-flex items-center text-xs tracking-wider text-[#EAB308] group-hover:text-white uppercase font-bold"
                  >
                    <span>기사 보기 (Read Article)</span>
                    <ArrowRight size={14} className="ml-1.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
