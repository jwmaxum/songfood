'use client';

import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductItem } from '@/lib/types';
import { useLanguage } from '@/lib/i18n/LanguageContext';
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
} from 'lucide-react';

interface CollectionShowcaseClientProps {
  initialProducts: ProductItem[];
  initialLookFilter?: string;
  initialCollectionFilter?: string;
}

const FORMAT_OPTIONS = ['500ml Bottle', '250g Jar', '500g Block', '100g Sliced Pack', '350g Prime Cut', '3kg Box'];
const FINISH_OPTIONS = ['Cold-Pressed', '36-Month Aged', '25-Year Barrel Aged', 'Dry-Aged & Chilled', 'Wild Harvested'];
const COLOR_OPTIONS = ['Emerald Gold', 'Warm Ivory', 'Obsidian Black', 'Deep Ruby', 'Dark Velvet Brown', 'Amber Gold'];
const LOOK_OPTIONS = ['Italian Heritage', 'DOP Certified Organic', 'Gourmet Reserve', 'Artisan Charcuterie', 'A5 Prime Grade', 'Certified Organic'];

export default function CollectionShowcaseClient({
  initialProducts,
  initialLookFilter,
  initialCollectionFilter,
}: CollectionShowcaseClientProps) {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const urlLook = searchParams.get('look');
  const urlCollection = searchParams.get('collection');

  // Filter States
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedFinishes, setSelectedFinishes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedLooks, setSelectedLooks] = useState<string[]>(
    urlLook ? [urlLook] : initialLookFilter ? [initialLookFilter] : []
  );
  const [selectedCollection, setSelectedCollection] = useState<string>(
    urlCollection || initialCollectionFilter || 'All'
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Quick View Detail Modal State
  const [activeModalProduct, setActiveModalProduct] = useState<ProductItem | null>(null);

  // Mobile Filter Drawer Toggle
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Client-side Interactive Filter logic
  const filteredProducts = useMemo(() => {
    return initialProducts.filter((product) => {
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
            {['All', 'Fresh & Gourmet', 'Artisanal Pantry', 'Dairy & Charcuterie'].map((coll) => (
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
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="group bg-[#121217] border border-stone-800 rounded overflow-hidden hover:border-[#c5a880]/60 transition-all duration-300 flex flex-col justify-between shadow-lg"
                  >
                    {/* Visual Card Image */}
                    <div
                      className="relative h-64 overflow-hidden bg-stone-900 cursor-pointer"
                      onClick={() => setActiveModalProduct(product)}
                    >
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 filter brightness-95 group-hover:brightness-105"
                      />
                      
                      {/* Dark Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#121217] via-transparent to-black/30 opacity-75 group-hover:opacity-60 transition-opacity" />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        <span className="px-2 py-0.5 bg-black/70 border border-white/10 backdrop-blur-md rounded text-[10px] uppercase font-mono text-[#c5a880]">
                          {product.collection}
                        </span>
                        {product.is_featured && (
                          <span className="px-2 py-0.5 bg-[#c5a880] text-black font-semibold rounded text-[10px] uppercase tracking-wider">
                            Featured
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
                          className="px-4 py-2 bg-[#c5a880] hover:bg-white text-black font-semibold text-xs uppercase tracking-widest rounded flex items-center space-x-1.5 shadow-2xl transform translate-y-2 group-hover:translate-y-0 transition-all"
                        >
                          <Maximize2 size={13} />
                          <span>Quick View</span>
                        </button>
                      </div>
                    </div>

                    {/* Card Body Info */}
                    <div className="p-5 space-y-3 flex-grow">
                      <div>
                        <span className="text-[10px] font-mono text-stone-500 uppercase tracking-widest">
                          {product.look} • {product.format}
                        </span>
                        <h3
                          onClick={() => setActiveModalProduct(product)}
                          className="font-serif-luxury text-lg text-white font-medium group-hover:text-[#c5a880] transition-colors cursor-pointer"
                        >
                          {product.name}
                        </h3>
                      </div>

                      {/* Specs Row */}
                      <div className="flex flex-wrap gap-2 text-[10px] text-stone-400 font-mono pt-1 border-t border-stone-800/50">
                        <span className="px-2 py-0.5 bg-[#181822] rounded border border-stone-800">
                          Finish: {product.finish}
                        </span>
                        <span className="px-2 py-0.5 bg-[#181822] rounded border border-stone-800">
                          Tone: {product.color}
                        </span>
                        {product.thickness && (
                          <span className="px-2 py-0.5 bg-[#181822] rounded border border-stone-800">
                            {product.thickness}
                          </span>
                        )}
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
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121218] border border-stone-800 rounded-lg max-w-3xl w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 grid grid-cols-1 md:grid-cols-12">
            
            {/* Modal Image Left */}
            <div className="md:col-span-6 relative h-64 md:h-auto bg-black">
              <img
                src={activeModalProduct.image_url}
                alt={activeModalProduct.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Modal Content Right */}
            <div className="md:col-span-6 p-6 md:p-8 flex flex-col justify-between space-y-6">
              <div>
                <div className="flex justify-between items-start">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#c5a880]">
                    {activeModalProduct.collection}
                  </span>
                  <button
                    onClick={() => setActiveModalProduct(null)}
                    className="p-1 text-stone-400 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                <h2 className="font-serif-luxury text-2xl text-white font-medium mt-1">
                  {activeModalProduct.name}
                </h2>

                <p className="text-xs text-stone-300 font-light mt-3 leading-relaxed">
                  {activeModalProduct.description}
                </p>

                {/* Attribute Specifications Table */}
                <div className="mt-6 border-t border-b border-stone-800/80 py-4 space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Format / Size:</span>
                    <span className="text-white">{activeModalProduct.format}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Surface Finish:</span>
                    <span className="text-white">{activeModalProduct.finish}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Color Tone:</span>
                    <span className="text-white">{activeModalProduct.color}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Aesthetic Look:</span>
                    <span className="text-white">{activeModalProduct.look}</span>
                  </div>
                  {activeModalProduct.thickness && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">Thickness:</span>
                      <span className="text-white">{activeModalProduct.thickness}</span>
                    </div>
                  )}
                  {activeModalProduct.origin && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">Craft Origin:</span>
                      <span className="text-white">{activeModalProduct.origin}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => setActiveModalProduct(null)}
                  className="w-full py-2.5 bg-[#c5a880] hover:bg-[#dbbc93] text-black font-semibold text-xs tracking-wider uppercase rounded transition-colors"
                >
                  Close Spec Preview
                </button>
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
                {FORMAT_OPTIONS.map((fmt) => (
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
                {FINISH_OPTIONS.map((fn) => (
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
                {LOOK_OPTIONS.map((lk) => (
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
