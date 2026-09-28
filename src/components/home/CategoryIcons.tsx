'use client';

import React from 'react';
import Link from 'next/link';
import { ProductItem } from '@/lib/types';
import { PRODUCT_COLLECTIONS } from '@/lib/product-taxonomy';

interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  url: string;
  colorBg: string;
  count: string;
}

const ICONS = ['🥬', '🥟', '🥘', '🍜', '🫙', '🌊', '🍪', '🍶', '🍵'];

export default function CategoryIcons({ products }: { products: ProductItem[] }) {
  const categories: CategoryItem[] = PRODUCT_COLLECTIONS.map((collection, index) => ({
    id: collection,
    name: collection,
    icon: ICONS[index],
    url: `/collections?collection=${encodeURIComponent(collection)}`,
    colorBg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
    count: `${products.filter((product) => product.collection === collection).length} 품목`,
  }));
  return (
    <section className="py-14 bg-white border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold text-[#14532D] uppercase tracking-[0.2em]">Quick Explore</span>
          <h2 className="font-jakarta text-2xl sm:text-3xl font-extrabold text-stone-900 mt-1">
            K-푸드 &amp; K-주류 카테고리
          </h2>
        </div>

        {/* Circular Category Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={cat.url}
              className="group flex flex-col items-center text-center p-4 rounded-2xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div
                className={`w-20 h-20 rounded-full border ${cat.colorBg} flex items-center justify-center text-3xl shadow-sm group-hover:shadow-md transition-all mb-3 relative`}
              >
                <span>{cat.icon}</span>
                <span className="absolute -bottom-1 bg-[#14532D] text-white text-[9px] font-bold px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  GO
                </span>
              </div>
              <h3 className="font-jakarta text-sm font-bold text-stone-800 group-hover:text-[#14532D] transition-colors">
                {cat.name}
              </h3>
              <span className="text-[11px] font-medium text-stone-400 mt-0.5">{cat.count}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
