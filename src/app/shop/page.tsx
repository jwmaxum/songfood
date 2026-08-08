'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import productsData from '@/../data/products.json';
import { ProductItem } from '@/lib/types';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import {
  Search,
  Filter,
  Grid,
  List,
  Star,
  Heart,
  ShoppingBag,
  Eye,
  X,
  Check,
  ChevronRight,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';

export default function ShopPage() {
  const products: ProductItem[] = productsData as ProductItem[];
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCollection, setSelectedCollection] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('featured');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [maxPrice, setMaxPrice] = useState<number>(400);

  // Quick View Modal State
  const [quickViewProduct, setQuickViewProduct] = useState<ProductItem | null>(null);
  const [quickViewQty, setQuickViewQty] = useState(1);
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // Extract Categories & Collections
  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
    return ['All', ...cats];
  }, [products]);

  const collections = useMemo(() => {
    const cols = Array.from(new Set(products.map((p) => p.collection)));
    return ['All', ...cols];
  }, [products]);

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesSearch =
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.origin?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory =
          selectedCategory === 'All' || p.category === selectedCategory;
        const matchesCollection =
          selectedCollection === 'All' || p.collection === selectedCollection;
        const matchesPrice = (p.price || 50) <= maxPrice;
        return matchesSearch && matchesCategory && matchesCollection && matchesPrice;
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') return (a.price || 0) - (b.price || 0);
        if (sortBy === 'price-high') return (b.price || 0) - (a.price || 0);
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
      });
  }, [products, searchQuery, selectedCategory, selectedCollection, maxPrice, sortBy]);

  const handleAddToCart = (product: ProductItem, qty = 1, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    addToCart(product, qty);
    setAddedToast(product.name);
    setTimeout(() => setAddedToast(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#141815] text-stone-100 pb-20">
      {/* Toast Notification */}
      {addedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#c59b27] text-black font-semibold px-4 py-3 rounded shadow-2xl flex items-center space-x-2 animate-in slide-in-from-bottom duration-300">
          <Check size={18} />
          <span className="text-xs font-mono">Added "{addedToast}" to cart!</span>
        </div>
      )}

      {/* Top Banner & Hero Header */}
      <div className="relative bg-[#0d110e] border-b border-emerald-900/30 py-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#c59b27_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="max-w-7xl mx-auto relative z-10 text-center space-y-4">
          <div className="inline-flex items-center space-x-2 bg-[#c59b27]/10 border border-[#c59b27]/30 text-[#c59b27] text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-widest">
            <Sparkles size={13} />
            <span>WooCommerce Luxury Store</span>
          </div>
          <h1 className="font-serif-luxury text-4xl sm:text-5xl font-light tracking-wide text-white">
            Fine Food & Gourmet Collection
          </h1>
          <p className="text-sm text-stone-400 max-w-2xl mx-auto font-light leading-relaxed">
            Directly sourced from heritage artisans in Italy, France, and Spain. Exceptional olive oils, aged DOP cheeses, and wild truffles.
          </p>

          {/* Breadcrumb */}
          <div className="flex justify-center items-center space-x-2 text-xs text-stone-500 pt-2 font-mono">
            <Link href="/" className="hover:text-stone-300">Home</Link>
            <ChevronRight size={12} />
            <span className="text-[#c59b27]">Shop Catalog</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Sidebar Filter Controls */}
          <aside className="lg:col-span-3 space-y-8 bg-[#101411] border border-emerald-900/30 rounded p-6 h-fit sticky top-28">
            <div className="flex items-center justify-between border-b border-emerald-900/30 pb-3">
              <h3 className="font-serif-luxury text-base text-white font-medium flex items-center space-x-2">
                <Filter size={16} className="text-[#c59b27]" />
                <span>Refine Search</span>
              </h3>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setSelectedCollection('All');
                  setMaxPrice(400);
                }}
                className="text-[11px] text-stone-400 hover:text-[#c59b27] transition-colors"
              >
                Reset All
              </button>
            </div>

            {/* Search Input */}
            <div className="space-y-2">
              <label className="text-xs uppercase font-medium text-stone-400 tracking-wider">Search</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                <input
                  type="text"
                  placeholder="Keyword, origin, taste..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-stone-900 border border-emerald-900/40 rounded pl-8 pr-3 py-2 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-[#c59b27]"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-xs uppercase font-medium text-stone-400 tracking-wider">Category</label>
              <div className="space-y-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat as string)}
                    className={`w-full text-left px-3 py-1.5 rounded text-xs transition-all flex justify-between items-center ${
                      selectedCategory === cat
                        ? 'bg-[#c59b27]/15 text-[#c59b27] font-semibold border border-[#c59b27]/30'
                        : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className="text-[10px] text-stone-500 font-mono">
                      {cat === 'All'
                        ? products.length
                        : products.filter((p) => p.category === cat).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Collection Filter */}
            <div className="space-y-2">
              <label className="text-xs uppercase font-medium text-stone-400 tracking-wider">Collection</label>
              <div className="space-y-1">
                {collections.map((col) => (
                  <button
                    key={col}
                    onClick={() => setSelectedCollection(col)}
                    className={`w-full text-left px-3 py-1.5 rounded text-xs transition-all flex justify-between items-center ${
                      selectedCollection === col
                        ? 'bg-[#c59b27]/15 text-[#c59b27] font-semibold border border-[#c59b27]/30'
                        : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                    }`}
                  >
                    <span>{col}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Price Filter Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs uppercase font-medium text-stone-400 tracking-wider">Max Price</label>
                <span className="text-xs font-mono font-semibold text-[#c59b27]">${maxPrice}</span>
              </div>
              <input
                type="range"
                min={15}
                max={400}
                step={5}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-[#c59b27] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-stone-500 font-mono">
                <span>$15</span>
                <span>$400</span>
              </div>
            </div>
          </aside>

          {/* Right Product Grid Area */}
          <main className="lg:col-span-9 space-y-6">
            
            {/* Top Toolbar */}
            <div className="bg-[#101411] border border-emerald-900/30 rounded p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-xs text-stone-400">
                Showing <span className="font-mono text-stone-100 font-semibold">{filteredProducts.length}</span> products
              </div>

              <div className="flex items-center space-x-4">
                {/* Sort selector */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-stone-400 hidden sm:inline">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-stone-900 border border-emerald-900/40 text-stone-200 text-xs rounded px-3 py-1.5 focus:outline-none focus:border-[#c59b27]"
                  >
                    <option value="featured">Featured First</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Highest Rated</option>
                    <option value="name">Alphabetical (A-Z)</option>
                  </select>
                </div>

                {/* View Mode toggle */}
                <div className="flex items-center border border-emerald-900/40 rounded bg-stone-900 p-0.5">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded ${
                      viewMode === 'grid' ? 'bg-[#c59b27] text-black' : 'text-stone-400 hover:text-white'
                    }`}
                    title="Grid View"
                  >
                    <Grid size={15} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded ${
                      viewMode === 'list' ? 'bg-[#c59b27] text-black' : 'text-stone-400 hover:text-white'
                    }`}
                    title="List View"
                  >
                    <List size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* Products Listing */}
            {filteredProducts.length === 0 ? (
              <div className="bg-[#101411] border border-emerald-900/30 rounded p-12 text-center space-y-4">
                <SlidersHorizontal size={36} className="mx-auto text-stone-600" />
                <h3 className="font-serif-luxury text-lg text-white">No products found</h3>
                <p className="text-xs text-stone-400">Try adjusting your filters or search terms.</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((p) => {
                  const inWish = isInWishlist(p.id);
                  return (
                    <div
                      key={p.id}
                      className="bg-[#111713] border border-emerald-900/30 rounded overflow-hidden group hover:border-[#c59b27]/50 transition-all duration-300 flex flex-col justify-between"
                    >
                      {/* Image Container */}
                      <div className="relative aspect-4/3 overflow-hidden bg-stone-950">
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1">
                          {p.is_featured && (
                            <span className="bg-[#c59b27] text-black font-semibold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded shadow">
                              Featured
                            </span>
                          )}
                          {p.original_price && (
                            <span className="bg-red-950/90 text-red-300 border border-red-700/50 font-mono text-[10px] px-2 py-0.5 rounded">
                              SAVE ${(p.original_price - (p.price || 0)).toFixed(0)}
                            </span>
                          )}
                        </div>

                        {/* Wishlist Button */}
                        <button
                          onClick={() => toggleWishlist(p)}
                          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-colors ${
                            inWish
                              ? 'bg-red-950/80 text-red-500 border border-red-800'
                              : 'bg-black/40 text-stone-300 hover:text-white'
                          }`}
                          title="Toggle Wishlist"
                        >
                          <Heart size={15} fill={inWish ? 'currentColor' : 'none'} />
                        </button>

                        {/* Quick View Button */}
                        <button
                          onClick={() => {
                            setQuickViewProduct(p);
                            setQuickViewQty(1);
                          }}
                          className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/80 hover:bg-[#c59b27] text-white hover:text-black text-xs font-semibold px-3 py-1.5 rounded backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center space-x-1.5 shadow-lg"
                        >
                          <Eye size={14} />
                          <span>Quick View</span>
                        </button>
                      </div>

                      {/* Product Content */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[11px] text-[#c59b27] font-mono">
                            <span>{p.collection}</span>
                            <span className="text-stone-400">{p.origin}</span>
                          </div>

                          <Link
                            href={`/products/${p.id}`}
                            className="block font-serif-luxury text-base font-medium text-stone-100 hover:text-[#c59b27] transition-colors line-clamp-1"
                          >
                            {p.name}
                          </Link>

                          <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed font-light">
                            {p.description}
                          </p>
                        </div>

                        {/* Dual Price & Add to Cart */}
                        <div className="pt-3 border-t border-emerald-900/30 space-y-2">
                          <div className="flex flex-col text-xs font-mono">
                            <div className="flex justify-between items-center text-[#c59b27] font-bold">
                              <span>개별가:</span>
                              <span>₩{(p.price || 18000).toLocaleString()}원 / 개</span>
                            </div>
                            <div className="flex justify-between items-center text-amber-400 font-bold">
                              <span>📦 대용량({p.carton_qty || 10}개):</span>
                              <span>₩{Math.round((p.price || 18000) * (p.carton_qty || 10) * (1 - (p.wholesale_discount_rate || 0.15))).toLocaleString()}원</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center space-x-1 text-[11px] text-amber-400">
                              <Star size={11} fill="currentColor" />
                              <span className="font-mono">{p.rating || 4.9}</span>
                              <span className="text-stone-500">({p.reviews_count || 12})</span>
                            </div>

                            <Link
                              href={`/products/${p.id}`}
                              className="bg-[#14532D] hover:bg-emerald-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg flex items-center space-x-1 shadow transition-all"
                            >
                              <ShoppingBag size={13} />
                              <span>구매 옵션</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* List View */
              <div className="space-y-4">
                {filteredProducts.map((p) => {
                  const inWish = isInWishlist(p.id);
                  return (
                    <div
                      key={p.id}
                      className="bg-[#111713] border border-emerald-900/30 rounded p-4 flex flex-col sm:flex-row gap-5 items-center hover:border-[#c59b27]/50 transition-all"
                    >
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="w-full sm:w-44 h-32 object-cover rounded border border-emerald-900/40"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-2 text-xs text-[#c59b27]">
                          <span>{p.collection}</span>
                          <span>•</span>
                          <span className="text-stone-400">{p.origin}</span>
                        </div>
                        <Link
                          href={`/products/${p.id}`}
                          className="font-serif-luxury text-lg font-medium text-white hover:text-[#c59b27] transition-colors"
                        >
                          {p.name}
                        </Link>
                        <p className="text-xs text-stone-400 line-clamp-2">{p.description}</p>
                      </div>
                      <div className="flex flex-col items-end space-y-3 sm:w-44 border-t sm:border-t-0 sm:border-l border-emerald-900/30 pt-3 sm:pt-0 sm:pl-5">
                        <div className="text-right">
                          <span className="font-mono text-lg font-bold text-[#c59b27]">
                            ₩{(p.price || 18000).toLocaleString()}원
                          </span>
                          {p.original_price && (
                            <div className="font-mono text-xs text-stone-500 line-through">
                              ₩{p.original_price.toLocaleString()}원
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => toggleWishlist(p)}
                            className={`p-2 rounded border border-emerald-900/40 ${
                              inWish ? 'text-red-500' : 'text-stone-400 hover:text-white'
                            }`}
                          >
                            <Heart size={16} fill={inWish ? 'currentColor' : 'none'} />
                          </button>
                          <button
                            onClick={(e) => handleAddToCart(p, 1, e)}
                            className="bg-[#c59b27] hover:bg-[#b08820] text-black font-semibold text-xs px-3 py-2 rounded flex items-center space-x-1.5"
                          >
                            <ShoppingBag size={14} />
                            <span>Add to Cart</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setQuickViewProduct(null)}
          />
          <div className="relative w-full max-w-3xl bg-[#121613] border border-emerald-900/50 rounded-lg shadow-2xl p-6 z-10 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setQuickViewProduct(null)}
              className="absolute top-4 right-4 text-stone-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <img
                src={quickViewProduct.image_url}
                alt={quickViewProduct.name}
                className="w-full h-72 object-cover rounded border border-emerald-900/40"
              />

              <div className="space-y-4 flex flex-col justify-between">
                <div>
                  <div className="text-xs text-[#c59b27] font-mono">{quickViewProduct.collection}</div>
                  <h3 className="font-serif-luxury text-xl text-white font-medium mt-1">
                    {quickViewProduct.name}
                  </h3>
                  <div className="flex items-center space-x-2 text-xs text-amber-400 mt-1">
                    <Star size={13} fill="currentColor" />
                    <span className="font-mono">{quickViewProduct.rating || 4.9}</span>
                    <span className="text-stone-500">({quickViewProduct.reviews_count || 12} reviews)</span>
                  </div>

                  <div className="text-xl font-mono font-bold text-[#c59b27] mt-3">
                    ${(quickViewProduct.price || 50).toFixed(2)}
                  </div>

                  <p className="text-xs text-stone-300 mt-3 leading-relaxed">
                    {quickViewProduct.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-emerald-900/30 text-xs space-y-1 text-stone-400 font-mono">
                    <div>Origin: <span className="text-stone-200">{quickViewProduct.origin}</span></div>
                    <div>Format: <span className="text-stone-200">{quickViewProduct.format}</span></div>
                    <div>SKU: <span className="text-stone-200">{quickViewProduct.sku || 'N/A'}</span></div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-4 border-t border-emerald-900/30">
                  <div className="flex items-center border border-emerald-800/40 rounded bg-stone-900">
                    <button
                      onClick={() => setQuickViewQty(Math.max(1, quickViewQty - 1))}
                      className="px-3 py-1.5 text-stone-400 hover:text-white"
                    >
                      -
                    </button>
                    <span className="px-3 text-xs font-mono font-medium text-stone-200">{quickViewQty}</span>
                    <button
                      onClick={() => setQuickViewQty(quickViewQty + 1)}
                      className="px-3 py-1.5 text-stone-400 hover:text-white"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      addToCart(quickViewProduct, quickViewQty);
                      setQuickViewProduct(null);
                    }}
                    className="flex-1 bg-[#c59b27] hover:bg-[#b08820] text-black font-semibold py-2.5 px-4 rounded text-xs uppercase tracking-wider flex items-center justify-center space-x-2"
                  >
                    <ShoppingBag size={15} />
                    <span>Add to Cart</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
