'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProductItem } from '@/lib/types';
import { useCart } from '@/context/CartContext';
import { Clock, ShoppingBag, Star, Zap } from 'lucide-react';

interface TodaysDealsProps {
  products: ProductItem[];
}

export default function TodaysDeals({ products }: TodaysDealsProps) {
  const { addToCart } = useCart();
  const [timeLeft, setTimeLeft] = useState({ hours: 14, minutes: 32, seconds: 45 });

  // Live countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 23, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter products that are designated as Today's Deals by Admin or fallback to discounted items
  const dealProducts = products.filter((p) => p.is_todays_deal === true).length > 0
    ? products.filter((p) => p.is_todays_deal === true)
    : products.filter((p) => p.original_price && p.original_price > (p.price || 0));

  if (dealProducts.length === 0) return null;

  return (
    <section className="py-16 bg-[#FAFAF8] border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Bar with Countdown Timer */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-4 border-b border-stone-200 gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-[#DC2626] text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              <Zap size={13} className="animate-pulse" />
              <span>오늘의 한정 특가 (TODAY'S DEAL)</span>
            </div>
            <h2 className="font-jakarta text-3xl font-extrabold text-stone-900 tracking-tight">
              오늘의 특가 타임세일
            </h2>
          </div>

          {/* Countdown Timer Badge */}
          <div className="flex items-center space-x-2 bg-white border border-stone-200 px-4 py-2 rounded-xl shadow-sm">
            <Clock size={16} className="text-[#DC2626] animate-spin" />
            <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider mr-1">마감 임박까지:</span>
            <div className="flex items-center space-x-1 font-mono font-bold text-sm text-[#14532D]">
              <span className="bg-stone-100 px-2 py-1 rounded text-stone-900">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span>:</span>
              <span className="bg-stone-100 px-2 py-1 rounded text-stone-900">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span>:</span>
              <span className="bg-[#DC2626] text-white px-2 py-1 rounded">
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>

        {/* Deal Products Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {dealProducts.slice(0, 3).map((product) => {
            const discountPercent = product.deal_discount_percent || Math.round(
              (((product.original_price || 0) - (product.price || 0)) / (product.original_price || 1)) * 100
            ) || 20;

            return (
              <div
                key={product.id}
                className="group bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div className="relative overflow-hidden aspect-[4/3] bg-stone-100">
                  {/* Discount Badge */}
                  <div className="absolute top-3 left-3 z-10 bg-[#DC2626] text-white font-extrabold text-xs px-2.5 py-1 rounded-md shadow-md">
                    🔥 {discountPercent}% 특가 할인
                  </div>

                  {/* Product Image */}
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-[11px] font-bold text-[#EAB308] uppercase tracking-wider">
                      {product.collection}
                    </span>
                    <Link href={`/products/${product.id}`}>
                      <h3 className="font-jakarta text-base font-bold text-stone-900 group-hover:text-[#14532D] transition-colors mt-1 line-clamp-2">
                        {product.name}
                      </h3>
                    </Link>
                  </div>

                  <div className="flex items-center space-x-1 text-amber-500 text-xs">
                    <Star size={14} fill="currentColor" />
                    <span className="font-bold text-stone-800 ml-1">{product.rating || 4.9}</span>
                    <span className="text-stone-400">({product.reviews_count || 32}개 후기)</span>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline space-x-2">
                        <span className="font-jakarta text-xl font-extrabold text-[#14532D]">
                          ₩{(product.price || 0).toLocaleString()}원
                        </span>
                        {product.original_price && (
                          <span className="text-xs text-stone-400 line-through">
                            ₩{product.original_price.toLocaleString()}원
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                        당일 즉시 출고 (재고 {product.stock || 99}개)
                      </span>
                    </div>

                    <button
                      onClick={() => addToCart(product, 1)}
                      className="flex items-center space-x-1 bg-[#14532D] hover:bg-[#166534] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition-all"
                    >
                      <ShoppingBag size={14} />
                      <span>담기</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
