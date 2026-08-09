'use client';

import React, { useState, useMemo } from 'react';
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

  // Gallery image setup up to 6 images
  const galleryImages = useMemo(() => {
    if (product.images && product.images.length > 0) {
      return product.images.filter((img) => img && img.trim().length > 0).slice(0, 6);
    }
    return [product.image_url];
  }, [product]);

  const [selectedImage, setSelectedImage] = useState<string>(galleryImages[0] || product.image_url);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'specs' | 'reviews'>('desc');
  const [addedToast, setAddedToast] = useState(false);

  const inWish = isInWishlist(product.id);

  // 3-Tier Purchase selection state: 'ea' | 'box' | 'carton'
  const [selectedTier, setSelectedTier] = useState<'ea' | 'box' | 'carton'>('ea');

  // Prices calculation
  const eaPrice = product.price || 18000;
  const boxQty = product.box_qty || 20;
  const boxPrice = product.box_price || Math.round(eaPrice * boxQty * 0.9);
  const cartonBoxQty = product.carton_box_qty || 5;
  const cartonTotalQty = cartonBoxQty * boxQty;
  const cartonPrice = product.carton_price || Math.round(eaPrice * cartonTotalQty * 0.8);

  const getSelectedPrice = () => {
    if (selectedTier === 'box') return boxPrice;
    if (selectedTier === 'carton') return cartonPrice;
    return eaPrice;
  };

  const getSelectedLabel = () => {
    if (selectedTier === 'box') return `1박스 (${boxQty}개입)`;
    if (selectedTier === 'carton') return `1카톤 (${cartonTotalQty}개입 / ${cartonBoxQty}박스)`;
    return `1개 (EA)`;
  };

  const handleAddToCart = () => {
    addToCart(
      product,
      quantity,
      getSelectedLabel(),
      product.finish,
      selectedTier,
      getSelectedPrice(),
      getSelectedLabel()
    );
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 3000);
  };

  const handleBuyNow = () => {
    addToCart(
      product,
      quantity,
      getSelectedLabel(),
      product.finish,
      selectedTier,
      getSelectedPrice(),
      getSelectedLabel()
    );
    router.push('/checkout');
  };

  return (
    <div className="min-h-screen bg-[#141815] text-stone-100 pb-20">
      {/* Toast Alert */}
      {addedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#c59b27] text-[#0d110e] font-semibold px-4 py-3 rounded shadow-2xl flex items-center space-x-2 animate-in slide-in-from-bottom duration-300">
          <Check size={18} />
          <span className="text-xs font-mono">
            장바구니 추가 완료: {quantity} × [{getSelectedLabel()}] "{product.name}"
          </span>
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
          
          {/* Left 6-Image Gallery */}
          <div className="lg:col-span-6 space-y-4">
            <div className="relative aspect-4/3 rounded-lg overflow-hidden border border-emerald-900/40 bg-stone-950 shadow-2xl group">
              <img
                src={selectedImage || product.image_url}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute top-4 left-4 flex flex-col gap-1.5">
                {product.is_featured && (
                  <span className="bg-[#c59b27] text-black font-semibold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded shadow">
                    Featured
                  </span>
                )}
                {product.origin && (
                  <span className="bg-stone-900/90 text-stone-200 text-[10px] font-mono px-2.5 py-0.5 rounded border border-stone-700">
                    📍 {product.origin}
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnail grid up to 6 images */}
            <div className="grid grid-cols-6 gap-2">
              {galleryImages.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`aspect-square rounded overflow-hidden border cursor-pointer transition-all ${
                    selectedImage === img
                      ? 'border-[#c59b27] ring-2 ring-[#c59b27]/50 scale-105'
                      : 'border-emerald-900/40 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* Right Specifications & Order Box */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-2">
              <div className="text-xs uppercase font-mono tracking-widest text-[#c59b27] flex items-center space-x-2">
                <span>{product.collection}</span>
                {product.category && <span className="text-stone-500">• {product.category}</span>}
              </div>
              <h1 className="font-serif-luxury text-3xl sm:text-4xl font-light text-white leading-tight">
                {product.name}
              </h1>

              {/* Certifications Badges */}
              {product.certifications && product.certifications.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {product.certifications.map((cert) => (
                    <span
                      key={cert}
                      className="bg-emerald-950 text-emerald-300 border border-emerald-700/50 text-[10px] font-mono font-bold px-2 py-0.5 rounded"
                    >
                      ✓ {cert}
                    </span>
                  ))}
                </div>
              )}

              {/* Rating & Stock Status */}
              <div className="flex items-center space-x-4 pt-1 text-xs">
                <div className="flex items-center space-x-1 text-amber-400">
                  <Star size={14} fill="currentColor" />
                  <span className="font-mono font-semibold">{product.rating || 4.9}</span>
                  <span className="text-stone-400">({product.reviews_count || 24} reviews)</span>
                </div>
                <span className="text-stone-600">•</span>
                <span className="text-emerald-400 font-mono flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>재고 있음 ({product.stock || 150}개 잔여)</span>
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed font-light">
              {product.description}
            </p>

            {/* 3-Tier Price & Quantity Selection Table */}
            <div className="p-4 bg-[#101411] border border-emerald-900/40 rounded-xl space-y-3 shadow-lg">
              <div className="text-xs font-mono font-bold text-[#c59b27] flex items-center justify-between">
                <span>📦 구매포장 단위별 가격 선택</span>
                <span className="text-[10px] text-stone-400">클릭하여 선택 후 장바구니/결제</span>
              </div>

              {/* 3-Tier Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className="border-b border-emerald-900/40 text-stone-400 bg-stone-900/50">
                      <th className="py-2 px-3 font-semibold">구분</th>
                      <th
                        onClick={() => setSelectedTier('ea')}
                        className={`py-2 px-3 cursor-pointer text-center transition-colors ${
                          selectedTier === 'ea' ? 'bg-[#c59b27]/20 text-[#c59b27] font-bold border-t-2 border-[#c59b27]' : 'hover:bg-stone-800'
                        }`}
                      >
                        낱개 (EA) 구매
                      </th>
                      <th
                        onClick={() => setSelectedTier('box')}
                        className={`py-2 px-3 cursor-pointer text-center transition-colors ${
                          selectedTier === 'box' ? 'bg-[#c59b27]/20 text-[#c59b27] font-bold border-t-2 border-[#c59b27]' : 'hover:bg-stone-800'
                        }`}
                      >
                        박스 (Box) 구매
                      </th>
                      <th
                        onClick={() => setSelectedTier('carton')}
                        className={`py-2 px-3 cursor-pointer text-center transition-colors ${
                          selectedTier === 'carton' ? 'bg-[#c59b27]/20 text-[#c59b27] font-bold border-t-2 border-[#c59b27]' : 'hover:bg-stone-800'
                        }`}
                      >
                        카톤 (Carton) 구매
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-900/20 text-stone-200">
                    <tr>
                      <td className="py-2.5 px-3 text-stone-400 font-semibold bg-stone-900/30">구매포장 단위</td>
                      <td
                        onClick={() => setSelectedTier('ea')}
                        className={`py-2.5 px-3 text-center cursor-pointer ${selectedTier === 'ea' ? 'text-[#c59b27] font-bold bg-[#c59b27]/10' : ''}`}
                      >
                        1개 (EA)
                      </td>
                      <td
                        onClick={() => setSelectedTier('box')}
                        className={`py-2.5 px-3 text-center cursor-pointer ${selectedTier === 'box' ? 'text-[#c59b27] font-bold bg-[#c59b27]/10' : ''}`}
                      >
                        1박스 ({boxQty}개입)
                      </td>
                      <td
                        onClick={() => setSelectedTier('carton')}
                        className={`py-2.5 px-3 text-center cursor-pointer ${selectedTier === 'carton' ? 'text-[#c59b27] font-bold bg-[#c59b27]/10' : ''}`}
                      >
                        1카톤 ({cartonTotalQty}개입 / {cartonBoxQty}박스)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-stone-400 font-semibold bg-stone-900/30">판매 가격</td>
                      <td
                        onClick={() => setSelectedTier('ea')}
                        className={`py-2.5 px-3 text-center cursor-pointer font-bold ${selectedTier === 'ea' ? 'text-[#c59b27] text-sm bg-[#c59b27]/10' : 'text-stone-300'}`}
                      >
                        ₩{eaPrice.toLocaleString()}원
                      </td>
                      <td
                        onClick={() => setSelectedTier('box')}
                        className={`py-2.5 px-3 text-center cursor-pointer font-bold ${selectedTier === 'box' ? 'text-[#c59b27] text-sm bg-[#c59b27]/10' : 'text-amber-400'}`}
                      >
                        ₩{boxPrice.toLocaleString()}원
                      </td>
                      <td
                        onClick={() => setSelectedTier('carton')}
                        className={`py-2.5 px-3 text-center cursor-pointer font-bold ${selectedTier === 'carton' ? 'text-[#c59b27] text-sm bg-[#c59b27]/10' : 'text-emerald-400'}`}
                      >
                        ₩{cartonPrice.toLocaleString()}원
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-stone-400 font-semibold bg-stone-900/30">선택</td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedTier('ea')}
                          className={`w-full py-1.5 rounded text-xs font-bold border transition-all ${
                            selectedTier === 'ea'
                              ? 'bg-[#c59b27] text-black border-[#c59b27] shadow'
                              : 'bg-stone-900 text-stone-400 border-stone-700 hover:text-white'
                          }`}
                        >
                          {selectedTier === 'ea' ? '✓ 낱개 선택됨' : '낱개 선택'}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedTier('box')}
                          className={`w-full py-1.5 rounded text-xs font-bold border transition-all ${
                            selectedTier === 'box'
                              ? 'bg-amber-400 text-black border-amber-400 shadow'
                              : 'bg-stone-900 text-stone-400 border-stone-700 hover:text-white'
                          }`}
                        >
                          {selectedTier === 'box' ? '✓ 박스 선택됨' : '박스 선택'}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedTier('carton')}
                          className={`w-full py-1.5 rounded text-xs font-bold border transition-all ${
                            selectedTier === 'carton'
                              ? 'bg-emerald-400 text-black border-emerald-400 shadow'
                              : 'bg-stone-900 text-stone-400 border-stone-700 hover:text-white'
                          }`}
                        >
                          {selectedTier === 'carton' ? '✓ 카톤 선택됨' : '카톤 선택'}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="pt-2 text-right font-mono text-xs text-stone-300">
                선택 단위: <strong className="text-[#c59b27]">{getSelectedLabel()}</strong> × {quantity}개 ={' '}
                <span className="text-lg font-bold text-white font-mono">
                  ₩{(getSelectedPrice() * quantity).toLocaleString()}원
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
