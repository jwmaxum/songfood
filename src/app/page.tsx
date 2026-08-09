import React from 'react';
import Link from 'next/link';
import { getActiveHeroSlides } from '@/lib/cms-db';
import { getProducts } from '@/lib/products-db';

// Home Section Components
import HeroSlider from '@/components/home/HeroSlider';
import DualPortalSection from '@/components/home/DualPortalSection';
import TodaysDeals from '@/components/home/TodaysDeals';
import CategoryIcons from '@/components/home/CategoryIcons';
import BestSellers from '@/components/home/BestSellers';

import { ShieldCheck, Layers, FileText } from 'lucide-react';

export default async function Home() {
  // RSC: Parallel DB fetches for max performance
  const [heroSlides, products] = await Promise.all([
    getActiveHeroSlides(),
    getProducts(),
  ]);

  return (
    <div className="w-full bg-[#FAFAF8] text-stone-800 overflow-hidden font-sans">
      
      {/* 1. Hero Visual Banner */}
      <HeroSlider initialSlides={heroSlides} />

      {/* Dual Entrance Portal (Domestic Consumers vs Global B2B Export Hub) */}
      <DualPortalSection />

      {/* Admin Quick Control Banner */}
      <div className="bg-[#14532D] text-emerald-100 border-b border-emerald-800/40 py-2 px-4 sm:px-8 text-xs font-medium">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2">
          <div className="flex items-center space-x-2">
            <ShieldCheck size={16} className="text-[#EAB308]" />
            <span>
              <strong className="text-white font-semibold">CMS Admin Engine:</strong> Live Navigation, Hero Slider CMS &amp; Product Management.
            </span>
          </div>
          <div className="flex items-center space-x-4 text-[11px] font-bold">
            <Link href="/admin/navigation" className="text-[#EAB308] hover:text-white flex items-center space-x-1 transition-colors">
              <Layers size={13} />
              <span>Menu Engine</span>
            </Link>
            <span className="text-emerald-700">|</span>
            <Link href="/admin/products" className="text-[#EAB308] hover:text-white flex items-center space-x-1 transition-colors">
              <FileText size={13} />
              <span>Products CRUD</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Today's Special Deals (Time-sale & Countdown) */}
      <TodaysDeals products={products} />

      {/* 3. Category Icons (Quick category circles) */}
      <CategoryIcons />

      {/* 4. Best Sellers Collection */}
      <BestSellers products={products} />

    </div>
  );
}
