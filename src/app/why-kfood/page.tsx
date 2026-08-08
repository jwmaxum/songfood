'use client';

import React from 'react';
import Link from 'next/link';
import { Globe, Award, ShieldCheck, CheckCircle2, ArrowRight, Heart, Sparkles, Truck, FileText } from 'lucide-react';

export default function WhyKFoodPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0C] text-stone-100 font-sans pb-24">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-stone-950 to-amber-950 border-b border-stone-800 py-20 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-amber-950/80 border border-amber-400/50 text-amber-300 text-xs font-extrabold">
            <Sparkles size={14} className="text-[#EAB308]" />
            <span>GLOBAL K-FOOD TREND &amp; EXPORT COMPETITIVENESS</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white font-jakarta tracking-tight">
            Why Korean Food &amp; Why Us?
          </h1>

          <p className="text-stone-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            Discover why premium Korean food is dominating the global culinary market and how Song Youngmin Food connects international buyers with authentic, certified K-Food export solutions.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 space-y-20">
        
        {/* Section 1: Why K-Food? */}
        <div className="space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs uppercase font-extrabold text-amber-400 tracking-widest font-jakarta">Global Market Dynamics</span>
            <h2 className="text-3xl font-extrabold text-white font-jakarta">Why Global Buyers Choose K-Food</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-stone-900/80 border border-stone-800 p-8 rounded-2xl space-y-4 shadow-xl hover:border-amber-500/50 transition-all">
              <Heart className="w-10 h-10 text-red-500" />
              <h3 className="text-xl font-bold text-white font-jakarta">Global K-Culture Demand</h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Driven by K-Drama, K-Pop, and global media, consumer awareness and demand for authentic Korean street food, Mandu, and Tteokbokki have surged worldwide.
              </p>
            </div>

            <div className="bg-stone-900/80 border border-stone-800 p-8 rounded-2xl space-y-4 shadow-xl hover:border-amber-500/50 transition-all">
              <ShieldCheck className="w-10 h-10 text-emerald-400" />
              <h3 className="text-xl font-bold text-white font-jakarta">HACCP &amp; Halal Certified</h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Korean food production adheres to strict international hygiene and safety standards, featuring Halal, Vegan, and FSSC 22000 certifications for easy import compliance.
              </p>
            </div>

            <div className="bg-stone-900/80 border border-stone-800 p-8 rounded-2xl space-y-4 shadow-xl hover:border-amber-500/50 transition-all">
              <Sparkles className="w-10 h-10 text-[#EAB308]" />
              <h3 className="text-xl font-bold text-white font-jakarta">Healthy &amp; Fermented Ingredients</h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Kimchi and traditional sauces feature natural lactic acid fermentation, high fiber, and rich probiotics, appealing to modern wellness-conscious consumers.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Why Song Youngmin Food? */}
        <div className="bg-gradient-to-br from-stone-900 via-amber-950/40 to-emerald-950/60 border border-stone-800 rounded-3xl p-8 sm:p-12 space-y-8 shadow-2xl">
          <div className="max-w-3xl space-y-3">
            <span className="text-xs uppercase font-extrabold text-[#EAB308] tracking-widest font-jakarta">Our Competitive Advantage</span>
            <h2 className="text-3xl font-extrabold text-white font-jakarta">Why Song Youngmin Food is Your Best Partner</h2>
            <p className="text-xs sm:text-sm text-stone-300">
              We bridge the gap between top South Korean food manufacturers and overseas buyers with end-to-end export trading support.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 text-xs">
            <div className="flex items-start space-x-3 bg-stone-950/60 p-4 rounded-xl border border-stone-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white font-bold block text-sm">Dual Specification &amp; HS Code Database</strong>
                <span className="text-stone-400">Complete CBM, Carton Dimensions, Gross Weight, and HS Code pre-compiled for smooth customs clearance.</span>
              </div>
            </div>

            <div className="flex items-start space-x-3 bg-stone-950/60 p-4 rounded-xl border border-stone-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white font-bold block text-sm">Real-time Container Loading Calculator</strong>
                <span className="text-stone-400">Instantly compute 20ft/40ft Reefer container utilization rates to optimize sea freight logistics.</span>
              </div>
            </div>

            <div className="flex items-start space-x-3 bg-stone-950/60 p-4 rounded-xl border border-stone-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white font-bold block text-sm">Instant Pro Forma PDF Invoice Generation</strong>
                <span className="text-stone-400">Generates official FOB/CIF export quotations with Seller/Buyer details in seconds.</span>
              </div>
            </div>

            <div className="flex items-start space-x-3 bg-stone-950/60 p-4 rounded-xl border border-stone-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white font-bold block text-sm">Private Label / OEM Brokerage</strong>
                <span className="text-stone-400">Custom recipe reformulation, multilingual packaging design, and OEM contract manufacturing support.</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-stone-800 flex justify-center">
            <Link
              href="/rfq"
              className="px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xl flex items-center space-x-2"
            >
              <FileText size={18} />
              <span>Start RFQ Quote Calculation Now</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
