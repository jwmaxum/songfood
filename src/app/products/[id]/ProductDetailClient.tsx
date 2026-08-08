'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProductItem } from '@/lib/types';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import {
  Star,
  ShoppingBag,
  Heart,
  Truck,
  ShieldCheck,
  RotateCcw,
  ChevronRight,
  Plus,
  Minus,
  Check,
  Award,
} from 'lucide-react';

interface ProductDetailClientProps {
  product: ProductItem;
  relatedProducts: ProductItem[];
}

export default function ProductDetailClient({ product, relatedProducts }: ProductDetailClientProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'specs' | 'reviews'>('desc');
  const [addedToast, setAddedToast] = useState(false);

  const inWish = isInWishlist(product.id);

  const [purchaseType, setPurchaseType] = useState<'retail' | 'wholesale'>('retail');

  const retailUnitPrice = product.price || 18000;
  const cartonQty = product.carton_qty || 10;
  const discountRate = product.wholesale_discount_rate || 0.15;
  
  const retailBoxPrice = retailUnitPrice * cartonQty;
  const wholesaleBoxPrice = Math.round(retailBoxPrice * (1 - discountRate));

  const handleAddToCart = () => {
    addToCart(
      product,
      quantity,
      purchaseType === 'wholesale' ? `[도매 15%할인] ${cartonQty}개입 Master Box` : product.format,
      product.finish,
      purchaseType
    );
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 3000);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity);
    router.push('/checkout');
  };

  return (
    <div className="min-h-screen bg-[#141815] text-stone-100 pb-20">
      {/* Toast Alert */}
      {addedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#c59b27] text-black font-semibold px-4 py-3 rounded shadow-2xl flex items-center space-x-2 animate-in slide-in-from-bottom duration-300">
          <Check size={18} />
          <span className="text-xs font-mono">Added {quantity} x "{product.name}" to cart!</span>
        </div>
      )}

      {/* Breadcrumb Header */}
      <div className="bg-[#0d110e] border-b border-emerald-900/30 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center space-x-2 text-xs text-stone-400 font-mono">
          <Link href="/" className="hover:text-stone-200">Home</Link>
          <ChevronRight size={12} />
          <Link href="/shop" className="hover:text-stone-200">Shop</Link>
          <ChevronRight size={12} />
          <span className="text-[#c59b27] line-clamp-1">{product.name}</span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-16">
        
        {/* Main Product Showcase Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Image Gallery */}
          <div className="lg:col-span-6 space-y-4">
            <div className="relative aspect-4/3 rounded-lg overflow-hidden border border-emerald-900/40 bg-stone-950 shadow-2xl">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 flex flex-col gap-1.5">
                {product.is_featured && (
                  <span className="bg-[#c59b27] text-black font-semibold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded shadow">
                    Master Reserve
                  </span>
                )}
                {product.origin && (
                  <span className="bg-stone-900/90 text-stone-200 text-[10px] font-mono px-2.5 py-0.5 rounded border border-stone-700">
                    📍 {product.origin}
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnail Mock list */}
            <div className="grid grid-cols-4 gap-3">
              {[product.image_url, product.image_url, product.image_url, product.image_url].map((img, idx) => (
                <div
                  key={idx}
                  className={`aspect-square rounded overflow-hidden border cursor-pointer ${
                    idx === 0 ? 'border-[#c59b27]' : 'border-emerald-900/30 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* Right Specifications & Order Box */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-2">
              <div className="text-xs uppercase font-mono tracking-widest text-[#c59b27]">
                {product.collection}
              </div>
              <h1 className="font-serif-luxury text-3xl sm:text-4xl font-light text-white leading-tight">
                {product.name}
              </h1>

              {/* Rating & Stock Status */}
              <div className="flex items-center space-x-4 pt-1 text-xs">
                <div className="flex items-center space-x-1 text-amber-400">
                  <Star size={14} fill="currentColor" />
                  <span className="font-mono font-semibold">{product.rating || 4.9}</span>
                  <span className="text-stone-400">({product.reviews_count || 24} customer reviews)</span>
                </div>
                <span className="text-stone-600">•</span>
                <span className="text-emerald-400 font-mono flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>In Stock ({product.stock || 42} units available)</span>
                </span>
              </div>
            </div>

            {/* Individual vs Bulk Box Purchase Option Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 font-mono text-xs">
              {/* Option A: Individual Item */}
              <div
                onClick={() => setPurchaseType('retail')}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  purchaseType === 'retail'
                    ? 'bg-[#14532D]/30 border-emerald-500 shadow-lg ring-1 ring-emerald-500/50'
                    : 'bg-[#101411] border-emerald-900/30 hover:border-emerald-700'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-white text-xs">🛒 개별상품 구매 (소량)</span>
                  <span className="text-[10px] bg-stone-800 text-stone-300 px-2 py-0.5 rounded font-bold">1개 단위</span>
                </div>
                <div className="font-mono text-lg font-bold text-[#c59b27]">
                  ₩{retailUnitPrice.toLocaleString()}원 <span className="text-xs text-stone-400 font-normal">/ 개</span>
                </div>
                <div className="text-[10px] text-stone-400 mt-1">
                  ℹ 5만원 미만 결제 시 배송비 3,000원 (5만원 이상 무료배송)
                </div>
              </div>

              {/* Option B: Bulk Master Box */}
              <div
                onClick={() => setPurchaseType('wholesale')}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  purchaseType === 'wholesale'
                    ? 'bg-amber-950/40 border-amber-500 shadow-lg ring-1 ring-amber-500/50'
                    : 'bg-[#101411] border-emerald-900/30 hover:border-emerald-700'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-amber-300 text-xs">📦 대용량 박스 구매 (대량할인)</span>
                  <span className="text-[10px] bg-amber-900 text-amber-200 px-2 py-0.5 rounded font-bold">
                    10개입 Box 대량할인
                  </span>
                </div>
                <div className="font-mono text-lg font-bold text-amber-400">
                  ₩{wholesaleBoxPrice.toLocaleString()}원 <span className="text-xs text-stone-400 font-normal">/ Box ({cartonQty}개입)</span>
                </div>
                <div className="text-[10px] text-stone-400 mt-1">
                  정가 ₩{retailBoxPrice.toLocaleString()}원 ➔ <strong className="text-emerald-400">₩{wholesaleBoxPrice.toLocaleString()}원</strong> (대량 특가)
                </div>
              </div>
            </div>

            {/* Price Box - Dual Price Simultaneous Display */}
            <div className="bg-[#101411] border border-emerald-900/40 p-4 rounded-xl space-y-2">
              <div className="text-[11px] text-stone-400 font-mono font-bold flex items-center justify-between border-b border-emerald-900/30 pb-2">
                <span>개별가 &amp; 대용량 박스가 동시 표기</span>
                <span className="text-emerald-400 font-bold">모든 회원 구매 가능</span>
              </div>

              <div className="flex flex-wrap items-baseline gap-4">
                <div>
                  <span className="text-[10px] text-stone-400 block font-mono">소량 개별가</span>
                  <span className="font-mono text-2xl font-bold text-[#c59b27]">
                    ₩{retailUnitPrice.toLocaleString()}원
                  </span>
                </div>

                <div className="border-l border-emerald-900/40 pl-4">
                  <span className="text-[10px] text-amber-400 block font-mono font-bold">📦 대용량 박스가 ({cartonQty}개입)</span>
                  <span className="font-mono text-2xl font-bold text-amber-400">
                    ₩{wholesaleBoxPrice.toLocaleString()}원
                  </span>
                </div>

                <span className="text-xs text-stone-400 font-mono ml-auto">
                  SKU: {product.sku || 'KFD-PROD-001'}
                </span>
              </div>
            </div>

            <p className="text-sm text-stone-300 font-light leading-relaxed">
              {product.description}
            </p>

            {/* Key Attributes Highlights */}
            <div className="grid grid-cols-2 gap-3 py-2 text-xs">
              <div className="bg-[#18221b] border border-emerald-900/30 p-2.5 rounded flex items-center space-x-2">
                <Award size={16} className="text-[#c59b27]" />
                <div>
                  <div className="text-stone-400 text-[10px]">Format / Packaging</div>
                  <div className="font-semibold text-stone-200">{product.format}</div>
                </div>
              </div>
              <div className="bg-[#18221b] border border-emerald-900/30 p-2.5 rounded flex items-center space-x-2">
                <ShieldCheck size={16} className="text-[#c59b27]" />
                <div>
                  <div className="text-stone-400 text-[10px]">Finish & Processing</div>
                  <div className="font-semibold text-stone-200">{product.finish}</div>
                </div>
              </div>
            </div>

            {/* Quantity Selector & Purchase Buttons */}
            <div className="space-y-4 pt-4 border-t border-emerald-900/30">
              <div className="flex items-center space-x-4">
                <span className="text-xs uppercase font-medium text-stone-400">Quantity:</span>
                <div className="flex items-center border border-emerald-800/40 rounded bg-stone-900">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 text-stone-400 hover:text-white transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="px-4 font-mono text-sm font-semibold text-stone-200">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 text-stone-400 hover:text-white transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <button
                  onClick={() => toggleWishlist(product)}
                  className={`p-2.5 rounded border border-emerald-900/40 transition-colors ${
                    inWish ? 'text-red-500 bg-red-950/40 border-red-800' : 'text-stone-400 hover:text-white'
                  }`}
                  title="Save to Wishlist"
                >
                  <Heart size={18} fill={inWish ? 'currentColor' : 'none'} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={handleAddToCart}
                  className="bg-[#14532D] hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg"
                >
                  <ShoppingBag size={16} />
                  <span>Add to Cart (Domestic)</span>
                </button>

                <Link
                  href={`/rfq?product=${product.id}`}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-extrabold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-xl ring-2 ring-amber-400/40"
                >
                  <Award size={16} />
                  <span>Request a Quote (Global)</span>
                </Link>

                <button
                  onClick={handleBuyNow}
                  className="bg-stone-800 hover:bg-stone-700 text-stone-100 font-semibold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all border border-stone-700 text-center"
                >
                  Buy Now
                </button>
              </div>
            </div>

            {/* Shipping & Security Guarantees */}
            <div className="space-y-2 pt-4 text-xs text-stone-400 border-t border-emerald-900/30 font-light">
              <div className="flex items-center space-x-2">
                <Truck size={14} className="text-[#EAB308]" />
                <span>Cold-Chain Container Logistics to USA, Europe, Japan, Middle East &amp; SEA.</span>
              </div>
              <div className="flex items-center space-x-2">
                <ShieldCheck size={14} className="text-[#EAB308]" />
                <span>HACCP, Halal, Vegan &amp; FSSC 22000 Certified Korean Food Production.</span>
              </div>
              <div className="flex items-center space-x-2">
                <RotateCcw size={14} className="text-[#EAB308]" />
                <span>Official Pro Forma Invoice &amp; HS Code Certificate provided upon RFQ.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Tabs: Domestic Specs vs Export Info */}
        <div className="bg-[#101411] border border-emerald-900/30 rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex border-b border-emerald-900/30 space-x-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('desc')}
              className={`pb-4 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'desc'
                  ? 'border-[#EAB308] text-[#EAB308]'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              Domestic Product Specs (국내 정보)
            </button>

            <button
              onClick={() => setActiveTab('specs')}
              className={`pb-4 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'specs'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-stone-400 hover:text-amber-400'
              }`}
            >
              Export Information (해외 바이어 필수 정보)
            </button>

            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-4 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'reviews'
                  ? 'border-[#EAB308] text-[#EAB308]'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              Reviews ({product.reviews_count || 24})
            </button>
          </div>

          <div className="pt-6">
            {activeTab === 'desc' && (
              <div className="space-y-6 text-xs sm:text-sm text-stone-300 leading-relaxed font-light">
                <p className="text-sm font-medium text-stone-100">{product.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans text-xs pt-4 border-t border-stone-800">
                  <div className="p-3 bg-stone-900/80 rounded-xl border border-stone-800 space-y-1">
                    <span className="text-stone-500 font-bold">브랜드 / 제조사</span>
                    <div className="text-stone-100 font-bold">{product.brand || '송영민푸드'} / {product.manufacturer || '송영민푸드(주)'}</div>
                  </div>
                  <div className="p-3 bg-stone-900/80 rounded-xl border border-stone-800 space-y-1">
                    <span className="text-stone-500 font-bold">원산지 / 내용량</span>
                    <div className="text-stone-100 font-bold">{product.country_of_origin || '대한민국'} / {product.net_weight || product.thickness || '500g'}</div>
                  </div>
                  <div className="p-3 bg-stone-900/80 rounded-xl border border-stone-800 space-y-1">
                    <span className="text-stone-500 font-bold">유통기한 &amp; 보관방법</span>
                    <div className="text-stone-100 font-bold">{product.shelf_life || '12개월'} ({product.storage || '냉동 보관'})</div>
                  </div>
                  <div className="p-3 bg-stone-900/80 rounded-xl border border-stone-800 space-y-1">
                    <span className="text-stone-500 font-bold">원재료 및 알레르기 유발물질</span>
                    <div className="text-stone-100">{product.ingredients || '상세 라벨 참조'} (알레르기: {product.allergens || '해당 없음'})</div>
                  </div>
                </div>

                {/* Certifications Badge row */}
                {product.certifications && (
                  <div className="pt-2">
                    <span className="text-xs font-bold text-stone-400 block mb-2">보유 품질 및 수출 인증:</span>
                    <div className="flex flex-wrap gap-2">
                      {product.certifications.map((c) => (
                        <span key={c} className="px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-bold">
                          ✓ {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'specs' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono">
                  <div className="p-4 bg-stone-900/90 rounded-xl border border-amber-500/30 space-y-1">
                    <span className="text-amber-400 font-bold">Carton Quantity</span>
                    <div className="text-stone-100 text-sm font-bold">{product.carton_qty || 10} units / CTN</div>
                  </div>
                  <div className="p-4 bg-stone-900/90 rounded-xl border border-amber-500/30 space-y-1">
                    <span className="text-amber-400 font-bold">Carton Size &amp; Gross Weight</span>
                    <div className="text-stone-100 text-sm font-bold">{product.carton_size || '480x320x240 mm'} ({product.gross_weight || 11.2} kg)</div>
                  </div>
                  <div className="p-4 bg-stone-900/90 rounded-xl border border-amber-500/30 space-y-1">
                    <span className="text-amber-400 font-bold">CBM per Carton</span>
                    <div className="text-amber-300 text-sm font-bold">{product.cbm || 0.035} m³</div>
                  </div>
                  <div className="p-4 bg-stone-900/90 rounded-xl border border-amber-500/30 space-y-1">
                    <span className="text-amber-400 font-bold">MOQ (Minimum Order Qty)</span>
                    <div className="text-stone-100 text-sm font-bold">{product.moq_cartons || 50} Cartons</div>
                  </div>
                  <div className="p-4 bg-stone-900/90 rounded-xl border border-amber-500/30 space-y-1">
                    <span className="text-amber-400 font-bold">HS Code</span>
                    <div className="text-stone-100 text-sm font-bold">{product.hs_code || '1902.20-1000'}</div>
                  </div>
                  <div className="p-4 bg-stone-900/90 rounded-xl border border-amber-500/30 space-y-1">
                    <span className="text-amber-400 font-bold">Production Lead Time</span>
                    <div className="text-stone-100 text-sm font-bold">{product.production_lead_time || '14 Days'}</div>
                  </div>
                  <div className="p-4 bg-stone-900/90 rounded-xl border border-amber-500/30 space-y-1">
                    <span className="text-amber-400 font-bold">Export Packaging</span>
                    <div className="text-stone-100 text-sm font-bold">{product.export_packaging || 'Reefer Cold Chain CTN'}</div>
                  </div>
                  <div className="p-4 bg-stone-900/90 rounded-xl border border-amber-500/30 space-y-1">
                    <span className="text-amber-400 font-bold">Loading Port</span>
                    <div className="text-stone-100 text-sm font-bold">{product.loading_port || 'Busan Port, Korea'}</div>
                  </div>
                  <div className="p-4 bg-amber-950/80 rounded-xl border border-amber-400 space-y-1">
                    <span className="text-amber-300 font-bold">Export Price (FOB)</span>
                    <div className="text-amber-400 text-base font-extrabold">${product.export_price_usd || 15} USD / CTN</div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Link
                    href={`/rfq?product=${product.id}`}
                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl hover:from-amber-600 hover:to-amber-700 shadow-lg"
                  >
                    Calculate FOB Quote for {product.name_en || product.name} →
                  </Link>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                <div className="flex items-center space-x-4 p-4 bg-stone-900 rounded border border-emerald-900/30">
                  <div className="text-center pr-6 border-r border-stone-800">
                    <div className="font-mono text-3xl font-bold text-[#c59b27]">
                      {product.rating || 4.9}
                    </div>
                    <div className="flex text-amber-400 mt-1 justify-center">
                      <Star size={13} fill="currentColor" />
                      <Star size={13} fill="currentColor" />
                      <Star size={13} fill="currentColor" />
                      <Star size={13} fill="currentColor" />
                      <Star size={13} fill="currentColor" />
                    </div>
                    <div className="text-[10px] text-stone-500 mt-1">out of 5 stars</div>
                  </div>
                  <div className="text-xs text-stone-400 space-y-1">
                    <p className="font-medium text-stone-200">Verified Michelin-Grade Feedback</p>
                    <p>98% of customers recommended this product for its unparalleled flavor complexity and freshness.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="space-y-6 pt-6">
            <h2 className="font-serif-luxury text-2xl text-white font-light">
              You May Also Like
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {relatedProducts.map((rp) => (
                <div key={rp.id} className="bg-[#111713] border border-emerald-900/30 rounded overflow-hidden group">
                  <img
                    src={rp.image_url}
                    alt={rp.name}
                    className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="p-4 space-y-2">
                    <div className="text-[10px] text-[#c59b27] font-mono">{rp.collection}</div>
                    <Link
                      href={`/products/${rp.id}`}
                      className="font-serif-luxury text-sm font-medium text-stone-200 hover:text-[#c59b27] block line-clamp-1"
                    >
                      {rp.name}
                    </Link>
                    <div className="font-mono text-xs font-bold text-[#c59b27]">
                      ${(rp.price || 50).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
