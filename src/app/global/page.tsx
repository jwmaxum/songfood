'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProductItem } from '@/lib/types';
import { Globe, FileText, CheckCircle2, Filter, ShieldCheck, ChevronRight, Award, Search, Anchor } from 'lucide-react';

export default function GlobalExportPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<string[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        if (data.success) {
          setProducts(data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  const toggleCert = (cert: string) => {
    setSelectedCert((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]
    );
  };

  const filteredProducts = products.filter((p) => {
    if (selectedCert.length > 0) {
      const hasAllCerts = selectedCert.every((c) => p.certifications?.includes(c));
      if (!hasAllCerts) return false;
    }
    if (selectedMarket !== 'All') {
      if (!p.target_markets?.includes(selectedMarket)) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        p.name.toLowerCase().includes(q) ||
        (p.name_en && p.name_en.toLowerCase().includes(q)) ||
        (p.hs_code && p.hs_code.includes(q)) ||
        p.collection.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-stone-100 font-sans pb-24">
      {/* Global Hero Header */}
      <div className="relative bg-gradient-to-r from-stone-950 via-amber-950/80 to-emerald-950 border-b border-stone-800 py-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#EAB308_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="space-y-4 max-w-3xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-400/50 text-amber-300 text-xs font-extrabold">
              <Globe size={13} className="animate-spin" />
              <span>OFFICIAL OVERSEAS BUYER &amp; EXPORT HUB</span>
            </div>
            
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white font-jakarta tracking-tight leading-tight">
              Global K-Food Export Catalog &amp; RFQ Platform
            </h1>
            
            <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
              Explore export-certified Korean food products (Mandu, Kimchi, HMR, Korean Chicken, Sauces &amp; Beverages). Filter by <strong className="text-amber-400">Halal, HACCP, Vegan</strong>, target market, or request an instant <strong className="text-emerald-400">FOB Pro Forma Invoice</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <Link
              href="/rfq"
              className="px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-2xl flex items-center justify-center space-x-2 ring-2 ring-amber-400/40"
            >
              <FileText size={18} />
              <span>Request a Quote (RFQ)</span>
            </Link>

            <Link
              href="/why-kfood"
              className="px-6 py-4 bg-stone-900/90 hover:bg-stone-800 text-amber-300 border border-amber-500/50 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center space-x-2"
            >
              <Award size={18} />
              <span>Why K-Food &amp; Why Us?</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        
        {/* Filter Toolbar */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 mb-8 space-y-6 shadow-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-stone-800 pb-4">
            <div className="flex items-center space-x-2">
              <Filter className="text-[#EAB308] w-5 h-5" />
              <h2 className="text-base font-bold text-white font-jakarta">Certification &amp; Market Filters</h2>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search HS Code, product name..."
                className="w-full bg-stone-950 border border-stone-700 rounded-xl py-2 px-4 pl-10 text-xs text-stone-100 focus:outline-none focus:border-amber-400"
              />
              <Search className="absolute left-3 top-2.5 text-stone-500 w-4 h-4" />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Certifications Checkbox Row */}
            <div>
              <span className="text-xs font-bold text-stone-300 block mb-2">Certifications:</span>
              <div className="flex flex-wrap gap-2">
                {['HACCP', 'Halal', 'FSSC 22000', 'ISO', 'Vegan', 'Gluten Free'].map((cert) => {
                  const active = selectedCert.includes(cert);
                  return (
                    <button
                      key={cert}
                      type="button"
                      onClick={() => toggleCert(cert)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        active
                          ? 'bg-amber-500 text-black shadow-md ring-1 ring-amber-300'
                          : 'bg-stone-950 text-stone-400 border border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      {cert}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Markets Selection */}
            <div>
              <span className="text-xs font-bold text-stone-300 block mb-2">Target Market Region:</span>
              <div className="flex flex-wrap gap-2">
                {['All', 'USA', 'Japan', 'China', 'Southeast Asia', 'Middle East', 'Europe'].map((m) => {
                  const active = selectedMarket === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedMarket(m)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        active
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-stone-950 text-stone-400 border border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="text-center py-20 text-stone-500">Loading export catalog...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                className="bg-stone-900/80 border border-stone-800 rounded-2xl overflow-hidden hover:border-amber-500/60 transition-all duration-300 flex flex-col justify-between group shadow-xl"
              >
                <div>
                  <div className="relative aspect-4/3 overflow-hidden bg-black">
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1">
                      {p.certifications?.map((c) => (
                        <span key={c} className="bg-amber-500 text-black text-[10px] font-extrabold px-2 py-0.5 rounded shadow">
                          {c}
                        </span>
                      ))}
                    </div>
                    <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur text-amber-400 font-mono text-xs font-bold px-2.5 py-1 rounded border border-amber-500/40">
                      HS: {p.hs_code || '1902.20'}
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="text-[11px] text-amber-400 font-bold uppercase tracking-wider font-jakarta">
                      {p.collection}
                    </div>

                    <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1 font-jakarta">
                      {p.name_en || p.name}
                    </h3>

                    <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed font-light">
                      {p.description}
                    </p>

                    {/* Export Specs Table Pill */}
                    <div className="bg-stone-950/80 border border-stone-800 p-3 rounded-xl space-y-1.5 text-[11px] font-mono">
                      <div className="flex justify-between">
                        <span className="text-stone-500">CTN Spec:</span>
                        <span className="text-stone-200">{p.carton_qty || 10} pkts ({p.gross_weight || 11.2} kg)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">Volume / MOQ:</span>
                        <span className="text-amber-300 font-bold">{p.cbm || 0.035} m³ / MOQ {p.moq_cartons || 50} CTNs</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">Loading Port:</span>
                        <span className="text-stone-300">{p.loading_port || 'Busan Port'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0 border-t border-stone-800/60 flex items-center justify-between mt-4">
                  <div>
                    <span className="text-[10px] text-stone-500 block uppercase">FOB Price</span>
                    <span className="text-lg font-extrabold text-[#EAB308] font-jakarta">${p.export_price_usd || 15} USD</span>
                  </div>

                  <Link
                    href={`/rfq?product=${p.id}`}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl transition-all flex items-center space-x-1 shadow"
                  >
                    <span>Request Quote</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
