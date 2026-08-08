'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Order, OrderItem, ShippingAddress } from '@/lib/types';
import {
  CreditCard,
  Building2,
  Smartphone,
  ShieldCheck,
  Lock,
  ChevronRight,
  CheckCircle,
  Truck,
} from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, subtotal, discountAmount, shippingFee, totalAmount, clearCart } = useCart();
  const { user, addOrder, isLoggedIn } = useAuth();

  // Form State
  const [formData, setFormData] = useState<ShippingAddress>({
    id: 'addr-' + Date.now(),
    title: '배송지 주소',
    fullName: user?.name || '',
    phone: user?.phone || '',
    addressLine1: user?.addresses?.[0]?.addressLine1 || '',
    addressLine2: user?.addresses?.[0]?.addressLine2 || '',
    city: user?.addresses?.[0]?.city || '서울특별시',
    postalCode: user?.addresses?.[0]?.postalCode || '06132',
    country: user?.addresses?.[0]?.country || '대한민국 (South Korea)',
  });

  const [email, setEmail] = useState(user?.email || '');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'toss_payments' | 'credit_card' | 'bank_transfer' | 'kakao_pay'>('toss_payments');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTossModal, setShowTossModal] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState('');

  // Auto fill if user loads
  useEffect(() => {
    if (user) {
      setEmail(user.email);
      if (user.addresses && user.addresses.length > 0) {
        const addr = user.addresses[0];
        setFormData({
          id: addr.id,
          title: addr.title,
          fullName: user.name || addr.fullName,
          phone: user.phone || addr.phone,
          addressLine1: addr.addressLine1,
          addressLine2: addr.addressLine2,
          city: addr.city,
          postalCode: addr.postalCode,
          country: addr.country,
          isDefault: addr.isDefault,
        });
      }
    }
  }, [user]);

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#141815] flex flex-col justify-center items-center p-6 text-center space-y-4">
        <h2 className="font-serif-luxury text-2xl text-white">장바구니가 비어 있습니다.</h2>
        <p className="text-xs text-stone-400">결제를 진행하려면 먼저 장바구니에 상품을 담아주세요.</p>
        <Link
          href="/shop"
          className="bg-[#c59b27] hover:bg-[#b08820] text-black font-semibold text-xs uppercase px-5 py-2.5 rounded"
        >
          쇼핑몰로 돌아가기
        </Link>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleConfirmTossPayment = (selectedTossMethod: string) => {
    setIsSubmitting(true);
    const orderId = pendingOrderId || 'ORD-2026-' + Math.floor(100000 + Math.random() * 900000);
    const paymentKey = `toss_pk_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const items: OrderItem[] = cartItems.map((ci) => ({
      productId: ci.product.id,
      name: ci.product.name,
      price: ci.product.price || 18000,
      quantity: ci.quantity,
      image_url: ci.product.image_url,
      format: ci.selectedFormat || ci.product.format,
    }));

    const newOrder: Order = {
      id: orderId,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'PAID', // 토스페이먼츠 결제 승인 완료
      items,
      subtotal,
      discount: discountAmount,
      shipping: shippingFee,
      total: totalAmount,
      shippingAddress: formData,
      paymentMethod: 'toss_payments',
      tossPaymentKey: paymentKey,
      tossMethod: selectedTossMethod,
      carrier: 'CJ대한통운',
    };

    setTimeout(() => {
      addOrder(newOrder);
      clearCart();
      setIsSubmitting(false);
      setShowTossModal(false);
      router.push(`/checkout/success?paymentKey=${paymentKey}&orderId=${orderId}&amount=${totalAmount}&method=${encodeURIComponent(selectedTossMethod)}`);
    }, 1200);
  };

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !email || !formData.addressLine1 || !formData.phone) {
      alert('배송지 정보(성함, 연락처, 이메일, 주소)를 정확히 입력해 주세요.');
      return;
    }

    const generatedId = 'ORD-2026-' + Math.floor(100000 + Math.random() * 900000);
    setPendingOrderId(generatedId);

    if (paymentMethod === 'toss_payments' || paymentMethod === 'credit_card' || paymentMethod === 'kakao_pay') {
      setShowTossModal(true);
    } else {
      // 무통장 입금
      handleConfirmTossPayment('무통장 입금 (계좌이체)');
    }
  };

  return (
    <div className="min-h-screen bg-[#141815] text-stone-100 pb-24">
      {/* Breadcrumb Header */}
      <div className="bg-[#0d110e] border-b border-emerald-900/30 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-2">
          <div className="flex items-center space-x-2 text-xs text-stone-500 font-mono">
            <Link href="/" className="hover:text-stone-300">Home</Link>
            <ChevronRight size={12} />
            <Link href="/cart" className="hover:text-stone-300">Cart</Link>
            <ChevronRight size={12} />
            <span className="text-[#c59b27]">Checkout</span>
          </div>
          <h1 className="font-serif-luxury text-3xl sm:text-4xl font-light text-white">
            Secure Checkout
          </h1>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left Column: Shipping & Customer Info */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Customer Details Box */}
            <div className="bg-[#101411] border border-emerald-900/30 rounded-lg p-6 space-y-5">
              <div className="flex justify-between items-center border-b border-emerald-900/30 pb-3">
                <h2 className="font-serif-luxury text-lg text-white font-medium flex items-center space-x-2">
                  <Truck size={18} className="text-[#c59b27]" />
                  <span>Shipping Address & Contact</span>
                </h2>
                {!isLoggedIn && (
                  <Link href="/account/login" className="text-xs text-[#c59b27] hover:underline font-mono">
                    Already have an account? Log in
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-stone-400 font-medium">Full Name *</label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="e.g. Lorenzo Medici"
                    className="w-full bg-stone-900 border border-emerald-900/40 rounded px-3 py-2 text-stone-200 focus:outline-none focus:border-[#c59b27]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-stone-400 font-medium">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="medici@example.com"
                    className="w-full bg-stone-900 border border-emerald-900/40 rounded px-3 py-2 text-stone-200 focus:outline-none focus:border-[#c59b27]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-stone-400 font-medium">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 019-2831"
                    className="w-full bg-stone-900 border border-emerald-900/40 rounded px-3 py-2 text-stone-200 focus:outline-none focus:border-[#c59b27]"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-stone-400 font-medium">Street Address *</label>
                  <input
                    type="text"
                    required
                    name="addressLine1"
                    value={formData.addressLine1}
                    onChange={handleInputChange}
                    placeholder="House number and street name"
                    className="w-full bg-stone-900 border border-emerald-900/40 rounded px-3 py-2 text-stone-200 focus:outline-none focus:border-[#c59b27]"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-stone-400 font-medium">Apartment, suite, unit (optional)</label>
                  <input
                    type="text"
                    name="addressLine2"
                    value={formData.addressLine2 || ''}
                    onChange={handleInputChange}
                    placeholder="Apt 12B"
                    className="w-full bg-stone-900 border border-emerald-900/40 rounded px-3 py-2 text-stone-200 focus:outline-none focus:border-[#c59b27]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-stone-400 font-medium">Town / City *</label>
                  <input
                    type="text"
                    required
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full bg-stone-900 border border-emerald-900/40 rounded px-3 py-2 text-stone-200 focus:outline-none focus:border-[#c59b27]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-stone-400 font-medium">Postal / ZIP Code *</label>
                  <input
                    type="text"
                    required
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleInputChange}
                    className="w-full bg-stone-900 border border-emerald-900/40 rounded px-3 py-2 text-stone-200 focus:outline-none focus:border-[#c59b27]"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-stone-400 font-medium">Country / Region *</label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full bg-stone-900 border border-emerald-900/40 rounded px-3 py-2 text-stone-200 focus:outline-none focus:border-[#c59b27]"
                  >
                    <option value="United States">United States</option>
                    <option value="South Korea">South Korea (대한민국)</option>
                    <option value="Japan">Japan (日本)</option>
                    <option value="China">China (中国)</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Italy">Italy</option>
                    <option value="France">France</option>
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2 pt-2">
                  <label className="text-stone-400 font-medium">Order Notes (Optional)</label>
                  <textarea
                    rows={3}
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="Notes about your order, e.g. special delivery instructions or cold-pack request."
                    className="w-full bg-stone-900 border border-emerald-900/40 rounded px-3 py-2 text-stone-200 focus:outline-none focus:border-[#c59b27]"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="bg-[#101411] border border-emerald-900/30 rounded-lg p-6 space-y-4">
              <h2 className="font-serif-luxury text-lg text-white font-medium border-b border-emerald-900/30 pb-3 flex items-center space-x-2">
                <Lock size={18} className="text-[#c59b27]" />
                <span>결제 수단 선택 (Toss Payments 연동)</span>
              </h2>

              <div className="space-y-3">
                {/* Toss Payments Primary Option */}
                <label
                  className={`block border p-4 rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'toss_payments'
                      ? 'border-[#c59b27] bg-[#18221b] ring-1 ring-[#c59b27]/40'
                      : 'border-emerald-900/30 bg-stone-900 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'toss_payments'}
                        onChange={() => setPaymentMethod('toss_payments')}
                        className="accent-[#c59b27]"
                      />
                      <span className="font-medium text-xs text-white flex items-center space-x-2">
                        <CreditCard size={16} className="text-[#c59b27]" />
                        <span className="font-bold">토스페이먼츠 (Toss Payments) 통합결제</span>
                      </span>
                    </div>
                    <span className="text-[10px] font-bold bg-[#3182f6] text-white px-2 py-0.5 rounded">
                      토스페이 / 카드 / 계좌이체
                    </span>
                  </div>
                  {paymentMethod === 'toss_payments' && (
                    <p className="mt-2 text-[11px] text-stone-300 leading-relaxed pl-7">
                      국내 신용/체크카드, 토스페이, 실시간 계좌이체, 가상계좌를 토스페이먼츠 보안 창에서 실시간 결제합니다.
                    </p>
                  )}
                </label>

                {/* Direct Wire */}
                <label
                  className={`block border p-4 rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'bank_transfer'
                      ? 'border-[#c59b27] bg-[#18221b]'
                      : 'border-emerald-900/30 bg-stone-900 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'bank_transfer'}
                      onChange={() => setPaymentMethod('bank_transfer')}
                      className="accent-[#c59b27]"
                    />
                    <span className="font-medium text-xs text-stone-200 flex items-center space-x-2">
                      <Building2 size={16} className="text-[#c59b27]" />
                      <span>무통장 입금 (기업은행 / 농협 전용계좌)</span>
                    </span>
                  </div>
                  {paymentMethod === 'bank_transfer' && (
                    <p className="mt-2 text-[11px] text-stone-400 leading-relaxed font-light pl-7">
                      기업은행 1004-2026-0804 (예금주: 송영민푸드). 입금 확인 후 즉시 냉동 포장 및 당일 출고됩니다.
                    </p>
                  )}
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Place Order */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#101411] border border-emerald-900/30 rounded-lg p-6 space-y-6 shadow-xl sticky top-28">
              <h2 className="font-serif-luxury text-lg text-white font-medium border-b border-emerald-900/30 pb-3">
                주문 내역 요약
              </h2>

              {/* Items Summary */}
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1 divide-y divide-emerald-900/20">
                {cartItems.map((ci) => (
                  <div key={ci.product.id} className="pt-3 first:pt-0 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3">
                      <img
                        src={ci.product.image_url}
                        alt={ci.product.name}
                        className="w-10 h-10 object-cover rounded border border-emerald-900/30"
                      />
                      <div>
                        <div className="font-medium text-stone-200 line-clamp-1">{ci.product.name}</div>
                        <div className="text-[10px] text-stone-500 font-mono">수량: {ci.quantity}개</div>
                      </div>
                    </div>
                    <span className="font-mono font-semibold text-[#c59b27]">
                      ₩{((ci.product.price || 18000) * ci.quantity).toLocaleString()}원
                    </span>
                  </div>
                ))}
              </div>

              {/* Price Calculations */}
              <div className="space-y-2.5 text-xs text-stone-300 border-t border-emerald-900/30 pt-4">
                <div className="flex justify-between">
                  <span className="text-stone-400">상품 소계</span>
                  <span className="font-mono">₩{subtotal.toLocaleString()}원</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>할인 금액</span>
                    <span className="font-mono">-₩{discountAmount.toLocaleString()}원</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-stone-400">신선 배송비</span>
                  <span className="font-mono">
                    {shippingFee === 0 ? (
                      <span className="text-emerald-400 uppercase font-semibold text-[11px]">무료배송</span>
                    ) : (
                      `₩${shippingFee.toLocaleString()}원`
                    )}
                  </span>
                </div>

                <div className="flex justify-between items-center text-lg font-bold text-white pt-3 border-t border-emerald-900/30">
                  <span>총 결제금액</span>
                  <span className="font-mono text-[#c59b27]">₩{totalAmount.toLocaleString()}원</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#3182f6] hover:bg-[#1b64da] text-white font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>토스페이먼츠 결제 승인 처리 중...</span>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>토스페이먼츠 결제하기 (₩{totalAmount.toLocaleString()}원)</span>
                  </>
                )}
              </button>

              <div className="text-[11px] text-stone-400 text-center font-light leading-relaxed">
                위 결제하기 버튼을 누르면 토스페이먼츠 보안 창이 호출되며 실시간 승인 처리됩니다.
              </div>
            </div>
          </div>
        </form>
      </main>

      {/* Toss Payments Mock Interactive Modal Window */}
      {showTossModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#191f28] border border-blue-500/40 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-stone-700 pb-4">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-[#3182f6]" />
                <h3 className="font-bold text-lg font-mono">Toss Payments</h3>
              </div>
              <button onClick={() => setShowTossModal(false)} className="text-stone-400 hover:text-white text-xs">
                ✕ 닫기
              </button>
            </div>

            <div className="space-y-3 bg-[#101418] p-4 rounded-xl border border-stone-800 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-400">가맹점</span>
                <span className="font-bold text-stone-200">송영민푸드 (자사몰)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">주문번호</span>
                <span className="font-mono text-stone-200">{pendingOrderId}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-stone-800">
                <span>최종 결제 금액</span>
                <span className="text-[#3182f6]">₩{totalAmount.toLocaleString()}원</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-stone-400 font-bold block">결제 수단 선택</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleConfirmTossPayment('토스페이 (TossPay)')}
                  className="p-3 bg-[#3182f6] hover:bg-[#1b64da] rounded-xl text-xs font-bold text-white flex items-center justify-center space-x-1 shadow"
                >
                  <span>🔹 토스페이 (1초 결제)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmTossPayment('신용카드 (현대/삼성/KB/신한)')}
                  className="p-3 bg-stone-800 hover:bg-stone-700 rounded-xl text-xs font-bold text-stone-200 flex items-center justify-center space-x-1"
                >
                  <span>💳 신용/체크카드</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmTossPayment('실시간 계좌이체')}
                  className="p-3 bg-stone-800 hover:bg-stone-700 rounded-xl text-xs font-bold text-stone-200 flex items-center justify-center space-x-1"
                >
                  <span>🏦 실시간 계좌이체</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmTossPayment('가상계좌 (입금전용)')}
                  className="p-3 bg-stone-800 hover:bg-stone-700 rounded-xl text-xs font-bold text-stone-200 flex items-center justify-center space-x-1"
                >
                  <span>📄 가상계좌</span>
                </button>
              </div>
            </div>

            <div className="text-[11px] text-stone-400 text-center font-mono">
              🔒 토스페이먼츠 256-bit 보안 암호화 결제 엔진으로 안전하게 보호됩니다.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
