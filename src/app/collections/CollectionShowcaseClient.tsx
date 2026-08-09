'use client';

import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductItem } from '@/lib/types';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useCart } from '@/context/CartContext';
import {
  Filter,
  X,
  Maximize2,
  Check,
  Search,
  Grid,
  Layers,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  ShoppingBag,
} from 'lucide-react';

interface CollectionShowcaseClientProps {
  initialProducts: ProductItem[];
  initialLookFilter?: string;
  initialCollectionFilter?: string;
}

export default function CollectionShowcaseClient({
  initialProducts,
  initialLookFilter,
  initialCollectionFilter,
}: CollectionShowcaseClientProps) {
  const { t } = useLanguage();
  const { addToCart } = useCart();
  const searchParams = useSearchParams();
  const catParam = searchParams.get('cat');
  const urlLook = searchParams.get('look');
  const urlCollection = searchParams.get('collection');

  // Dynamic Options derived from products DB
  const formatOptions = useMemo(
    () => Array.from(new Set(initialProducts.map((p) => p.format).filter(Boolean))),
    [initialProducts]
  );
  const finishOptions = useMemo(
    () => Array.from(new Set(initialProducts.map((p) => p.finish).filter(Boolean))),
    [initialProducts]
  );
  const colorOptions = useMemo(
    () => Array.from(new Set(initialProducts.map((p) => p.color).filter(Boolean))),
    [initialProducts]
  );
  const lookOptions = useMemo(
    () => Array.from(new Set(initialProducts.map((p) => p.look).filter(Boolean))),
    [initialProducts]
  );

  const getInitialCollection = () => {
    if (urlCollection) return urlCollection;
    if (initialCollectionFilter) return initialCollectionFilter;
    if (catParam) {
      const catMap: Record<string, string> = {
        fresh: 'K-냉동식품',
        dairy: 'K-주류 & 전통주',
        pantry: 'K-간편식/HMR',
        traditional: 'K-전통식품',
        kimchi: 'K-전통식품',
        sauce: 'K-소스/조미료',
        snack: 'K-스낵/음료',
      };
      return catMap[catParam.toLowerCase()] || 'All';
    }
    return 'All';
  };

  // Filter States
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedFinishes, setSelectedFinishes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedLooks, setSelectedLooks] = useState<string[]>(
    urlLook ? [urlLook] : initialLookFilter ? [initialLookFilter] : []
  );
  const [selectedCollection, setSelectedCollection] = useState<string>(getInitialCollection());
  const [searchQuery, setSearchQuery] = useState('');

  // Quick View Detail Modal State
  const [activeModalProduct, setActiveModalProduct] = useState<ProductItem | null>(null);
  const [modalSelectedTier, setModalSelectedTier] = useState<'ea' | 'box' | 'carton'>('ea');

  // Mobile Filter Drawer Toggle
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Client-side Interactive Filter logic
  const filteredProducts = useMemo(() => {
    return initialProducts.filter((product) => {
      // catParam === 'deals' special filter
      if (catParam?.toLowerCase() === 'deals' && !product.is_todays_deal && !product.is_featured) {
        return false;
      }

      // Collection Filter
      if (
        selectedCollection !== 'All' &&
        product.collection.toLowerCase() !== selectedCollection.toLowerCase()
      ) {
        return false;
      }

      // Format Filter
      if (selectedFormats.length > 0 && !selectedFormats.includes(product.format)) {
        return false;
      }

      // Finish Filter
      if (selectedFinishes.length > 0 && !selectedFinishes.includes(product.finish)) {
        return false;
      }

      // Color Filter
      if (selectedColors.length > 0 && !selectedColors.includes(product.color)) {
        return false;
      }

      // Look Filter
      if (selectedLooks.length > 0 && !selectedLooks.includes(product.look)) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(q);
        const matchesDesc = product.description.toLowerCase().includes(q);
        const matchesColl = product.collection.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesColl) return false;
      }

      return true;
    });
  }, [
    initialProducts,
    catParam,
    selectedCollection,
    selectedFormats,
    selectedFinishes,
    selectedColors,
    selectedLooks,
    searchQuery,
  ]);

  const toggleFilterItem = (
    array: string[],
    setArray: React.Dispatch<React.SetStateAction<string[]>>,
    value: string
  ) => {
    if (array.includes(value)) {
      setArray(array.filter((item) => item !== value));
    } else {
      setArray([...array, value]);
    }
  };

  const clearAllFilters = () => {
    setSelectedFormats([]);
    setSelectedFinishes([]);
    setSelectedColors([]);
    setSelectedLooks([]);
    setSelectedCollection('All');
    setSearchQuery('');
  };

  const activeFilterCount =
    selectedFormats.length +
    selectedFinishes.length +
    selectedColors.length +
    selectedLooks.length +
    (selectedCollection !== 'All' ? 1 : 0);

  const collectionTabs = [
    'All',
    'K-냉동식품',
    'K-전통식품',
    'K-간편식/HMR',
    'K-소스/조미료',
    'K-주류 & 전통주',
    'K-스낵/음료',
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-stone-100 font-sans pb-24">
      {/* Top Page Banner Header */}
      <div className="relative py-20 bg-gradient-to-b from-[#121218] via-[#0e0e12] to-[#0a0a0c] border-b border-stone-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <h1 className="font-serif-luxury text-3xl sm:text-5xl font-light text-white tracking-tight">
            송영민푸드 K-Food 프리미엄 컬렉션
          </h1>

          {/* Quick Collection Tabs */}
          <div className="pt-6 flex flex-wrap justify-center gap-2">
            {collectionTabs.map((coll) => (
              <button
                key={coll}
                onClick={() => setSelectedCollection(coll)}
                className={`px-4 py-2 rounded-full text-xs tracking-wider uppercase font-medium transition-all ${
                  selectedCollection === coll
                    ? 'bg-[#c5a880] text-black shadow-lg font-semibold'
                    : 'bg-[#181822] text-stone-300 border border-stone-800 hover:border-stone-700'
                }`}
              >
                {coll}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area: Sidebar Filters & Lookbook Visual Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        
        {/* Top Search & Filter Bar Controls */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-8 pb-6 border-b border-stone-800/60">
          
          {/* Search Box */}
          <div className="relative flex-grow max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
            <input
              type="text"
              placeholder="Search by collection name, material..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121218] border border-stone-800 rounded px-10 py-2.5 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-[#c5a880]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between md:justify-end gap-4">
            <span className="text-xs text-stone-400 font-mono">
              Showing <strong className="text-white">{filteredProducts.length}</strong> items
            </span>

            {/* Mobile Filter Drawer Button */}
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden flex items-center space-x-2 bg-[#161620] border border-stone-800 px-4 py-2 rounded text-xs text-stone-300 hover:text-white"
            >
              <SlidersHorizontal size={14} className="text-[#c5a880]" />
              <span>Filters ({activeFilterCount})</span>
            </button>

            {/* Clear All Button */}
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-[#c5a880] hover:underline flex items-center space-x-1"
              >
                <X size={13} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Full-width Product Grid Section */}
        <div>
          <main className="w-full">
            {filteredProducts.length === 0 ? (
              <div className="py-24 text-center space-y-4 bg-[#121218]/50 border border-stone-800 rounded-lg">
                <Grid size={32} className="mx-auto text-stone-600" />
                <p className="text-stone-400 text-sm">No items found matching the selected category.</p>
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 bg-[#c5a880] text-black text-xs font-semibold uppercase tracking-wider rounded"
                >
                  Reset Category Filter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredProducts.map((product, idx) => (
                  <div
                    key={product.id}
                    className="group bg-white dark:bg-[#121217] text-stone-900 dark:text-stone-100 border border-stone-200/80 dark:border-stone-800 rounded-2xl overflow-hidden hover:border-[#14532D] dark:hover:border-[#c5a880]/80 transition-all duration-300 flex flex-col justify-between shadow-xl hover:shadow-2xl"
                  >
                    {/* Visual Card Image */}
                    <div
                      className="relative h-64 overflow-hidden bg-stone-100 dark:bg-stone-900 cursor-pointer"
                      onClick={() => setActiveModalProduct(product)}
                    >
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                      />

                      {/* Top Badges (Image 2 style: #1 Best, #2 Best...) */}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        <span className="px-2.5 py-1 bg-[#14532D] text-emerald-100 font-extrabold text-[11px] rounded-md shadow-md tracking-wider">
                          #{idx + 1} Best
                        </span>
                        {product.collection && (
                          <span className="px-2 py-0.5 bg-stone-900/80 text-amber-300 font-bold rounded text-[10px] uppercase backdrop-blur-sm">
                            {product.collection}
                          </span>
                        )}
                      </div>

                      {/* Hover Quick View Trigger Icon */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveModalProduct(product);
                          }}
                          className="px-4 py-2 bg-[#c5a880] hover:bg-white text-black font-extrabold text-xs uppercase tracking-widest rounded-lg flex items-center space-x-1.5 shadow-2xl transform translate-y-2 group-hover:translate-y-0 transition-all"
                        >
                          <Maximize2 size={13} />
                          <span>Quick View</span>
                        </button>
                      </div>
                    </div>

                    {/* Card Body Info */}
                    <div className="p-5 space-y-3 flex-grow flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                          {product.origin || '대한민국 (KOREA)'}
                        </span>

                        <h3
                          onClick={() => setActiveModalProduct(product)}
                          className="font-bold text-base text-stone-900 dark:text-white group-hover:text-[#14532D] dark:group-hover:text-[#c5a880] transition-colors cursor-pointer leading-snug line-clamp-2"
                        >
                          {product.name}
                        </h3>

                        {/* Rating Row (Image 2 style) */}
                        <div className="flex items-center space-x-1 text-xs text-stone-600 dark:text-stone-400 font-medium">
                          <span className="text-amber-500 font-bold flex items-center space-x-0.5">
                            <span>★</span>
                            <span>{product.rating || 4.9}</span>
                          </span>
                          <span className="text-stone-400 font-normal">({product.reviews_count || (80 + idx * 12)}개 후기)</span>
                        </div>
                      </div>

                      {/* Dual Price Box (Image 2 100% 1:1 Matching) */}
                      <div className="bg-stone-50 dark:bg-[#101411] border border-stone-200/80 dark:border-emerald-900/40 p-3 rounded-xl space-y-1 font-mono text-xs">
                        <div className="flex justify-between items-center text-stone-700 dark:text-[#c59b27] font-bold">
                          <span>소량 개별가:</span>
                          <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">
                            ₩{(product.price || 10000).toLocaleString()}원
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-amber-700 dark:text-amber-400 font-bold text-[11px]">
                          <span>📦 대용량({product.carton_qty || 10}개):</span>
                          <span className="line-through text-stone-400 mr-1 text-[10px]">
                            ₩{((product.price || 10000) * (product.carton_qty || 10)).toLocaleString()}원
                          </span>
                          <span className="font-extrabold">
                            ₩{Math.round((product.price || 10000) * (product.carton_qty || 10) * (1 - (product.wholesale_discount_rate || 0.15))).toLocaleString()}원
                          </span>
                        </div>
                      </div>

                      {/* Purchase Action Buttons (Image 2 style: 장바구니 & 바로 결제) */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(product, 1);
                          }}
                          className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-xs"
                        >
                          <ShoppingBag size={14} />
                          <span>장바구니</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(product, 1);
                            window.location.href = '/checkout';
                          }}
                          className="flex-1 py-2.5 bg-[#14532D] hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-md"
                        >
                          <span>⚡ 바로 결제</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Quick View Detail Modal */}
      {activeModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121218] border border-stone-800 rounded-xl max-w-3xl w-full p-6 space-y-5 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActiveModalProduct(null)}
              className="absolute top-4 right-4 text-stone-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Images */}
              <div className="md:col-span-5 space-y-3">
                <div className="h-64 rounded-lg overflow-hidden bg-stone-900 border border-stone-800 relative">
                  <img
                    src={activeModalProduct.image_url}
                    alt={activeModalProduct.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* 6 Thumbnails */}
                {activeModalProduct.images && activeModalProduct.images.length > 0 && (
                  <div className="grid grid-cols-6 gap-1.5">
                    {activeModalProduct.images.slice(0, 6).map((img, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          if (activeModalProduct) {
                            setActiveModalProduct({
                              ...activeModalProduct,
                              image_url: img,
                            });
                          }
                        }}
                        className={`h-10 rounded overflow-hidden border cursor-pointer ${
                          activeModalProduct.image_url === img ? 'border-[#c5a880] ring-1 ring-[#c5a880]' : 'border-stone-800 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="Thumb" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Specifications & 3-Tier */}
              <div className="md:col-span-7 space-y-4">
                <div>
                  <div className="text-[10px] text-[#c5a880] font-mono uppercase tracking-widest">
                    {activeModalProduct.collection}
                  </div>
                  <h3 className="font-serif-luxury text-xl font-bold text-white mt-1">
                    {activeModalProduct.name}
                  </h3>

                  {/* Certifications Badges */}
                  {activeModalProduct.certifications && activeModalProduct.certifications.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {activeModalProduct.certifications.map((cert) => (
                        <span key={cert} className="bg-emerald-950 text-emerald-300 border border-emerald-700/50 text-[9px] font-mono px-1.5 py-0.5 rounded font-bold">
                          ✓ {cert}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-xs text-stone-300 leading-relaxed font-light line-clamp-3">
                  {activeModalProduct.description}
                </p>

                {/* Specs Box */}
                <div className="bg-[#0a0a0c] p-3 rounded border border-stone-800 text-[11px] font-mono space-y-1 text-stone-400">
                  <div>용량/무게: <span className="text-stone-200">{activeModalProduct.net_weight || activeModalProduct.format}</span></div>
                  <div>보관방법: <span className="text-stone-200">{activeModalProduct.storage || '영하 18℃ 이하 냉동 보관'}</span></div>
                  <div>유통기한: <span className="text-stone-200">{activeModalProduct.shelf_life || '제조일로부터 12개월'}</span></div>
                </div>

                {/* 3-Tier Price Table with Explicit Select Buttons */}
                {(() => {
                  const eaPrice = activeModalProduct.price || 10000;
                  const boxQty = activeModalProduct.box_qty || 20;
                  const boxPrice = activeModalProduct.box_price || Math.round(eaPrice * boxQty * 0.9);
                  const cartonBoxQty = activeModalProduct.carton_box_qty || 5;
                  const cartonTotalQty = cartonBoxQty * boxQty;
                  const cartonPrice = activeModalProduct.carton_price || Math.round(eaPrice * cartonTotalQty * 0.8);

                  const selectedPrice =
                    modalSelectedTier === 'box'
                      ? boxPrice
                      : modalSelectedTier === 'carton'
                      ? cartonPrice
                      : eaPrice;

                  const selectedLabel =
                    modalSelectedTier === 'box'
                      ? `1박스 (${boxQty}개입)`
                      : modalSelectedTier === 'carton'
                      ? `1카톤 (${cartonTotalQty}개입 / ${cartonBoxQty}박스)`
                      : `1개 (EA)`;

                  return (
                    <div className="space-y-3">
                      <div className="border border-emerald-900/40 rounded-lg overflow-hidden text-[11px] font-mono bg-[#101411]">
                        <table className="w-full text-center divide-y divide-emerald-900/30">
                          <thead className="bg-stone-900 text-stone-400 text-[10px]">
                            <tr>
                              <th className="py-1.5 px-2 text-left">구분</th>
                              <th className="py-1.5 px-2">낱개 (EA)</th>
                              <th className="py-1.5 px-2">박스 (Box)</th>
                              <th className="py-1.5 px-2">카톤 (Carton)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-emerald-900/20 text-stone-200">
                            <tr>
                              <td className="py-1.5 px-2 text-left text-stone-400 font-semibold">단위</td>
                              <td className="py-1.5 px-2">1개 (EA)</td>
                              <td className="py-1.5 px-2">1박스 ({boxQty}개입)</td>
                              <td className="py-1.5 px-2">1카톤 ({cartonTotalQty}개입)</td>
                            </tr>
                            <tr className="font-bold">
                              <td className="py-1.5 px-2 text-left text-stone-400 font-semibold">가격</td>
                              <td className="py-1.5 px-2 text-[#c5a880]">₩{eaPrice.toLocaleString()}원</td>
                              <td className="py-1.5 px-2 text-amber-400">₩{boxPrice.toLocaleString()}원</td>
                              <td className="py-1.5 px-2 text-emerald-400">₩{cartonPrice.toLocaleString()}원</td>
                            </tr>
                            <tr>
                              <td className="py-1.5 px-2 text-left text-stone-400 font-semibold">선택</td>
                              <td className="py-1.5 px-2">
                                <button
                                  type="button"
                                  onClick={() => setModalSelectedTier('ea')}
                                  className={`w-full py-1 rounded text-[10px] font-bold border transition-all ${
                                    modalSelectedTier === 'ea'
                                      ? 'bg-[#c5a880] text-black border-[#c5a880] shadow'
                                      : 'bg-stone-900 text-stone-400 border-stone-700 hover:text-white'
                                  }`}
                                >
                                  {modalSelectedTier === 'ea' ? '✓ 선택됨' : '낱개 선택'}
                                </button>
                              </td>
                              <td className="py-1.5 px-2">
                                <button
                                  type="button"
                                  onClick={() => setModalSelectedTier('box')}
                                  className={`w-full py-1 rounded text-[10px] font-bold border transition-all ${
                                    modalSelectedTier === 'box'
                                      ? 'bg-amber-400 text-black border-amber-400 shadow'
                                      : 'bg-stone-900 text-stone-400 border-stone-700 hover:text-white'
                                  }`}
                                >
                                  {modalSelectedTier === 'box' ? '✓ 선택됨' : '박스 선택'}
                                </button>
                              </td>
                              <td className="py-1.5 px-2">
                                <button
                                  type="button"
                                  onClick={() => setModalSelectedTier('carton')}
                                  className={`w-full py-1 rounded text-[10px] font-bold border transition-all ${
                                    modalSelectedTier === 'carton'
                                      ? 'bg-emerald-400 text-black border-emerald-400 shadow'
                                      : 'bg-stone-900 text-stone-400 border-stone-700 hover:text-white'
                                  }`}
                                >
                                  {modalSelectedTier === 'carton' ? '✓ 선택됨' : '카톤 선택'}
                                </button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="text-right text-xs font-mono text-stone-300">
                        선택된 옵션: <strong className="text-[#c5a880]">{selectedLabel}</strong> ={' '}
                        <span className="text-base font-bold text-white">₩{selectedPrice.toLocaleString()}원</span>
                      </div>

                      <div className="pt-1 flex gap-3">
                        <button
                          onClick={() => {
                            addToCart(
                              activeModalProduct,
                              1,
                              selectedLabel,
                              activeModalProduct.finish,
                              modalSelectedTier,
                              selectedPrice,
                              selectedLabel
                            );
                            setActiveModalProduct(null);
                          }}
                          className="flex-1 py-2.5 bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs rounded-lg flex items-center justify-center space-x-1.5 transition-colors border border-stone-700"
                        >
                          <ShoppingBag size={14} />
                          <span>장바구니 담기</span>
                        </button>

                        <button
                          onClick={() => {
                            addToCart(
                              activeModalProduct,
                              1,
                              selectedLabel,
                              activeModalProduct.finish,
                              modalSelectedTier,
                              selectedPrice,
                              selectedLabel
                            );
                            window.location.href = '/checkout';
                          }}
                          className="flex-1 py-2.5 bg-[#14532D] hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg flex items-center justify-center space-x-1.5 transition-all shadow-lg"
                        >
                          <span>⚡ 바로 결제 (Checkout)</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Filters Drawer */}
      {mobileFilterOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-end">
          <div className="w-full max-w-xs bg-[#121218] border-l border-stone-800 h-full p-6 overflow-y-auto space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-stone-800">
              <h2 className="text-sm font-serif-luxury text-white font-semibold">Filter Collections</h2>
              <button onClick={() => setMobileFilterOpen(false)} className="text-stone-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Mobile Filter Lists */}
            <div className="space-y-6 text-xs">
              <div>
                <h3 className="text-[#c5a880] uppercase tracking-wider mb-2 font-semibold">Format</h3>
                {formatOptions.map((fmt: string) => (
                  <label key={fmt} className="flex items-center space-x-2 py-1 text-stone-300">
                    <input
                      type="checkbox"
                      checked={selectedFormats.includes(fmt)}
                      onChange={() => toggleFilterItem(selectedFormats, setSelectedFormats, fmt)}
                    />
                    <span>{fmt}</span>
                  </label>
                ))}
              </div>

              <div>
                <h3 className="text-[#c5a880] uppercase tracking-wider mb-2 font-semibold">Finish</h3>
                {finishOptions.map((fn: string) => (
                  <label key={fn} className="flex items-center space-x-2 py-1 text-stone-300">
                    <input
                      type="checkbox"
                      checked={selectedFinishes.includes(fn)}
                      onChange={() => toggleFilterItem(selectedFinishes, setSelectedFinishes, fn)}
                    />
                    <span>{fn}</span>
                  </label>
                ))}
              </div>

              <div>
                <h3 className="text-[#c5a880] uppercase tracking-wider mb-2 font-semibold">Look</h3>
                {lookOptions.map((lk: string) => (
                  <label key={lk} className="flex items-center space-x-2 py-1 text-stone-300">
                    <input
                      type="checkbox"
                      checked={selectedLooks.includes(lk)}
                      onChange={() => toggleFilterItem(selectedLooks, setSelectedLooks, lk)}
                    />
                    <span>{lk}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-stone-800">
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="w-full py-2.5 bg-[#c5a880] text-black font-semibold text-xs tracking-wider uppercase rounded"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
