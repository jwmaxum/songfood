'use client';

import React from 'react';
import Link from 'next/link';
import { JournalArticle } from '@/lib/types';
import { BookOpen, ChevronRight, Utensils } from 'lucide-react';

interface RecipesSectionProps {
  articles: JournalArticle[];
}

export default function RecipesSection({ articles }: RecipesSectionProps) {
  if (!articles || articles.length === 0) return null;

  return (
    <section className="py-20 bg-white border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-4 border-b border-stone-200 gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-[#14532D] text-xs font-bold uppercase tracking-wider mb-1">
              <Utensils size={15} className="text-[#EAB308]" />
              <span>Culinary Culture &amp; Tips</span>
            </div>
            <h2 className="font-jakarta text-3xl font-extrabold text-stone-900 tracking-tight">
              Recipes &amp; Gourmet Journal
            </h2>
          </div>

          <Link
            href="/news-events"
            className="inline-flex items-center space-x-1 text-xs font-bold text-[#14532D] hover:text-emerald-700 uppercase tracking-wider"
          >
            <span>View All Articles</span>
            <ChevronRight size={15} />
          </Link>
        </div>

        {/* Article Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {articles.slice(0, 3).map((article) => (
            <div
              key={article.id}
              className="group bg-[#FAFAF8] rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div className="relative overflow-hidden aspect-[16/10]">
                <span className="absolute top-3 left-3 z-10 bg-[#14532D] text-white font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md shadow">
                  {article.category}
                </span>
                <img
                  src={article.cover_image}
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-[11px] font-semibold text-stone-400 font-mono">
                    {article.published_date}
                  </span>
                  <Link href={`/news-events/${article.slug}`}>
                    <h3 className="font-jakarta text-base font-bold text-stone-900 group-hover:text-[#14532D] transition-colors mt-1 line-clamp-2">
                      {article.title}
                    </h3>
                  </Link>
                  <p className="text-xs text-stone-600 font-normal line-clamp-2 mt-2 leading-relaxed">
                    {article.excerpt}
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
                  <Link
                    href={`/news-events/${article.slug}`}
                    className="inline-flex items-center space-x-1 text-xs font-bold text-[#14532D] hover:text-emerald-800"
                  >
                    <span>Read Recipe Story</span>
                    <BookOpen size={14} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
