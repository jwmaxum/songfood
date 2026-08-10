'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ProductItem, RFQItem, RFQRequest } from '@/lib/types';
import { getStoredExchangeRate, convertKrwToUsd, DEFAULT_EXCHANGE_RATE } from '@/lib/exchange-rate';
import { Globe, Calculator, FileText, CheckCircle2, ChevronRight, ArrowLeft, ShieldCheck, Printer, CheckSquare, Square, DollarSign } from 'lucide-react';

const FALLBACK_RFQ_PRODUCTS: ProductItem[] = [
  {
    id: 'prod-1',
    name: 'CJ Bibigo Premium Pork & Leek Mandu Dumplings (1.05kg Family Pack)',
    name_en: 'Bibigo Premium Pork & Leek Mandu Dumplings',
    collection: 'K-Frozen Food',
    category: 'Dumplings & Mandu',
    price: 18000,
    box_price: 324000,
    carton_price: 1440000,
    carton_box_qty: 5,
    carton_qty: 100,
    format: '1.05kg Family Pack',
    finish: '-40°C IQF Deep Frozen',
    color: 'Crispy Golden Dumpling Skin',
    look: 'Handcrafted Pleated Mandu',
    image_url: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=800&q=80',
    description: 'Thin delicate skin packed with 100% domestic Korean pork, fresh chives, and glass noodles. Korea\'s #1 best-selling Mandu.',
    gross_weight: 11.2,
    cbm: 0.037,
    moq_cartons: 50,
    hs_code: '1902.20-1000',
    wholesale_price_krw: 1440000,
  },
  {
    id: 'prod-kimchi',
    name: 'Song Youngmin Food Premium Artisanal Poggi Kimchi 5kg',
    name_en: 'Song Youngmin Food Premium Artisanal Poggi Kimchi 5kg',
    collection: 'K-Traditional Food',
    category: 'Kimchi & Fermented Food',
    price: 35000,
    box_price: 160000,
    carton_price: 600000,
    carton_box_qty: 4,
    carton_qty: 20,
    format: '5kg Commercial/Catering Pack',
    finish: 'Natural Probiotic Fermentation',
    color: 'Rich Crimson Fresh Poggi',
    look: 'Handcrafted Haenam Napa Cabbage',
    image_url: 'https://images.unsplash.com/photo-1583224964978-2257b960c3d3?auto=format&fit=crop&w=800&q=80',
    description: '100% domestic Haenam napa cabbage, red pepper powder, and aged salted seafood. Authentic handcrafted Korean ferment.',
    gross_weight: 21.5,
    cbm: 0.052,
    moq_cartons: 40,
    hs_code: '2005.99-1000',
    wholesale_price_krw: 600000,
  },
  {
    id: 'prod-3',
    name: 'K-Street Spicy Tteokbokki & Assorted Tempura Kit (3 Servings)',
    name_en: 'K-Street Spicy Tteokbokki & Assorted Tempura Kit',
    collection: 'K-Convenience/HMR',
    category: 'Tteokbokki & Meal Kits',
    price: 14000,
    box_price: 125000,
    carton_price: 480000,
    carton_box_qty: 4,
    carton_qty: 40,
    format: '650g Meal Kit (3 Servings)',
    finish: 'IQF Frozen Secret Sauce',
    color: 'Sweet & Spicy Crimson Sauce',
    look: 'Chewy Rice Cake & Fried Seaweed Roll',
    image_url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80',
    description: 'The essence of Korean street food. Chewy rice cakes, Busan artisanal fish cakes, and fried seaweed rolls in signature sauce.',
    gross_weight: 11.8,
    cbm: 0.035,
    moq_cartons: 50,
    hs_code: '1902.30-9000',
    wholesale_price_krw: 480000,
  },
  {
    id: 'prod-5',
    name: 'Korean Royal Beef Bulgogi Kit 600g (Soy Marinade)',
    name_en: 'Korean Royal Beef Bulgogi Kit 600g',
    collection: 'K-Convenience/HMR',
    category: 'Meat & Bulgogi',
    price: 22000,
    box_price: 200000,
    carton_price: 750000,
    carton_box_qty: 4,
    carton_qty: 40,
    format: '600g Frozen Pack',
    finish: 'Royal Soy Sauce Marinade',
    color: 'Sweet & Savory Soy Glaze',
    look: 'Thinly Sliced Premium Beef',
    image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
    description: 'Tender premium beef marinated in sweet Korean pear, onion, and aged garlic soy sauce. Classic Korean royal dish.',
    gross_weight: 8.5,
    cbm: 0.029,
    moq_cartons: 50,
    hs_code: '1602.50-1000',
    wholesale_price_krw: 750000,
  },
  {
    id: 'prod-sauce',
    name: 'Song Youngmin Food Master K-BBQ Soy Marinade Sauce 2kg',
    name_en: 'Song Youngmin Food Master K-BBQ Soy Marinade Sauce 2kg',
    collection: 'K-Sauce & Condiments',
    category: 'Sauces & Marinades',
    price: 25000,
    box_price: 135000,
    carton_price: 500000,
    carton_box_qty: 4,
    carton_qty: 24,
    format: '2kg Commercial Jug',
    finish: 'Low-Temp Slow Aged',
    color: 'Dark Soy Brown Glaze',
    look: 'Minced Garlic & Pear Puree',
    image_url: 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?auto=format&fit=crop&w=800&q=80',
    description: 'All-in-one K-BBQ marinade for Galbi, Bulgogi, and Pork Belly. Preferred by professional chefs worldwide.',
    gross_weight: 21.0,
    cbm: 0.045,
    moq_cartons: 30,
    hs_code: '2103.90-9030',
    wholesale_price_krw: 500000,
  },
  {
    id: 'prod-2',
    name: 'WON SOJU Original 24% Premium Distilled Spirits 375ml',
    name_en: 'WON SOJU Original 24% Premium Spirits 375ml',
    collection: 'K-Liquor & Spirits',
    category: 'Traditional Spirits & Soju',
    price: 14900,
    box_price: 165000,
    carton_price: 620000,
    carton_box_qty: 4,
    carton_qty: 48,
    format: '375ml Glass Bottle',
    finish: 'Earthenware Pot Distilled',
    color: 'Crystal Clear Pure Spirits',
    look: 'Modern Holographic Label',
    image_url: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&w=800&q=80',
    description: '100% Korean domestic rice distilled in traditional earthenware pots for ultra-smooth texture and refined aroma.',
    gross_weight: 18.5,
    cbm: 0.035,
    moq_cartons: 50,
    hs_code: '2208.90-4000',
    wholesale_price_krw: 620000,
  },
  {
    id: 'prod-4',
    name: 'Neurinmaeul Handcrafted Raw Rice Wine Makgeolli 750ml',
    name_en: 'Neurinmaeul Handcrafted Raw Rice Wine 750ml',
    collection: 'K-Liquor & Spirits',
    category: 'Makgeolli & Rice Wine',
    price: 4500,
    box_price: 80000,
    carton_price: 300000,
    carton_box_qty: 4,
    carton_qty: 80,
    format: '750ml Cold-Chain PET',
    finish: '0% Artificial Sweeteners',
    color: 'Milky White Probiotic Rice Wine',
    look: 'Creamy Micro-Bubble Carbonation',
    image_url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80',
    description: 'Zero artificial sweeteners (Aspartame-free). 100% Korean rice naturally fermented for rich creamy carbonation.',
    gross_weight: 20.0,
    cbm: 0.045,
    moq_cartons: 50,
    hs_code: '2206.00-2010',
    wholesale_price_krw: 300000,
  },
  {
    id: 'prod-snack',
    name: 'Song Youngmin Premium Crunchy Sweet Potato Chips 100g',
    name_en: 'Song Youngmin Premium Crunchy Sweet Potato Chips 100g',
    collection: 'K-Snack & Drinks',
    category: 'Snacks & Confectionery',
    price: 3500,
    box_price: 90000,
    carton_price: 320000,
    carton_box_qty: 4,
    carton_qty: 120,
    format: '100g Foil Pouch',
    finish: 'Vacuum Low-Temp Frying',
    color: 'Golden Purple Sweet Potato',
    look: '100% Real Sweet Potato Slices',
    image_url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=800&q=80',
    description: '100% Korean sweet potatoes vacuum-fried at low temperatures to preserve natural sweetness and crispy crunch.',
    gross_weight: 14.0,
    cbm: 0.060,
    moq_cartons: 40,
    hs_code: '1905.90-1000',
    wholesale_price_krw: 320000,
  },
];

function RFQContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<ProductItem[]>(FALLBACK_RFQ_PRODUCTS);
  const [exchangeRate, setExchangeRate] = useState<number>(DEFAULT_EXCHANGE_RATE);
  const [step, setStep] = useState(1);

  // RFQ Form State
  const [selectedProducts, setSelectedProducts] = useState<{ [id: string]: number }>({
    'prod-1': 50,
    'prod-kimchi': 50,
  });
  const [country, setCountry] = useState('USA');
  const [destinationPort, setDestinationPort] = useState('Los Angeles Port (USLAX)');
  const [incoterms, setIncoterms] = useState<'FOB Busan' | 'CIF' | 'CFR' | 'EXW'>('FOB Busan');
  
  // Buyer Company State
  const [company, setCompany] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessType, setBusinessType] = useState('Importer / Distributor');
  const [notes, setNotes] = useState('');

  // Generated Quote State
  const [generatedQuote, setGeneratedQuote] = useState<RFQRequest | null>(null);

  useEffect(() => {
    // Load stored exchange rate or default 1,450 KRW
    const currentRate = getStoredExchangeRate();
    setExchangeRate(currentRate);

    const handleRateUpdate = () => {
      setExchangeRate(getStoredExchangeRate());
    };

    window.addEventListener('songfood_exchange_rate_updated', handleRateUpdate);
    return () => {
      window.removeEventListener('songfood_exchange_rate_updated', handleRateUpdate);
    };
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/products');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            setProducts(data.data);
          }
        }
      } catch (err) {
        console.warn('API /api/products fetch failed, using preloaded catalog dataset:', err);
      }

      // Handle URL query parameters (e.g. /rfq?products=prod-1,prod-kimchi)
      const rawProducts = searchParams.get('products') || searchParams.get('product');
      if (rawProducts) {
        const productIds = rawProducts.split(',').map((s) => s.trim());
        const initialSelection: { [id: string]: number } = {};
        productIds.forEach((id) => {
          initialSelection[id] = 50; // default 50 CTNs
        });
        setSelectedProducts(initialSelection);
      }
    }
    loadData();
  }, [searchParams]);

  const toggleProduct = (id: string) => {
    setSelectedProducts((prev) => {
      const next = { ...prev };
      if (next[id] !== undefined) {
        delete next[id];
      } else {
        next[id] = 50; // default 50 CTNs
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const allSelected: { [id: string]: number } = {};
    products.forEach((p) => {
      allSelected[p.id] = 50;
    });
    setSelectedProducts(allSelected);
  };

  const handleDeselectAll = () => {
    setSelectedProducts({});
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty < 1) return;
    setSelectedProducts((prev) => ({
      ...prev,
      [id]: qty,
    }));
  };

  // Calculation Engine based on Product DB Master Carton Pricing & Exchange Rate
  const selectedProductList = products.filter((p) => selectedProducts[p.id] !== undefined);
  
  const rfqItems: RFQItem[] = selectedProductList.map((p) => {
    const qty = selectedProducts[p.id] || 0;
    const cartonQty = p.carton_qty || 100;
    const cartonPriceKrw = p.carton_price || p.wholesale_price_krw || Math.round((p.price || 18000) * cartonQty * 0.8);
    const cartonPriceUsd = convertKrwToUsd(cartonPriceKrw, exchangeRate);

    const totalUsd = Math.round(cartonPriceUsd * qty * 100) / 100;
    const cbmPerCtn = p.cbm || 0.037;
    const grossWeightPerCtn = p.gross_weight || 11.2;

    return {
      productId: p.id,
      name: p.name_en || p.name,
      quantityCartons: qty,
      unitPriceUsd: cartonPriceUsd,
      totalUsd,
      cbm: Math.round(cbmPerCtn * qty * 1000) / 1000,
      grossWeight: Math.round(grossWeightPerCtn * qty * 10) / 10,
      hsCode: p.hs_code || '1902.20-1000',
    };
  });

  const subtotalUsd = Math.round(rfqItems.reduce((sum, item) => sum + item.totalUsd, 0) * 100) / 100;
  const subtotalKrw = Math.round(subtotalUsd * exchangeRate);
  const packingFeeUsd = selectedProductList.length > 0 ? 150 : 0;
  const totalUsd = Math.round((subtotalUsd + packingFeeUsd) * 100) / 100;
  const totalCbm = Math.round(rfqItems.reduce((sum, item) => sum + item.cbm, 0) * 1000) / 1000;
  const totalGrossWeight = Math.round(rfqItems.reduce((sum, item) => sum + item.grossWeight, 0) * 10) / 10;
  const fillRate = Math.min(100, Math.round((totalCbm / 28.0) * 100));

  const handleGenerateQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !name || !email) {
      alert('Please enter required buyer contact information (Company Name, Contact Name, Business Email).');
      return;
    }

    const quoteNo = `EXQ-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const newQuote: RFQRequest = {
      id: `rfq-${Date.now()}`,
      quoteNo,
      company,
      name,
      email,
      phone,
      country,
      destinationPort,
      incoterms,
      items: rfqItems,
      subtotalUsd,
      packingFeeUsd,
      totalUsd,
      totalCbm,
      totalGrossWeight,
      reeferContainerFillPercent: fillRate,
      notes: notes,
      status: 'NEW_LEAD',
      createdAt: new Date().toISOString(),
      businessType,
    };

    setGeneratedQuote(newQuote);
    setStep(7);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-stone-100 font-sans pb-24">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-amber-950 border-b border-stone-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Link href="/shop" className="inline-flex items-center text-xs text-amber-400 hover:underline space-x-1 font-bold">
                <ArrowLeft size={14} />
                <span>Back to K-Food Shop</span>
              </Link>
              <span className="text-stone-600">•</span>
              <div className="inline-flex items-center space-x-1 text-xs text-emerald-400 font-mono font-bold bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-0.5 rounded-md">
                <DollarSign size={13} />
                <span>Applied FX Rate: ₩{exchangeRate.toLocaleString()} KRW / $1 USD</span>
              </div>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white font-jakarta tracking-tight">
              Overseas Buyer RFQ
            </h1>
            <p className="text-stone-300 text-xs sm:text-sm mt-2 max-w-2xl">
              Select premium K-Food products from our export database to calculate instant master carton FOB pricing and generate official Pro Forma Invoices.
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-stone-900/80 border border-amber-500/40 p-4 rounded-xl backdrop-blur shadow-2xl">
            <Calculator className="text-[#EAB308] w-8 h-8" />
            <div>
              <div className="text-[10px] uppercase text-stone-400 font-bold">Estimated Total Quote (FOB USD)</div>
              <div className="text-2xl font-extrabold text-[#EAB308] font-jakarta">${totalUsd.toLocaleString()} USD</div>
              <div className="text-xs text-stone-400 font-mono">≈ ₩{subtotalKrw.toLocaleString()} KRW (FX Rate: ₩{exchangeRate.toLocaleString()})</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        {/* Progress Step Bar */}
        <div className="grid grid-cols-7 gap-2 mb-10 text-center text-xs">
          {[
            { num: 1, title: 'Select Products' },
            { num: 2, title: 'Quantity Setup' },
            { num: 3, title: 'Destination' },
            { num: 4, title: 'Port of Entry' },
            { num: 5, title: 'Incoterms Trade' },
            { num: 6, title: 'Buyer Details' },
            { num: 7, title: 'Pro Forma Invoice' },
          ].map((s) => (
            <button
              key={s.num}
              onClick={() => s.num < step && setStep(s.num)}
              className={`py-2.5 px-1 rounded-xl border font-bold transition-all text-[11px] ${
                step === s.num
                  ? 'bg-[#14532D] text-white border-emerald-400 shadow-md ring-2 ring-emerald-400/30'
                  : step > s.num
                  ? 'bg-amber-950/60 text-amber-300 border-amber-500/50'
                  : 'bg-stone-900/40 text-stone-600 border-stone-800'
              }`}
            >
              Step {s.num}. {s.title}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Form Left Column (8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* STEP 1: Select Products */}
            {step === 1 && (
              <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-stone-800 pb-4 gap-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-white font-jakarta flex items-center space-x-2">
                      <span>Step 1. Select Export Target Products</span>
                    </h2>
                    <p className="text-xs text-stone-400 mt-1">
                      Click product cards to select K-Food products for quotation. (Master Carton Pricing)
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-amber-400 font-extrabold px-3 py-1 bg-amber-950/50 border border-amber-500/30 rounded-lg">
                      {selectedProductList.length} / {products.length} Products Selected
                    </span>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded text-xs font-bold transition-colors flex items-center space-x-1"
                    >
                      <CheckSquare size={13} />
                      <span>Select All</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 rounded text-xs transition-colors flex items-center space-x-1"
                    >
                      <Square size={13} />
                      <span>Deselect All</span>
                    </button>
                  </div>
                </div>

                {/* Product Catalog Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {products.map((p) => {
                    const isSelected = selectedProducts[p.id] !== undefined;
                    const cartonQty = p.carton_qty || 100;
                    const cartonBoxQty = p.carton_box_qty || Math.round(cartonQty / 20) || 5;
                    const cartonPriceKrw = p.carton_price || p.wholesale_price_krw || Math.round((p.price || 18000) * cartonQty * 0.8);
                    const cartonPriceUsd = convertKrwToUsd(cartonPriceKrw, exchangeRate);

                    return (
                      <div
                        key={p.id}
                        onClick={() => toggleProduct(p.id)}
                        className={`cursor-pointer rounded-xl border p-4 transition-all flex items-center space-x-4 group hover:scale-[1.01] ${
                          isSelected
                            ? 'bg-emerald-950/50 border-emerald-500 shadow-xl ring-2 ring-emerald-500/40'
                            : 'bg-stone-950/80 border-stone-800 hover:border-emerald-600/60'
                        }`}
                      >
                        <div className="relative overflow-hidden rounded-lg flex-shrink-0 w-24 h-24 bg-stone-900">
                          <img
                            src={p.image_url}
                            alt={p.name_en || p.name}
                            className="w-full h-full object-cover rounded-lg border border-stone-700/60 shadow-md group-hover:scale-105 transition-transform duration-300"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-emerald-950/50 backdrop-blur-[1px] flex items-center justify-center">
                              <CheckCircle2 className="w-9 h-9 text-emerald-400 drop-shadow-md" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 overflow-hidden space-y-1">
                          <div className="flex items-center space-x-1.5">
                            <span className="bg-stone-800 text-stone-300 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                              {p.collection}
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono">
                              HS: {p.hs_code || '1902.20'}
                            </span>
                          </div>

                          <h3 className="text-xs font-bold text-stone-100 group-hover:text-amber-400 transition-colors leading-snug line-clamp-2">
                            {p.name_en || p.name}
                          </h3>

                          {/* Master Carton Price Badge */}
                          <div className="bg-stone-900/90 border border-stone-800 rounded px-2.5 py-1 text-[11px] font-mono">
                            <div className="flex justify-between items-center text-stone-300 font-bold text-[10px]">
                              <span>📦 1 CTN ({cartonQty} PKGs / {cartonBoxQty} Boxes)</span>
                              <span>MOQ: {p.moq_cartons || 50} CTN</span>
                            </div>
                            <div className="flex justify-between items-center text-emerald-400 font-extrabold mt-0.5">
                              <span className="text-white">₩{cartonPriceKrw.toLocaleString()} KRW</span>
                              <span className="text-emerald-400 font-mono">(${cartonPriceUsd.toLocaleString()} USD)</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex-shrink-0 pl-1">
                          <CheckCircle2 className={`w-6 h-6 transition-colors ${isSelected ? 'text-emerald-400' : 'text-stone-700 group-hover:text-stone-500'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 flex justify-between items-center border-t border-stone-800">
                  <div className="text-xs text-stone-400">
                    Selected Products: <strong className="text-amber-400">{selectedProductList.length} Items</strong> (Quantities set in next step)
                  </div>
                  <button
                    disabled={selectedProductList.length === 0}
                    onClick={() => setStep(2)}
                    className="px-8 py-3 bg-[#14532D] hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center space-x-2 disabled:opacity-50 shadow-lg"
                  >
                    <span>Next: Enter Quantities</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Quantities */}
            {step === 2 && (
              <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
                <div className="border-b border-stone-800 pb-4">
                  <h2 className="text-xl font-bold text-white font-jakarta">Step 2. Order Quantity (Master Cartons)</h2>
                  <p className="text-xs text-stone-400">Specify order volume in standard master carton (CTN) units.</p>
                </div>

                <div className="space-y-4">
                  {selectedProductList.map((p) => {
                    const cartonQty = p.carton_qty || 100;
                    const cartonBoxQty = p.carton_box_qty || Math.round(cartonQty / 20) || 5;
                    const cartonPriceKrw = p.carton_price || p.wholesale_price_krw || Math.round((p.price || 18000) * cartonQty * 0.8);
                    const cartonPriceUsd = convertKrwToUsd(cartonPriceKrw, exchangeRate);
                    const ctnQty = selectedProducts[p.id] || 0;
                    const lineTotalUsd = Math.round(cartonPriceUsd * ctnQty * 100) / 100;

                    return (
                      <div key={p.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-stone-950/80 border border-stone-800 p-4 rounded-xl gap-4">
                        <div className="flex items-center space-x-3">
                          <img src={p.image_url} alt={p.name_en || p.name} className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
                          <div>
                            <div className="text-xs font-bold text-stone-100">{p.name_en || p.name}</div>
                            <div className="text-[11px] text-stone-400 font-mono">
                              📦 1 CTN ({cartonQty} PKGs / {cartonBoxQty} Boxes): ₩{cartonPriceKrw.toLocaleString()} KRW (${cartonPriceUsd} USD)
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => updateQuantity(p.id, (selectedProducts[p.id] || 10) - 10)}
                              className="w-8 h-8 rounded-lg bg-stone-800 text-stone-300 font-bold hover:bg-stone-700"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              value={selectedProducts[p.id] || 0}
                              onChange={(e) => updateQuantity(p.id, parseInt(e.target.value) || 0)}
                              className="w-20 bg-stone-900 border border-stone-700 rounded-lg py-1 px-2 text-center text-xs font-bold text-amber-400 font-mono"
                            />
                            <button
                              onClick={() => updateQuantity(p.id, (selectedProducts[p.id] || 0) + 10)}
                              className="w-8 h-8 rounded-lg bg-stone-800 text-stone-300 font-bold hover:bg-stone-700"
                            >
                              +
                            </button>
                            <span className="text-xs text-stone-400 font-bold">CTNs</span>
                          </div>
                          <div className="text-xs font-extrabold text-[#EAB308] w-28 text-right font-mono">
                            ${lineTotalUsd.toLocaleString()} USD
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 flex justify-between">
                  <button onClick={() => setStep(1)} className="px-6 py-3 bg-stone-800 text-stone-300 text-xs font-bold rounded-xl">Back</button>
                  <button onClick={() => setStep(3)} className="px-8 py-3 bg-[#14532D] text-white font-bold text-xs uppercase tracking-wider rounded-xl">Next: Select Destination</button>
                </div>
              </div>
            )}

            {/* STEP 3 & 4 & 5: Country, Port, Incoterms */}
            {step >= 3 && step <= 5 && (
              <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
                <div className="border-b border-stone-800 pb-4">
                  <h2 className="text-xl font-bold text-white font-jakarta">Step 3-5. Destination Country &amp; Incoterms</h2>
                  <p className="text-xs text-stone-400">Set shipping destination country, port of entry, and trade terms.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-2">Destination Country</label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs text-stone-100 font-bold"
                    >
                      <option value="USA">United States (USA)</option>
                      <option value="Japan">Japan</option>
                      <option value="China">China</option>
                      <option value="Germany">Germany (EU)</option>
                      <option value="UAE">United Arab Emirates (Dubai)</option>
                      <option value="Vietnam">Vietnam</option>
                      <option value="Australia">Australia</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-2">Destination Port / City</label>
                    <input
                      type="text"
                      value={destinationPort}
                      onChange={(e) => setDestinationPort(e.target.value)}
                      placeholder="e.g. Los Angeles Port, Tokyo Port, Hamburg"
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs text-stone-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-2">Incoterms Trade Terms</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(['FOB Busan', 'CIF', 'CFR', 'EXW'] as const).map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => setIncoterms(term)}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                          incoterms === term
                            ? 'bg-amber-950/80 border-amber-400 text-amber-300 shadow-md ring-1 ring-amber-400'
                            : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                        }`}
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex justify-between">
                  <button onClick={() => setStep(2)} className="px-6 py-3 bg-stone-800 text-stone-300 text-xs font-bold rounded-xl">Back</button>
                  <button onClick={() => setStep(6)} className="px-8 py-3 bg-[#14532D] text-white font-bold text-xs uppercase tracking-wider rounded-xl">Next: Buyer Contact Details</button>
                </div>
              </div>
            )}

            {/* STEP 6: Buyer Info Form */}
            {step === 6 && (
              <form onSubmit={handleGenerateQuote} className="bg-stone-900/80 border border-stone-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
                <div className="border-b border-stone-800 pb-4">
                  <h2 className="text-xl font-bold text-white font-jakarta">Step 6. Buyer Contact Information</h2>
                  <p className="text-xs text-stone-400">Enter your company and contact details to issue official Pro Forma Invoice.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1">Company Name *</label>
                    <input
                      required
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="e.g. Pacific Foods Import Co."
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs text-stone-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1">Contact Name *</label>
                    <input
                      required
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Smith (Purchasing Manager)"
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs text-stone-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1">Business Email *</label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. john@pacificfoods.com"
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs text-stone-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1">Phone / WhatsApp</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +1 310 555 0199"
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs text-stone-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1">Business Type</label>
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs text-stone-100 font-bold"
                    >
                      <option value="Importer / Distributor">Importer / Distributor</option>
                      <option value="Supermarket Chain">Supermarket / Retail Chain</option>
                      <option value="Restaurant Group">Restaurant Group / Catering</option>
                      <option value="Private Label / OEM">Private Label / OEM Brand Owner</option>
                      <option value="Online Retailer">Online Retailer / E-Commerce</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1">Additional Notes / Special Request</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Halal certification required, custom label"
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs text-stone-100"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-between items-center">
                  <button type="button" onClick={() => setStep(5)} className="px-6 py-3 bg-stone-800 text-stone-300 text-xs font-bold rounded-xl">Back</button>
                  <button
                    type="submit"
                    className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xl flex items-center space-x-2"
                  >
                    <FileText size={16} />
                    <span>Submit RFQ &amp; Generate Pro Forma Invoice</span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 7: Generated Official Pro Forma PDF Quotation */}
            {step === 7 && generatedQuote && (
              <div className="bg-white text-stone-900 rounded-2xl p-8 sm:p-12 shadow-2xl space-y-8 font-sans border-4 border-amber-500/80 print:p-0 print:border-none">
                {/* Print / Download Bar */}
                <div className="flex justify-between items-center border-b pb-6 border-stone-200 print:hidden">
                  <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <span>Export Quotation No. {generatedQuote.quoteNo} Generated Successfully</span>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold flex items-center space-x-2 hover:bg-stone-800"
                    >
                      <Printer size={14} />
                      <span>Print / Save PDF</span>
                    </button>
                  </div>
                </div>

                {/* PDF Quotation Document Header */}
                <div className="flex justify-between items-start border-b-2 border-stone-900 pb-6">
                  <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-stone-900 font-jakarta">
                      K-FOOD EXPORT QUOTATION
                    </h2>
                    <div className="text-xs font-bold text-amber-700 mt-1">PRO FORMA INVOICE / OFFICIAL QUOTE</div>
                    <div className="text-xs text-stone-500 mt-2">
                      Quotation No: <strong className="text-stone-900">{generatedQuote.quoteNo}</strong><br />
                      Date: {new Date().toLocaleDateString()}<br />
                      Validity: 30 Days from issuance (FX Rate: ₩{exchangeRate.toLocaleString()} KRW/USD)
                    </div>
                  </div>

                  <div className="text-right text-xs space-y-1">
                    <div className="font-extrabold text-stone-900 text-sm">SONG YOUNGMIN FOOD CO., LTD.</div>
                    <div className="text-stone-600">Premium K-Food Export &amp; Distribution Platform</div>
                    <div className="text-stone-600">Busan Port Cold-Chain Trade Hub, South Korea</div>
                    <div className="text-stone-600">Email: export@songyoungminfood.com</div>
                    <div className="text-stone-600">Web: www.songyoungminfood.com</div>
                  </div>
                </div>

                {/* Buyer & Seller Info Box */}
                <div className="grid grid-cols-2 gap-6 bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs">
                  <div>
                    <div className="font-extrabold text-stone-800 uppercase tracking-wider mb-2">Buyer Information</div>
                    <div>Company: <strong>{generatedQuote.company}</strong></div>
                    <div>Contact: {generatedQuote.name} ({generatedQuote.businessType})</div>
                    <div>Email: {generatedQuote.email}</div>
                    <div>Phone: {generatedQuote.phone || 'N/A'}</div>
                    <div>Destination: <strong>{generatedQuote.country} ({generatedQuote.destinationPort})</strong></div>
                  </div>

                  <div>
                    <div className="font-extrabold text-stone-800 uppercase tracking-wider mb-2">Trade &amp; Export Terms</div>
                    <div>Incoterms: <strong>{generatedQuote.incoterms}</strong></div>
                    <div>Loading Port: <strong>Busan Port, Korea</strong></div>
                    <div>Applied FX Rate: <strong>₩{exchangeRate.toLocaleString()} KRW/USD</strong></div>
                    <div>Payment Terms: T/T 30% Deposit, 70% against B/L</div>
                    <div>Container Spec: Reefer Cold Chain Container (-18°C)</div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-stone-900 text-white uppercase text-[10px] tracking-wider">
                        <th className="p-3">No</th>
                        <th className="p-3">Product Description</th>
                        <th className="p-3">HS Code</th>
                        <th className="p-3 text-right">Qty (CTN)</th>
                        <th className="p-3 text-right">Unit Price (USD)</th>
                        <th className="p-3 text-right">Total Amount (USD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {generatedQuote.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-stone-50">
                          <td className="p-3 font-bold text-stone-500">{idx + 1}</td>
                          <td className="p-3 font-bold text-stone-900">{item.name}</td>
                          <td className="p-3 text-stone-600 font-mono">{item.hsCode}</td>
                          <td className="p-3 text-right font-bold">{item.quantityCartons} CTN</td>
                          <td className="p-3 text-right">${item.unitPriceUsd.toFixed(2)}</td>
                          <td className="p-3 text-right font-bold text-stone-900">${item.totalUsd.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary Totals */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-amber-50 border border-amber-200 p-6 rounded-xl gap-4">
                  <div className="text-xs space-y-1">
                    <div>Total Order CBM: <strong className="text-stone-900">{generatedQuote.totalCbm} m³</strong></div>
                    <div>Total Gross Weight: <strong className="text-stone-900">{generatedQuote.totalGrossWeight} kg</strong></div>
                    <div>20ft Reefer Container Utilization: <strong className="text-amber-800">{generatedQuote.reeferContainerFillPercent}%</strong></div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-xs text-stone-600">Subtotal: ${generatedQuote.subtotalUsd.toLocaleString()} USD (≈ ₩{subtotalKrw.toLocaleString()} KRW)</div>
                    <div className="text-xs text-stone-600">Export Packing / Palletization Fee: ${generatedQuote.packingFeeUsd} USD</div>
                    <div className="text-xl font-extrabold text-stone-900 font-jakarta border-t border-amber-300 pt-1">
                      TOTAL ({generatedQuote.incoterms}): <span className="text-[#14532D]">${generatedQuote.totalUsd.toLocaleString()} USD</span>
                    </div>
                  </div>
                </div>

                {/* Footer Terms */}
                <div className="text-[11px] text-stone-500 border-t border-stone-200 pt-4 space-y-1">
                  <p>• All export products are manufactured in HACCP &amp; FSSC 22000 certified facilities in South Korea.</p>
                  <p>• Applied exchange rate: ₩{exchangeRate.toLocaleString()} KRW per 1 USD (Daily rate set by Song Youngmin Food Admin).</p>
                </div>
              </div>
            )}

          </div>

          {/* Live Calculation Sidebar Right Column (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-stone-900/80 border border-amber-500/40 rounded-2xl p-6 space-y-6 sticky top-24 backdrop-blur shadow-2xl">
              <h3 className="text-base font-bold text-white font-jakarta flex items-center space-x-2 border-b border-stone-800 pb-3">
                <Calculator size={18} className="text-[#EAB308]" />
                <span>Real-time Quote Summary</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between text-stone-300">
                  <span>Selected Products:</span>
                  <strong className="text-white">{selectedProductList.length} Items</strong>
                </div>
                <div className="flex justify-between text-stone-300">
                  <span>Applied Exchange Rate:</span>
                  <strong className="text-emerald-400 font-mono">₩{exchangeRate.toLocaleString()} / $1 USD</strong>
                </div>
                <div className="flex justify-between text-stone-300">
                  <span>Total Volume (CBM):</span>
                  <strong className="text-amber-400">{totalCbm} m³</strong>
                </div>
                <div className="flex justify-between text-stone-300">
                  <span>Gross Weight:</span>
                  <strong className="text-stone-100">{totalGrossWeight} kg</strong>
                </div>

                {/* Reefer Container Progress Bar */}
                <div className="pt-2">
                  <div className="flex justify-between text-[11px] font-bold text-stone-300 mb-1">
                    <span>20ft Reefer Fill Rate:</span>
                    <span className="text-amber-400">{fillRate}%</span>
                  </div>
                  <div className="w-full bg-stone-950 rounded-full h-2.5 overflow-hidden border border-stone-800">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${fillRate}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-stone-500 mt-1">Full 20ft Container ~ 28.0 CBM</p>
                </div>

                <div className="border-t border-stone-800 pt-3 flex justify-between items-center">
                  <span className="text-stone-300 font-bold">Estimated Quote:</span>
                  <span className="text-xl font-extrabold text-[#EAB308] font-jakarta">${totalUsd.toLocaleString()} USD</span>
                </div>
              </div>

              <div className="bg-emerald-950/60 border border-emerald-800/40 p-4 rounded-xl text-xs space-y-2 text-emerald-200">
                <div className="font-bold flex items-center space-x-1.5 text-white">
                  <ShieldCheck size={14} className="text-[#EAB308]" />
                  <span>Song Youngmin Export Guarantee</span>
                </div>
                <p className="text-[11px] text-stone-300">
                  Official Pro Forma Invoice calculated using standard Master Carton prices and daily FX rate (₩{exchangeRate.toLocaleString()} / USD).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RFQPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0C] text-stone-400 p-10 font-mono text-xs">Loading RFQ Platform...</div>}>
      <RFQContent />
    </Suspense>
  );
}
