'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Tag,
  Truck,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export default function CartPage() {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    clearCart,
    subtotal,
    couponCode,
    discountAmount,
    shippingFee,
    freeShippingThreshold,
    totalAmount,
    applyCoupon,
    removeCoupon,
  } = useCart();

  const [inputCoupon, setInputCoupon] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ success: boolean; message: string } | null>(null);

  const freeShippingProgress = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const res = applyCoupon(inputCoupon);
    setCouponMsg(res);
    if (res.success) setInputCoupon('');
  };

  return (
    <div className="min-h-screen bg-[#141815] text-stone-100 pb-24">
      {/* Breadcrumb Header */}
      <div className="bg-[#0d110e] border-b border-emerald-900/30 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-2">
          <div className="flex items-center space-x-2 text-xs text-stone-500 font-mono">
            <Link href="/" className="hover:text-stone-300">Home</Link>
            <ChevronRight size={12} />
            <Link href="/shop" className="hover:text-stone-300">Shop</Link>
            <ChevronRight size={12} />
            <span className="text-[#c59b27]">Shopping Cart</span>
          </div>
          <h1 className="font-serif-luxury text-3xl sm:text-4xl font-light text-white">
            Your Cart Summary
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        {cartItems.length === 0 ? (
          <div className="bg-[#101411] border border-emerald-900/30 rounded-lg p-16 text-center space-y-5 max-w-2xl mx-auto">
            <div className="w-20 h-20 rounded-full bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-[#c59b27] mx-auto">
              <ShoppingBag size={36} />
            </div>
            <div className="space-y-2">
              <h2 className="font-serif-luxury text-2xl text-white">Your cart is currently empty</h2>
              <p className="text-xs text-stone-400 max-w-sm mx-auto font-light leading-relaxed">
                Before proceeding to checkout, you must add some artisanal gourmet products to your shopping cart.
              </p>
            </div>
            <Link
              href="/shop"
              className="inline-flex items-center space-x-2 bg-[#c59b27] hover:bg-[#b08820] text-black font-semibold text-xs uppercase tracking-widest px-6 py-3 rounded transition-all shadow-lg"
            >
              <span>Explore Fine Food Catalog</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Left Main Cart Table */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Free Shipping Progress Banner */}
              <div className="bg-[#18221b] border border-emerald-900/40 rounded p-4 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="flex items-center space-x-2 text-stone-300 font-medium">
                    <Truck size={16} className="text-[#c59b27]" />
                    <span>
                      {remainingForFreeShipping > 0
                        ? `₩${remainingForFreeShipping.toLocaleString()}원 더 담으시면 무료배송 적용! (5만원 미만 배송비 3,000원)`
                        : '🎉 5만원 이상 구매로 무료배송(0원) 혜택이 적용되었습니다!'}
                    </span>
                  </span>
                  <span className="font-mono text-xs text-[#c59b27] font-bold">
                    {freeShippingProgress}%
                  </span>
                </div>
                <div className="w-full h-2 bg-stone-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#c59b27] to-[#e6ca65] transition-all duration-500 rounded-full"
                    style={{ width: `${freeShippingProgress}%` }}
                  />
                </div>
              </div>

              {/* Table Container */}
              <div className="bg-[#101411] border border-emerald-900/30 rounded-lg overflow-hidden shadow-xl">
                <div className="hidden sm:grid grid-cols-12 gap-4 p-4 border-b border-emerald-900/30 text-[11px] uppercase tracking-wider font-semibold text-stone-400 bg-[#0c100d]">
                  <div className="col-span-6">상품 정보 (소매 / 도매)</div>
                  <div className="col-span-2 text-center">단가</div>
                  <div className="col-span-2 text-center">수량</div>
                  <div className="col-span-2 text-right">소계</div>
                </div>

                <div className="divide-y divide-emerald-900/20 p-4 sm:p-0">
                  {cartItems.map((item) => {
                    const retailPrice = item.product.price || 18000;
                    const cartonQty = item.product.carton_qty || 10;
                    const discountRate = item.product.wholesale_discount_rate || 0.15;

                    const effectiveUnitPrice =
                      item.unitPrice ??
                      (item.purchaseType === 'wholesale'
                        ? Math.round(retailPrice * cartonQty * (1 - discountRate))
                        : retailPrice);

                    const lineSubtotal = effectiveUnitPrice * item.quantity;

                    return (
                      <div
                        key={item.product.id + (item.purchaseType || 'retail')}
                        className="py-4 sm:p-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center group"
                      >
                        {/* Product details */}
                        <div className="sm:col-span-6 flex items-center space-x-4">
                          <img
                            src={item.product.image_url}
                            alt={item.product.name}
                            className="w-16 h-16 object-cover rounded border border-emerald-900/40 bg-stone-950"
                          />
                          <div className="space-y-1">
                            <Link
                              href={`/products/${item.product.id}`}
                              className="font-serif-luxury text-sm font-medium text-stone-200 hover:text-[#c59b27] transition-colors line-clamp-1"
                            >
                              {item.product.name}
                            </Link>
                            <div className="text-[11px] text-stone-400 space-x-2 flex items-center">
                              {item.purchaseType === 'wholesale' ? (
                                <span className="bg-amber-950 text-amber-300 border border-amber-700/60 px-2 py-0.5 rounded font-mono font-bold text-[10px]">
                                  📦 도매 15% 할인 ({cartonQty}개입 Box)
                                </span>
                              ) : (
                                <span className="bg-stone-800 text-stone-300 px-2 py-0.5 rounded font-mono text-[10px]">
                                  🛒 소매 낱개
                                </span>
                              )}
                              <span>•</span>
                              <span className="text-stone-500">{item.product.origin}</span>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.product.id)}
                              className="text-[11px] text-stone-500 hover:text-red-400 flex items-center space-x-1 pt-1 transition-colors"
                            >
                              <Trash2 size={12} />
                              <span>삭제</span>
                            </button>
                          </div>
                        </div>

                        {/* Unit Price */}
                        <div className="sm:col-span-2 text-left sm:text-center text-xs font-mono font-medium text-stone-300">
                          <span className="sm:hidden text-stone-500 mr-2">가격:</span>
                          ₩{effectiveUnitPrice.toLocaleString()}원
                        </div>

                        {/* Quantity Controls */}
                        <div className="sm:col-span-2 flex justify-start sm:justify-center items-center">
                          <div className="flex items-center border border-emerald-800/40 rounded bg-stone-900">
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="p-1.5 text-stone-400 hover:text-white"
                            >
                              <Minus size={13} />
                            </button>
                            <span className="px-3 text-xs font-mono font-medium text-stone-200">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="p-1.5 text-stone-400 hover:text-white"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Line Item Total */}
                        <div className="sm:col-span-2 text-left sm:text-right font-mono text-sm font-semibold text-[#c59b27]">
                          <span className="sm:hidden text-stone-500 text-xs mr-2">소계:</span>
                          ₩{lineSubtotal.toLocaleString()}원
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Table Footer Controls */}
                <div className="p-4 bg-[#0c100d] border-t border-emerald-900/30 flex justify-between items-center">
                  <button
                    onClick={clearCart}
                    className="text-xs text-stone-400 hover:text-red-400 transition-colors underline font-mono"
                  >
                    장바구니 비우기
                  </button>
                  <Link
                    href="/shop"
                    className="text-xs text-[#c59b27] hover:underline font-mono"
                  >
                    ← 쇼핑 계속하기
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Summary Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Cart Totals Box */}
              <div className="bg-[#101411] border border-emerald-900/30 rounded-lg p-6 space-y-6 shadow-xl sticky top-28">
                <h3 className="font-serif-luxury text-lg text-white font-medium border-b border-emerald-900/30 pb-3">
                  주문 금액 합계 (Cart Totals)
                </h3>

                {/* Coupon Input */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-stone-400 uppercase tracking-wider">할인 쿠폰 코드</label>
                  <form onSubmit={handleApplyCoupon} className="flex space-x-2">
                    <div className="relative flex-1">
                      <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                      <input
                        type="text"
                        placeholder="WELCOME10 또는 KFOOD15"
                        value={inputCoupon}
                        onChange={(e) => setInputCoupon(e.target.value)}
                        className="w-full bg-stone-900 border border-emerald-900/40 rounded pl-8 pr-3 py-2 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-[#c59b27]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs px-3 py-2 rounded transition-colors font-medium border border-stone-700"
                    >
                      적용
                    </button>
                  </form>

                  {couponMsg && (
                    <div
                      className={`text-[11px] p-2 rounded ${
                        couponMsg.success
                          ? 'bg-emerald-950/80 border border-emerald-700/50 text-emerald-400'
                          : 'bg-red-950/80 border border-red-800/50 text-red-400'
                      }`}
                    >
                      {couponMsg.message}
                    </div>
                  )}

                  {couponCode && (
                    <div className="flex justify-between items-center text-xs bg-[#18221b] p-2.5 rounded border border-emerald-800/40">
                      <span className="text-emerald-400 font-medium flex items-center space-x-1.5">
                        <Sparkles size={13} />
                        <span>적용된 쿠폰: {couponCode}</span>
                      </span>
                      <button
                        onClick={removeCoupon}
                        className="text-stone-400 hover:text-red-400 text-[11px] underline"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>

                {/* Subtotals & Taxes */}
                <div className="space-y-3 text-xs text-stone-300 border-t border-emerald-900/30 pt-4">
                  <div className="flex justify-between">
                    <span className="text-stone-400">상품 주문 소계</span>
                    <span className="font-mono font-medium">₩{subtotal.toLocaleString()}원</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>쿠폰 할인 금액</span>
                      <span className="font-mono">-₩{discountAmount.toLocaleString()}원</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-stone-400">신선 냉동 배송비</span>
                    <span className="font-mono">
                      {shippingFee === 0 ? (
                        <span className="text-emerald-400 uppercase font-semibold text-[11px]">무료 배송</span>
                      ) : (
                        `₩${shippingFee.toLocaleString()}원`
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-lg font-bold text-white pt-3 border-t border-emerald-900/30">
                    <span>최종 결제 금액</span>
                    <span className="font-mono text-[#c59b27]">₩{totalAmount.toLocaleString()}원</span>
                  </div>
                </div>

                {/* Checkout Buttons */}
                <div className="space-y-3">
                  <Link
                    href="/checkout"
                    className="w-full bg-[#14532D] hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center space-x-2"
                  >
                    <span>국내 B2C/도매 주문 결제하기</span>
                    <ArrowRight size={15} />
                  </Link>

                  <Link
                    href="/rfq"
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-extrabold py-3.5 px-4 rounded-xl text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center space-x-2 ring-2 ring-amber-400/40"
                  >
                    <span>🌎 장바구니 상품 15% 할인 견적서(RFQ) 변환</span>
                  </Link>
                </div>

                <div className="flex items-center justify-center space-x-2 text-[11px] text-stone-400 pt-1">
                  <ShieldCheck size={14} className="text-[#EAB308]" />
                  <span>256-bit SSL 암호화 결제 및 공식 Pro Forma Invoice 발급</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
