'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Order } from '@/lib/types';
import {
  Truck,
  Package,
  CheckCircle2,
  Clock,
  Search,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Building2,
  RefreshCw,
  Send,
} from 'lucide-react';

const COURIER_SERVICES = [
  { name: 'CJ대한통운', trackingUrl: 'https://trace.cjlogistics.com/next/tracking.html?wblNo=' },
  { name: '로젠택배', trackingUrl: 'https://www.ilogen.com/web/personal/trace/' },
  { name: '한진택배', trackingUrl: 'https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&wblnum=' },
  { name: '우체국택배', trackingUrl: 'https://service.epost.go.kr/trace.RetrieveDomRcvInvoiceTrace.comm?sid1=' },
  { name: '롯데택배', trackingUrl: 'https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=' },
];

export default function AdminOrderManagementPage() {
  const { orders } = useAuth();

  // Local state for administrative order edits
  const [orderList, setOrderList] = useState<Order[]>(() => {
    if (orders && orders.length > 0) return orders;
    return [
      {
        id: 'ORD-2026-991201',
        createdAt: '2026-08-08',
        status: 'PAID',
        items: [
          { productId: 'prod-kimchi', name: '송영민 명인 100% 한옥 전통 포기김치 5kg', price: 32000, quantity: 2, image_url: 'https://images.unsplash.com/photo-1583032015879-e5022cb87c3b?auto=format&fit=crop&w=400&q=80' },
          { productId: 'prod-1', name: '프리미엄 곤드레 한우 사골 만두 (1kg)', price: 18000, quantity: 3, image_url: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=400&q=80' },
        ],
        subtotal: 118000,
        discount: 0,
        shipping: 0,
        total: 118000,
        shippingAddress: {
          id: 'addr-1',
          title: '자택',
          fullName: '김철수 바이어',
          phone: '010-3819-2049',
          addressLine1: '서울특별시 강남구 테헤란로 427',
          addressLine2: '송영민푸드 빌딩 12층',
          city: '서울특별시',
          postalCode: '06159',
          country: '대한민국',
        },
        paymentMethod: 'toss_payments',
        tossPaymentKey: 'toss_pk_20260808_991201',
        tossMethod: '토스페이 (TossPay 1초 결제)',
        carrier: 'CJ대한통운',
        trackingNumber: '68301928301',
      },
      {
        id: 'ORD-2026-784019',
        createdAt: '2026-08-07',
        status: 'Processing',
        items: [
          { productId: 'prod-3', name: '궁중 명품 떡갈비 HMR 세트 (600g)', price: 24000, quantity: 4, image_url: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=400&q=80' },
        ],
        subtotal: 96000,
        discount: 10000,
        shipping: 0,
        total: 86000,
        shippingAddress: {
          id: 'addr-2',
          title: '식자재 식당',
          fullName: '박도매 대표',
          phone: '010-8812-9901',
          addressLine1: '경기도 성남시 분당구 판교역로 160',
          city: '성남시',
          postalCode: '13529',
          country: '대한민국',
        },
        paymentMethod: 'toss_payments',
        tossPaymentKey: 'toss_pk_20260807_784019',
        tossMethod: '신용카드 (현대/삼성)',
        carrier: '로젠택배',
        trackingNumber: '',
      },
    ];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState<{ [orderId: string]: string }>({});
  const [trackingInputs, setTrackingInputs] = useState<{ [orderId: string]: string }>({});
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveWaybill = (orderId: string) => {
    const carrier = selectedCarrier[orderId] || 'CJ대한통운';
    const waybill = trackingInputs[orderId] || '';

    if (!waybill.trim()) {
      alert('운송장 번호를 입력해주세요.');
      return;
    }

    setOrderList((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              carrier: carrier as any,
              trackingNumber: waybill,
              status: 'Shipped',
              shippedAt: new Date().toLocaleDateString('ko-KR'),
            }
          : o
      )
    );

    showToast(`[${orderId}] 건에 ${carrier} 운송장 (${waybill}) 번호가 등록 및 고객 실시간 반영되었습니다.`);
  };

  const filteredOrders = orderList.filter(
    (o) =>
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.shippingAddress.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.shippingAddress.phone.includes(searchQuery)
  );

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8 font-sans">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-950 border border-emerald-500 text-emerald-300 font-mono text-xs px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-top duration-300">
          ✓ {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-stone-800 pb-6 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-400 text-xs font-mono uppercase tracking-widest mb-1">
            <Truck size={14} />
            <span>Sub-Admin Staff — Orders &amp; Shipping Management</span>
          </div>
          <h1 className="font-serif-luxury text-2xl text-white font-semibold tracking-wide">
            회원 주문 내역 결제 확인 &amp; 택배 송장 등록
          </h1>
          <p className="text-stone-400 text-xs mt-1">
            토스페이먼츠 실시간 결제 승인 내역을 확인하고 CJ대한통운, 로젠, 한진 등 택배 운송장 번호를 등록합니다.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
            <input
              type="text"
              placeholder="주문번호 또는 고객명 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-stone-900 border border-stone-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-6">
        {filteredOrders.length === 0 ? (
          <div className="bg-[#0d0d12] border border-stone-800 rounded-2xl p-12 text-center text-stone-500 text-xs">
            조회된 주문 내역이 없습니다.
          </div>
        ) : (
          filteredOrders.map((order) => {
            const currentCarrierName = selectedCarrier[order.id] || order.carrier || 'CJ대한통운';
            const courierInfo = COURIER_SERVICES.find((c) => c.name === currentCarrierName) || COURIER_SERVICES[0];
            const currentWaybill = trackingInputs[order.id] ?? (order.trackingNumber || '');

            return (
              <div
                key={order.id}
                className="bg-[#0d0d12] border border-stone-800 hover:border-stone-700 rounded-2xl p-6 space-y-6 shadow-lg transition-all"
              >
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-stone-800 pb-4 gap-3 text-xs">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono font-bold text-amber-400 text-sm">{order.id}</span>
                    <span className="text-stone-500 font-mono">({order.createdAt})</span>
                    <span
                      className={`px-2.5 py-0.5 rounded font-mono font-bold text-[11px] ${
                        order.status === 'PAID'
                          ? 'bg-blue-950 text-blue-400 border border-blue-800'
                          : order.status === 'Shipped'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {order.status === 'PAID'
                        ? '💳 토스결제 완료'
                        : order.status === 'Shipped'
                        ? '🚚 택배 발송완료'
                        : order.status}
                    </span>
                  </div>

                  {/* Payment Method Badge */}
                  <div className="flex items-center space-x-2 text-stone-300 font-mono">
                    <CreditCard size={14} className="text-[#3182f6]" />
                    <span>{order.tossMethod || order.paymentMethod}</span>
                    <span className="font-extrabold text-white text-sm">
                      ₩{order.total.toLocaleString()}원
                    </span>
                  </div>
                </div>

                {/* Customer & Product Content */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
                  {/* Left (6 cols): Customer & Address */}
                  <div className="lg:col-span-6 bg-[#121218] p-4 rounded-xl space-y-2 border border-stone-800">
                    <div className="font-bold text-white text-sm flex items-center justify-between">
                      <span>수령인: {order.shippingAddress.fullName} 님</span>
                      <span className="text-stone-400 font-mono text-xs">{order.shippingAddress.phone}</span>
                    </div>
                    <div className="text-stone-300">
                      [{order.shippingAddress.postalCode}] {order.shippingAddress.addressLine1} {order.shippingAddress.addressLine2 || ''}
                    </div>
                    {order.tossPaymentKey && (
                      <div className="pt-2 text-[10px] font-mono text-stone-500 border-t border-stone-800/80">
                        토스 승인키: {order.tossPaymentKey}
                      </div>
                    )}
                  </div>

                  {/* Right (6 cols): Items */}
                  <div className="lg:col-span-6 space-y-2">
                    <div className="text-stone-400 font-bold">주문 상품 목록 ({order.items.length}개)</div>
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                      {order.items.map((it, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 bg-[#121218] rounded-lg border border-stone-800/60"
                        >
                          <div className="flex items-center space-x-3">
                            <img src={it.image_url} alt={it.name} className="w-10 h-10 object-cover rounded" />
                            <div>
                              <div className="font-bold text-white text-xs">{it.name}</div>
                              <div className="text-[10px] text-stone-500">수량: {it.quantity}개</div>
                            </div>
                          </div>
                          <div className="font-mono font-bold text-amber-400 text-xs">
                            ₩{(it.price * it.quantity).toLocaleString()}원
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Waybill Tracking Entry Bar */}
                <div className="bg-[#141820] border border-blue-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                    <label className="text-xs font-bold text-blue-400 flex items-center space-x-1">
                      <Truck size={15} />
                      <span>택배사 &amp; 운송장 등록:</span>
                    </label>

                    {/* Courier Dropdown */}
                    <select
                      value={currentCarrierName}
                      onChange={(e) => setSelectedCarrier({ ...selectedCarrier, [order.id]: e.target.value })}
                      className="bg-stone-900 border border-stone-700 text-xs text-white rounded-lg px-3 py-2 font-bold focus:outline-none focus:border-blue-500"
                    >
                      {COURIER_SERVICES.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    {/* Waybill Number Input */}
                    <input
                      type="text"
                      placeholder="운송장 번호 입력 (숫자)"
                      value={currentWaybill}
                      onChange={(e) => setTrackingInputs({ ...trackingInputs, [order.id]: e.target.value })}
                      className="bg-stone-900 border border-stone-700 text-xs text-white rounded-lg px-3 py-2 font-mono font-bold w-48 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => handleSaveWaybill(order.id)}
                      className="px-5 py-2 bg-[#3182f6] hover:bg-[#1b64da] text-white text-xs font-bold rounded-lg shadow flex items-center space-x-1.5 transition-all"
                    >
                      <Send size={13} />
                      <span>송장 저장 &amp; 실시간 고객 반영</span>
                    </button>

                    {order.trackingNumber && (
                      <a
                        href={`${courierInfo.trackingUrl}${order.trackingNumber}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs rounded-lg flex items-center space-x-1 border border-stone-700"
                      >
                        <ExternalLink size={13} />
                        <span>실시간 배송조회</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
