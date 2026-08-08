'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ProductItem } from '@/lib/types';
import { useCart } from '@/context/CartContext';
import { ShoppingBag, Star, Award, ChevronRight } from 'lucide-react';

interface BestSellersProps {
  products: ProductItem[];
}

export default function BestSellers({ products }: BestSellersProps) {
  const { addToCart } = useCart();
  const [activeCategory, setActiveCategory] = useState<string>('전체');

  const categories = ['전체', 'K-냉동식품', 'K-전통식품', 'K-간편식/HMR', 'K-주류 & 전통주', 'K-소스/조미료'];

  // Filter products by admin is_best_seller selection
  const bestSellerPool = products.filter((p) => p.is_best_seller === true).length > 0
    ? products.filter((p) => p.is_best_seller === true)
    : products;

  const filteredProducts = activeCategory === '전체'
    ? bestSellerPool
    : bestSellerPool.filter((p) => p.collection.toLowerCase() === activeCategory.toLowerCase());

  return (
    <section className="py-20 bg-[#FAFAF8] border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header and Filter Tabs */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-4 border-b border-stone-200 gap-6">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-[#14532D] text-xs font-bold uppercase tracking-wider mb-1">
              <Award size={16} className="text-[#EAB308]" />
              <span>관리자 엄선 인기 상품</span>
            </div>
            <h2 className="font-jakarta text-3xl font-extrabold text-stone-900 tracking-tight">
              송영민푸드 베스트셀러 컬렉션
            </h2>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeCategory === cat
                    ? 'bg-[#14532D] text-white shadow-md'
                    : 'bg-white text-stone-600 border border-stone-200 hover:border-[#14532D]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.slice(0, 4).map((product, idx) => (
            <div
              key={product.id}
              className="group bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative"
            >
              {/* Rank Badge */}
              <div className="absolute top-3 left-3 z-10 bg-[#14532D] text-[#EAB308] font-mono font-extrabold text-xs px-2.5 py-1 rounded-lg shadow-md flex items-center space-x-1">
                <span>#{idx + 1} Best</span>
              </div>

              {/* Product Image */}
              <div className="relative overflow-hidden aspect-square bg-stone-50">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Product Info */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                    {product.origin || '대한민국 (Korea)'}
                  </span>
                  <Link href={`/products/${product.id}`}>
                    <h3 className="font-jakarta text-sm font-bold text-stone-900 group-hover:text-[#14532D] transition-colors mt-1 line-clamp-2">
                      {product.name}
                    </h3>
                  </Link>
                </div>

                <div className="flex items-center space-x-1 text-amber-500 text-xs">
                  <Star size={13} fill="currentColor" />
                  <span className="font-bold text-stone-800 ml-1">{product.rating || 4.9}</span>
                  <span className="text-stone-400">({product.reviews_count || 48}개 후기)</span>
                </div>

                <div className="pt-2 border-t border-stone-100 space-y-2">
                  <div className="flex flex-col text-xs font-mono">
                    <div className="flex justify-between items-center text-[#14532D] font-bold">
                      <span>소량 개별가:</span>
                      <span>₩{(product.price || 10000).toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between items-center text-amber-700 font-bold">
                      <span>📦 대용량(10개입):</span>
                      <span>₩{Math.round((product.price || 10000) * (product.carton_qty || 10) * 0.85).toLocaleString()}원</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 gap-2">
                    <button
                      onClick={() => addToCart(product, 1)}
                      className="flex-1 flex items-center justify-center space-x-1 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 px-2 py-2 rounded-xl font-bold text-xs transition-all"
                    >
                      <ShoppingBag size={13} />
                      <span>장바구니</span>
                    </button>

                    <button
                      onClick={() => {
                        addToCart(product, 1);
                        window.location.href = '/checkout';
                      }}
                      className="flex-1 flex items-center justify-center space-x-1 bg-[#14532D] hover:bg-emerald-800 text-white font-extrabold text-xs px-2 py-2 rounded-xl transition-all shadow"
                    >
                      <span>⚡ 바로 결제</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="mt-12 text-center">
          <Link
            href="/shop"
            className="inline-flex items-center space-x-2 bg-white border border-stone-300 hover:border-[#14532D] text-stone-800 hover:text-[#14532D] font-bold text-sm px-8 py-3.5 rounded-xl shadow-sm hover:shadow transition-all"
          >
            <span>전체 베스트셀러 상품 보기</span>
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}


