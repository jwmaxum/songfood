'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { CheckCircle2, ShoppingBag, FileText, ShieldCheck } from 'lucide-react';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || 'ORD-2026-8891';
  const paymentKey = searchParams.get('paymentKey') || 'toss_pk_2026_sample';
  const method = searchParams.get('method') || '토스페이 / 카드결제';
  const amountStr = searchParams.get('amount');
  
  const { orders } = useAuth();
  const currentOrder = orders.find((o) => o.id === orderId) || orders[0];

  const totalAmount = amountStr ? Number(amountStr) : (currentOrder?.total || 18000);

  return (
    <div className="max-w-2xl w-full bg-[#101411] border border-emerald-900/40 rounded-xl p-8 sm:p-10 shadow-2xl space-y-8 text-center animate-in zoom-in-95 duration-300">
      {/* Success Icon */}
      <div className="w-20 h-20 rounded-full bg-emerald-950/80 border-2 border-emerald-500/50 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
        <CheckCircle2 size={44} />
      </div>

      <div className="space-y-2">
        <div className="text-xs uppercase font-mono tracking-widest text-[#3182f6] font-bold flex items-center justify-center space-x-1">
          <ShieldCheck size={14} />
          <span>Toss Payments 결제 승인 완료</span>
        </div>
        <h1 className="font-serif-luxury text-3xl font-light text-white">
          주문이 정상적으로 접수되었습니다!
        </h1>
        <p className="text-xs text-stone-300 font-light max-w-md mx-auto leading-relaxed">
          고객님의 토스페이먼츠 결제가 성공적으로 승인되었습니다. 송영민푸드 전담 출고팀이 즉시 신선 냉동 포장하여 배송 준비를 진행합니다.
        </p>
      </div>

      {/* Toss Payment Approval Info Card */}
      <div className="bg-[#18221b] border border-blue-500/30 rounded-xl p-5 text-left text-xs space-y-4 font-mono">
        <div className="flex justify-between items-center border-b border-stone-800 pb-3">
          <div>
            <span className="text-stone-400 block text-[10px]">주문번호 (Order ID)</span>
            <span className="text-[#c59b27] font-bold text-sm">{orderId}</span>
          </div>
          <div className="text-right">
            <span className="text-stone-400 block text-[10px]">토스 승인키 (Payment Key)</span>
            <span className="text-stone-300 text-[11px] font-mono">{paymentKey.slice(0, 16)}...</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-stone-400 block text-[10px]">결제 수단</span>
            <span className="text-white font-bold">{method}</span>
          </div>
          <div className="text-right">
            <span className="text-stone-400 block text-[10px]">배송 전담 택배사</span>
            <span className="text-emerald-400 font-bold">CJ대한통운 / 로젠택배</span>
          </div>
        </div>

        {currentOrder && currentOrder.items && (
          <div className="space-y-2 pt-2 border-t border-stone-800">
            <span className="text-stone-400 text-[11px] font-sans font-semibold block">주문 제품 내역:</span>
            <div className="divide-y divide-stone-800/40">
              {currentOrder.items.map((it, idx) => (
                <div key={idx} className="py-2 flex justify-between items-center text-[11px]">
                  <span className="text-stone-200">{it.name} x {it.quantity}개</span>
                  <span className="text-[#c59b27] font-semibold">₩{(it.price * it.quantity).toLocaleString()}원</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-stone-800 pt-3 flex justify-between items-center text-sm font-bold">
          <span className="text-stone-300 font-sans">총 승인 결제 금액</span>
          <span className="text-[#3182f6] text-base">₩{totalAmount.toLocaleString()}원</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Link
          href="/account?tab=orders"
          className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all border border-stone-700 flex items-center justify-center space-x-2"
        >
          <FileText size={15} />
          <span>마이페이지 주문/배송 조회</span>
        </Link>
        <Link
          href="/shop"
          className="flex-1 bg-[#c59b27] hover:bg-[#b08820] text-black font-semibold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg"
        >
          <ShoppingBag size={15} />
          <span>쇼핑 계속하기</span>
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-[#141815] text-stone-100 py-16 px-4 sm:px-6 lg:px-8 flex justify-center items-center">
      <Suspense fallback={<div className="text-stone-400 text-xs">Loading order confirmation...</div>}>
        <CheckoutSuccessContent />
      </Suspense>
    </div>
  );
}
