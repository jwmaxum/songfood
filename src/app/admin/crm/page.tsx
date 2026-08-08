'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { RFQRequest, BuyerLead } from '@/lib/types';
import { Users, FileText, TrendingUp, Sliders, CheckCircle2, ChevronRight, Search, Shield, ArrowUpRight, DollarSign } from 'lucide-react';

const MOCK_LEADS: BuyerLead[] = [
  {
    id: 'lead-1',
    company: 'Pacific Foods Import Co.',
    name: 'John Smith',
    email: 'john@pacificfoods.com',
    phone: '+1 310 555 0199',
    country: 'USA (Los Angeles)',
    status: 'QUOTATION',
    totalQuotesCount: 3,
    totalOrderValueUsd: 48500,
    lastInquiryDate: '2026-08-07',
    interestedProducts: ['CJ 비비고 왕교자 만두', '명품 포기김치 5kg', 'K-치킨 반반'],
  },
  {
    id: 'lead-2',
    company: 'Tokyo Asia Food Trading Inc.',
    name: 'Kenji Sato',
    email: 'kenji@tokyoasiafood.jp',
    phone: '+81 3 3221 8890',
    country: 'Japan (Tokyo)',
    status: 'NEGOTIATION',
    totalQuotesCount: 2,
    totalOrderValueUsd: 62000,
    lastInquiryDate: '2026-08-06',
    interestedProducts: ['원소주 375ml', '느린마을 막걸리', 'K-스낵 고구마칩'],
  },
  {
    id: 'lead-3',
    company: 'Al-Madina Gourmet Importers',
    name: 'Tariq Al-Mansoor',
    email: 'tariq@almadinagroup.ae',
    phone: '+971 4 881 2345',
    country: 'UAE (Dubai)',
    status: 'NEW_LEAD',
    totalQuotesCount: 1,
    totalOrderValueUsd: 28400,
    lastInquiryDate: '2026-08-08',
    interestedProducts: ['송영민 수제 불고기 소스', 'Halal 김치', 'K-스낵'],
  },
  {
    id: 'lead-4',
    company: 'Hamburg Asian Supermarket Group',
    name: 'Greta Weber',
    email: 'greta@hamburg-asia.de',
    phone: '+49 40 1234 5678',
    country: 'Germany (Hamburg)',
    status: 'EXPORT',
    totalQuotesCount: 5,
    totalOrderValueUsd: 125000,
    lastInquiryDate: '2026-08-02',
    interestedProducts: ['Bibigo Mandu', 'Tteokbokki Kit', 'Pogggi Kimchi'],
  },
];

const PIPELINE_STAGES: RFQRequest['status'][] = [
  'NEW_LEAD',
  'INQUIRY',
  'PRODUCT_MATCHING',
  'QUOTATION',
  'NEGOTIATION',
  'PURCHASE_ORDER',
  'PAYMENT',
  'EXPORT',
];

