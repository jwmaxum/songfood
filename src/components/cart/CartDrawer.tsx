'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag, Truck } from 'lucide-react';

export default function CartDrawer() {
  const { t } = useLanguage();
  const {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
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

  if (!isCartOpen) return null;

  const freeShippingProgress = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const res = applyCoupon(inputCoupon);
    setCouponMsg(res);
    if (res.success) setInputCoupon('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
        onClick={() => setIsCartOpen(false)}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-[#121613] border-l border-emerald-900/30 text-stone-100 h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
        
        {/* Top Header */}
        <div className="p-5 border-b border-emerald-900/30 flex items-center justify-between bg-[#0b0e0c]">
          <div className="flex items-center space-x-2.5">
            <ShoppingBag className="w-5 h-5 text-[#c59b27]" />
            <h2 className="font-serif-luxury text-lg tracking-wide text-white">{t('cart_drawer_title', '장바구니')}</h2>
            <span className="bg-[#c59b27]/20 border border-[#c59b27]/40 text-[#c59b27] text-xs font-semibold px-2 py-0.5 rounded-full">
              {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
            </span>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-1.5 rounded-md text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            aria-label="Close Cart"
          >
            <X size={20} />
          </button>
        </div>

        {/* Free Shipping Progress Bar */}
        <div className="bg-[#18221b] border-b border-emerald-900/30 px-5 py-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="flex items-center space-x-1.5 text-stone-300">
              <Truck size={14} className="text-[#c59b27]" />
              <span>
                {remainingForFreeShipping > 0
                  ? t('free_shipping_remaining', '₩{amount}원 더 담으시면 무료배송 적용!').replace('{amount}', remainingForFreeShipping.toLocaleString())
                  : t('free_shipping_unlocked', '🎉 5만원 이상 구매로 무료배송(0원) 혜택이 적용되었습니다!')}
              </span>
            </span>
            <span className="font-mono text-[11px] text-[#c59b27] font-semibold">
              {freeShippingProgress}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#c59b27] to-[#e6ca65] transition-all duration-500 rounded-full"
              style={{ width: `${freeShippingProgress}%` }}
            />
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 divide-y divide-emerald-900/20">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
              <div className="w-16 h-16 rounded-full bg-emerald-950/50 border border-emerald-800/40 flex items-center justify-center text-[#c59b27]">
                <ShoppingBag size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif-luxury text-lg text-white">{t('cart_empty_title', '장바구니가 비어 있습니다.')}</h3>
                <p className="text-xs text-stone-400 max-w-[240px]">
                  {t('cart_empty_desc', '결제를 진행하려면 먼저 프리미엄 K-Food 상품을 장바구니에 담아주세요.')}
                </p>
              </div>
              <Link
                href="/shop"
                onClick={() => setIsCartOpen(false)}
                className="mt-2 inline-flex items-center space-x-2 bg-[#c59b27] hover:bg-[#b08820] text-black font-semibold text-xs tracking-wider uppercase px-5 py-2.5 rounded transition-all"
              >
                <span>{t('btn_explore_catalog', 'K-Food 상품 둘러보기')}</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.product.id} className="pt-4 first:pt-0 flex space-x-4 group">
                <img
                  src={item.product.image_url}
                  alt={item.product.name}
                  className="w-20 h-20 object-cover rounded border border-emerald-900/40 bg-stone-900 flex-shrink-0"
                />
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <Link
                        href={`/products/${item.product.id}`}
                        onClick={() => setIsCartOpen(false)}
                        className="font-serif-luxury text-sm font-medium text-stone-200 hover:text-[#c59b27] line-clamp-1 transition-colors"
                      >
                        {item.product.name}
                      </Link>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-stone-500 hover:text-red-400 transition-colors p-1"
                        title={t('remove', '삭제')}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="text-[11px] text-stone-400 mt-0.5 space-x-2">
                      <span>{item.selectedFormat || item.product.format}</span>
                      <span>•</span>
                      <span className="text-stone-500">{item.product.origin}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-3">
                    {/* Quantity Controls */}
                    <div className="flex items-center border border-emerald-800/40 rounded bg-stone-900/80">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="p-1 text-stone-400 hover:text-white transition-colors"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="px-2.5 text-xs font-mono font-medium text-stone-200">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="p-1 text-stone-400 hover:text-white transition-colors"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <span className="text-xs font-semibold text-[#c59b27] font-mono">
                        ₩{((item.product.price || 18000) * item.quantity).toLocaleString()}원
                      </span>
                      {item.quantity > 1 && (
                        <div className="text-[10px] text-stone-500">
                          ₩{(item.product.price || 18000).toLocaleString()}원 / {t('quantity_unit', '개')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer & Order Summary */}
        {cartItems.length > 0 && (
          <div className="p-5 border-t border-emerald-900/30 bg-[#0b0e0c] space-y-3">
            {/* Coupon Code Input */}
            <form onSubmit={handleApplyCoupon} className="flex space-x-2">
              <div className="relative flex-1">
                <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                <input
                  type="text"
                  placeholder={t('coupon_placeholder', '쿠폰 코드 입력 (예: KFOOD10)')}
                  value={inputCoupon}
                  onChange={(e) => setInputCoupon(e.target.value)}
                  className="w-full bg-stone-900/90 border border-emerald-900/40 rounded pl-8 pr-3 py-1.5 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-[#c59b27]"
                />
              </div>
              <button
                type="submit"
                className="bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs px-3 py-1.5 rounded transition-colors font-medium border border-stone-700"
              >
                {t('btn_apply_coupon', '쿠폰 적용')}
              </button>
            </form>

            {couponMsg && (
              <div
                className={`text-[11px] px-2.5 py-1 rounded ${
                  couponMsg.success
                    ? 'bg-emerald-950/80 border border-emerald-700/50 text-emerald-400'
                    : 'bg-red-950/80 border border-red-800/50 text-red-400'
                }`}
              >
                {couponMsg.message}
              </div>
            )}

            {couponCode && (
              <div className="flex justify-between items-center text-xs bg-[#18221b] px-3 py-1.5 rounded border border-emerald-800/40">
                <span className="text-emerald-400 font-medium flex items-center space-x-1">
                  <Tag size={12} />
                  <span>Code '{couponCode}'</span>
                </span>
                <button
                  onClick={removeCoupon}
                  className="text-stone-400 hover:text-red-400 text-[11px] underline"
                >
                  {t('remove', '삭제')}
                </button>
              </div>
            )}

            {/* Calculations */}
            <div className="space-y-1.5 text-xs text-stone-300 pt-1">
              <div className="flex justify-between">
                <span className="text-stone-400">{t('subtotal_label', '상품 소계')}</span>
                <span className="font-mono">₩{subtotal.toLocaleString()}원</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>{t('discount_label', '할인 금액')}</span>
                  <span className="font-mono">-₩{discountAmount.toLocaleString()}원</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-stone-400">{t('shipping_fee_label', '신선 배송비')}</span>
                <span className="font-mono">
                  {shippingFee === 0 ? (
                    <span className="text-emerald-400 uppercase font-semibold text-[11px]">{t('free_shipping', '무료배송')}</span>
                  ) : (
                    `₩${shippingFee.toLocaleString()}원`
                  )}
                </span>
              </div>

              <div className="flex justify-between items-center text-base font-semibold text-white pt-2 border-t border-emerald-900/30">
                <span>{t('total_amount_label', '총 결제금액')}</span>
                <span className="font-mono text-[#c59b27]">₩{totalAmount.toLocaleString()}원</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Link
                href="/cart"
                onClick={() => setIsCartOpen(false)}
                className="w-full text-center py-2.5 px-3 rounded border border-emerald-800/50 text-xs font-semibold tracking-wider text-stone-200 hover:bg-stone-800 transition-colors uppercase"
              >
                {t('cart_drawer_title', '장바구니')}
              </Link>
              <Link
                href="/checkout"
                onClick={() => setIsCartOpen(false)}
                className="w-full text-center py-2.5 px-3 rounded bg-[#c59b27] hover:bg-[#b08820] text-black font-semibold text-xs tracking-wider uppercase transition-all shadow-lg flex items-center justify-center space-x-1.5"
              >
                <span>{t('checkout', '결제하기')}</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