export default function AdminCRMPage() {
  const [leads, setLeads] = useState<BuyerLead[]>(MOCK_LEADS);
  const [selectedStage, setSelectedStage] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Admin Global Price Adjustment Control (% Markup/Discount)
  const [priceAdjustmentPercent, setPriceAdjustmentPercent] = useState<number>(0); // e.g. +5% or -5%

  const updateLeadStatus = (id: string, newStatus: RFQRequest['status']) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l))
    );
  };

  const filteredLeads = leads.filter((l) => {
    if (selectedStage !== 'All' && l.status !== selectedStage) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        l.company.toLowerCase().includes(q) ||
        l.name.toLowerCase().includes(q) ||
        l.country.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPipelineValue = leads.reduce((sum, l) => sum + l.totalOrderValueUsd, 0);

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-stone-100 font-sans pb-24 p-6 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-stone-800 pb-6">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-[#c5a880]">
              <Shield size={14} />
              <span>SONG YOUNGMIN FOOD ADMIN CMS</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white font-jakarta mt-1">
              Global Buyer CRM &amp; Export RFQ Pipeline
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="bg-stone-900 border border-stone-800 px-4 py-2 rounded-xl">
              <div className="text-[10px] text-stone-400 font-bold uppercase">Total Pipeline Value</div>
              <div className="text-xl font-extrabold text-[#c5a880] font-jakarta">${totalPipelineValue.toLocaleString()} USD</div>
            </div>
            <Link
              href="/admin"
              className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl border border-stone-700"
            >
              ← Back to Admin Studio
            </Link>
          </div>
        </div>

        {/* Admin Global Price Adjustment Control Card */}
        <div className="bg-gradient-to-r from-stone-900 via-amber-950/40 to-stone-900 border border-amber-500/40 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Sliders className="text-[#c5a880] w-5 h-5" />
                <h2 className="text-base font-extrabold text-white font-jakarta">Global Export Price Adjustment Slider (Up/Down %)</h2>
              </div>
              <p className="text-xs text-stone-400">
                Adjust international wholesale pricing globally by increasing (+) or discounting (-) base FOB prices.
              </p>
            </div>

            <div className="flex items-center space-x-4 bg-stone-950 border border-stone-800 p-3 rounded-xl">
              <span className="text-xs text-stone-400 font-bold">Adjustment:</span>
              <span className={`text-xl font-extrabold font-jakarta ${priceAdjustmentPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {priceAdjustmentPercent >= 0 ? `+${priceAdjustmentPercent}%` : `${priceAdjustmentPercent}%`}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-xs text-stone-400 font-bold w-12">-20%</span>
            <input
              type="range"
              min="-20"
              max="30"
              step="1"
              value={priceAdjustmentPercent}
              onChange={(e) => setPriceAdjustmentPercent(parseInt(e.target.value))}
              className="w-full accent-amber-500 bg-stone-950 h-2 rounded-lg cursor-pointer"
            />
            <span className="text-xs text-stone-400 font-bold w-12">+30%</span>
          </div>
        </div>

        {/* 8-Stage Pipeline Kanban Overview Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {PIPELINE_STAGES.map((st) => {
            const count = leads.filter((l) => l.status === st).length;
            const isSelected = selectedStage === st;
            return (
              <button
                key={st}
                onClick={() => setSelectedStage(isSelected ? 'All' : st)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-[#c5a880] text-black border-[#c5a880] shadow-lg font-bold'
                    : 'bg-stone-900/80 text-stone-300 border-stone-800 hover:border-stone-700'
                }`}
              >
                <div className="text-[10px] uppercase tracking-wider font-extrabold truncate">{st.replace('_', ' ')}</div>
                <div className="text-lg font-extrabold font-jakarta mt-1">{count} Leads</div>
              </button>
            );
          })}
        </div>

        {/* Buyer Leads Table */}
        <div className="bg-stone-900/80 border border-stone-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-stone-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 className="text-base font-bold text-white font-jakarta">Active Buyer Accounts ({filteredLeads.length})</h3>

            <div className="relative w-full md:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search company, country..."
                className="w-full bg-stone-950 border border-stone-700 rounded-xl py-2 px-3 pl-9 text-xs text-stone-100"
              />
              <Search className="absolute left-3 top-2.5 text-stone-500 w-4 h-4" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-stone-300">
              <thead className="bg-stone-950 text-stone-400 uppercase text-[10px] tracking-wider border-b border-stone-800">
                <tr>
                  <th className="p-4">Company &amp; Country</th>
                  <th className="p-4">Contact Person</th>
                  <th className="p-4">Products of Interest</th>
                  <th className="p-4">Pipeline Status</th>
                  <th className="p-4 text-right">Quotes</th>
                  <th className="p-4 text-right">Order Value (USD)</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-stone-800/40 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white text-sm">{lead.company}</div>
                      <div className="text-[11px] text-[#c5a880] font-mono">{lead.country}</div>
                    </td>

                    <td className="p-4 space-y-0.5">
                      <div className="font-bold text-stone-200">{lead.name}</div>
                      <div className="text-[11px] text-stone-500">{lead.email}</div>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {lead.interestedProducts.map((p) => (
                          <span key={p} className="px-2 py-0.5 bg-stone-950 text-stone-300 border border-stone-800 rounded text-[10px]">
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="p-4">
                      <select
                        value={lead.status}
                        onChange={(e) => updateLeadStatus(lead.id, e.target.value as RFQRequest['status'])}
                        className="bg-stone-950 border border-amber-500/40 rounded-lg p-2 text-xs font-bold text-amber-300 cursor-pointer"
                      >
                        {PIPELINE_STAGES.map((st) => (
                          <option key={st} value={st}>
                            {st.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-4 text-right font-bold text-stone-200">{lead.totalQuotesCount}</td>

                    <td className="p-4 text-right font-extrabold text-[#c5a880] font-jakarta">
                      ${lead.totalOrderValueUsd.toLocaleString()}
                    </td>

                    <td className="p-4 text-center">
                      <Link
                        href={`/rfq?buyer=${lead.id}`}
                        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/40 rounded-lg font-bold text-[11px] inline-flex items-center space-x-1"
                      >
                        <span>View RFQ</span>
                        <ArrowUpRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
