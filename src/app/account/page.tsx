'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import {
  LayoutDashboard,
  ShoppingBag,
  MapPin,
  User,
  Heart,
  LogOut,
  ChevronRight,
  Package,
  Truck,
  Plus,
  Trash2,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

import { useLanguage } from '@/lib/i18n/LanguageContext';

function MyAccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'dashboard';
  const { t } = useLanguage();

  const { user, orders, logout, isLoggedIn, updateProfile } = useAuth();
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Profile Edit State
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileCompany, setProfileCompany] = useState(user?.company || '');
  const [profileMsg, setProfileMsg] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) setActiveTab(tabParam);
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      setProfileName(user.name);
      setProfilePhone(user.phone || '');
      setProfileCompany(user.company || '');
    }
  }, [user]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex flex-col justify-center items-center p-6 text-center space-y-4 font-sans">
        <h2 className="font-jakarta text-2xl font-bold text-stone-900">{t('access_restricted', '접근이 제한되었습니다')}</h2>
        <p className="text-xs text-stone-500">{t('login_required', '송영민푸드 고객 계정 로그인이 필요합니다.')}</p>
        <Link
          href="/account/login"
          className="bg-[#14532D] hover:bg-[#1b6a3b] text-white font-semibold text-xs px-6 py-3 rounded-md transition-colors"
        >
          {t('go_to_login', '고객 로그인 페이지로 이동')}
        </Link>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push('/account/login');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name: profileName,
      phone: profilePhone,
      company: profileCompany,
    });
    setProfileMsg(true);
    setTimeout(() => setProfileMsg(false), 3000);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Navigation Sidebar */}
        <aside className="lg:col-span-3 bg-white border border-stone-200 rounded-xl p-4 space-y-1 h-fit shadow-sm">
          <div className="p-3 mb-2 border-b border-stone-100">
            <div className="text-xs text-stone-400 font-medium">{t('account_signed_in_as', '로그인 계정')}</div>
            <div className="font-jakarta text-base font-bold text-stone-900 truncate">{user?.name}</div>
            <div className="text-[11px] text-[#14532D] font-mono font-semibold truncate">{user?.email}</div>
          </div>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-[#14532D] text-white shadow'
                : 'text-stone-700 hover:bg-stone-100 hover:text-[#14532D]'
            }`}
          >
            <LayoutDashboard size={16} />
            <span>{t('account_dashboard', '마이페이지 대시보드')}</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'orders'
                ? 'bg-[#14532D] text-white shadow'
                : 'text-stone-700 hover:bg-stone-100 hover:text-[#14532D]'
            }`}
          >
            <div className="flex items-center space-x-3">
              <ShoppingBag size={16} />
              <span>{t('account_orders', '주문 내역')}</span>
            </div>
            <span className="font-mono text-[10px] bg-stone-200 text-stone-800 font-bold px-2 py-0.5 rounded-full">
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('addresses')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'addresses'
                ? 'bg-[#14532D] text-white shadow'
                : 'text-stone-700 hover:bg-stone-100 hover:text-[#14532D]'
            }`}
          >
            <MapPin size={16} />
            <span>{t('account_addresses', '배송지 관리')}</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'profile'
                ? 'bg-[#14532D] text-white shadow'
                : 'text-stone-700 hover:bg-stone-100 hover:text-[#14532D]'
            }`}
          >
            <User size={16} />
            <span>{t('account_details', '회원 정보 수정')}</span>
          </button>

          <button
            onClick={() => setActiveTab('wishlist')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'wishlist'
                ? 'bg-[#14532D] text-white shadow'
                : 'text-stone-700 hover:bg-stone-100 hover:text-[#14532D]'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Heart size={16} />
              <span>{t('account_wishlist', '위시리스트')}</span>
            </div>
            <span className="font-mono text-[10px] bg-stone-200 text-stone-800 font-bold px-2 py-0.5 rounded-full">
              {wishlist.length}
            </span>
          </button>

          <div className="pt-4 border-t border-stone-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs text-red-600 hover:bg-red-50 hover:text-red-700 transition-all font-bold"
            >
              <LogOut size={16} />
              <span>{t('account_logout', '로그아웃')}</span>
            </button>
          </div>
        </aside>

        {/* Right Tab Content View */}
        <main className="lg:col-span-9 space-y-6">
          
          {/* Tab 1: Dashboard Overview */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="bg-white border border-stone-200 rounded-xl p-6 sm:p-8 space-y-4 shadow-sm">
                <h2 className="font-jakarta text-2xl text-stone-900 font-bold">
                  {t('account_welcome', '안녕하세요')}, <span className="text-[#14532D]">{user?.name}</span>님!
                </h2>
                <p className="text-xs text-stone-600 leading-relaxed">
                  송영민푸드 고객 마이페이지에서 고객님의{' '}
                  <button onClick={() => setActiveTab('orders')} className="text-[#14532D] font-bold underline">
                    {t('recent_orders', '최근 주문 내역')}
                  </button>
                  을 확인하시고,{' '}
                  <button onClick={() => setActiveTab('addresses')} className="text-[#14532D] font-bold underline">
                    {t('shipping_address', '기본 배송지 주소')}
                  </button>
                  와{' '}
                  <button onClick={() => setActiveTab('profile')} className="text-[#14532D] font-bold underline">
                    {t('account_details', '회원 정보')}
                  </button>
                  를 관리하실 수 있습니다.
                </p>
              </div>

              {/* Dashboard Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-stone-200 p-5 rounded-xl space-y-1 shadow-sm">
                  <div className="text-stone-500 text-xs font-bold font-mono">총 주문 건수</div>
                  <div className="font-mono text-3xl font-bold text-[#14532D]">{orders.length}</div>
                  <div className="text-[11px] text-stone-400">누적 구매 횟수</div>
                </div>
                <div className="bg-white border border-stone-200 p-5 rounded-xl space-y-1 shadow-sm">
                  <div className="text-stone-500 text-xs font-bold font-mono">위시리스트 저장</div>
                  <div className="font-mono text-3xl font-bold text-[#EAB308]">{wishlist.length}</div>
                  <div className="text-[11px] text-stone-400">관심 상품 목록</div>
                </div>
                <div className="bg-white border border-stone-200 p-5 rounded-xl space-y-1 shadow-sm">
                  <div className="text-stone-500 text-xs font-bold font-mono">회원 등급</div>
                  <div className="font-jakarta text-lg font-bold text-[#14532D] flex items-center space-x-1">
                    <ShieldCheck size={18} className="text-[#EAB308]" />
                    <span>송영민푸드 VIP 멤버</span>
                  </div>
                  <div className="text-[11px] text-emerald-700 font-bold">24시간 에어 냉장배송 혜택 적용</div>
                </div>
              </div>

              {/* Recent Order Preview */}
              {orders.length > 0 && (
                <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                    <h3 className="font-jakarta text-base font-bold text-stone-900">최근 주문</h3>
                    <button
                      onClick={() => setActiveTab('orders')}
                      className="text-xs text-[#14532D] font-bold hover:underline font-mono"
                    >
                      전체 주문 내역 보기 &rarr;
                    </button>
                  </div>
                  <div className="flex justify-between items-center text-xs font-mono">
                    <div>
                      <span className="text-stone-500">주문 번호: </span>
                      <span className="text-stone-900 font-bold">{orders[0].id}</span>
                    </div>
                    <span className="bg-emerald-100 text-[#14532D] font-bold px-2.5 py-1 rounded-full text-[11px]">
                      {orders[0].status}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Orders List */}
          {activeTab === 'orders' && (
            <div className="bg-[#101411] border border-emerald-900/30 rounded-lg p-6 space-y-6">
              <h2 className="font-serif-luxury text-xl text-white font-medium border-b border-emerald-900/30 pb-3">
                Order History ({orders.length})
              </h2>

              {orders.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <Package size={36} className="mx-auto text-stone-600" />
                  <p className="text-xs text-stone-400">No order has been made yet.</p>
                  <Link
                    href="/shop"
                    className="inline-block bg-[#c59b27] text-black font-semibold text-xs px-4 py-2 rounded uppercase"
                  >
                    Browse Products
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="border border-emerald-900/40 rounded-lg p-5 bg-[#141815] space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-emerald-900/30 pb-3 font-mono text-xs">
                        <div>
                          <span className="text-stone-400">주문 번호: </span>
                          <span className="text-[#c59b27] font-bold">{ord.id}</span>
                          <span className="text-stone-500 ml-3">({ord.createdAt})</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="bg-[#3182f6]/20 text-[#3182f6] border border-[#3182f6]/40 px-2 py-0.5 rounded text-[10px] font-bold">
                            {ord.tossMethod || '토스페이먼츠 승인'}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                              ord.status === 'PAID'
                                ? 'bg-blue-950 text-blue-400 border border-blue-800'
                                : ord.status === 'Shipped'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-amber-950 text-amber-400 border border-amber-800'
                            }`}
                          >
                            {ord.status === 'PAID'
                              ? '결제완료 (배송준비중)'
                              : ord.status === 'Shipped'
                              ? '배송중 (택배출고)'
                              : ord.status}
                          </span>
                        </div>
                      </div>

                      <div className="divide-y divide-emerald-900/20">
                        {ord.items.map((it, idx) => (
                          <div key={idx} className="py-2.5 flex items-center space-x-3 text-xs">
                            <img
                              src={it.image_url}
                              alt={it.name}
                              className="w-12 h-12 object-cover rounded border border-emerald-900/30"
                            />
                            <div className="flex-1">
                              <div className="font-serif-luxury font-medium text-stone-200">{it.name}</div>
                              <div className="text-[10px] text-stone-500 font-mono">수량: {it.quantity}개</div>
                            </div>
                            <span className="font-mono font-semibold text-[#c59b27]">
                              ₩{(it.price * it.quantity).toLocaleString()}원
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Courier Tracking Section */}
                      {ord.trackingNumber ? (
                        <div className="bg-[#1a221d] border border-emerald-700/40 p-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs gap-2">
                          <div className="flex items-center space-x-2">
                            <Truck size={16} className="text-emerald-400" />
                            <span className="text-stone-300 font-bold">
                              {ord.carrier || 'CJ대한통운'} 운송장번호: <span className="font-mono text-amber-400">{ord.trackingNumber}</span>
                            </span>
                          </div>
                          <a
                            href={
                              ord.carrier === '로젠택배'
                                ? `https://www.ilogen.com/web/personal/trace/`
                                : ord.carrier === '한진택배'
                                ? `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&wblnum=${ord.trackingNumber}`
                                : ord.carrier === '우체국택배'
                                ? `https://service.epost.go.kr/trace.RetrieveDomRcvInvoiceTrace.comm?sid1=${ord.trackingNumber}`
                                : `https://trace.cjlogistics.com/next/tracking.html?wblNo=${ord.trackingNumber}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="bg-[#14532D] hover:bg-emerald-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg flex items-center space-x-1 shadow transition-all"
                          >
                            <span>🚚 실시간 택배 배송 추적</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      ) : (
                        <div className="text-[11px] text-stone-500 font-mono italic">
                          ℹ 신선 포장 준비 중입니다. 송장 등록 시 실시간 추적 버튼이 활성화됩니다.
                        </div>
                      )}

                      <div className="border-t border-emerald-900/30 pt-3 flex justify-between items-center text-xs">
                        <span className="text-stone-400">총 결제 금액: <strong className="text-white font-mono text-sm">₩{ord.total.toLocaleString()}원</strong></span>
                        <Link
                          href={`/checkout/success?orderId=${ord.id}`}
                          className="text-[#c59b27] hover:underline flex items-center space-x-1 font-mono text-[11px]"
                        >
                          <span>구매 영수증 / 승인서</span>
                          <ExternalLink size={12} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Addresses */}
          {activeTab === 'addresses' && (
            <div className="bg-[#101411] border border-emerald-900/30 rounded-lg p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-emerald-900/30 pb-3">
                <h2 className="font-serif-luxury text-xl text-white font-medium">
                  Address Book
                </h2>
                <button
                  onClick={() => alert('New address added.')}
                  className="bg-[#c59b27]/15 border border-[#c59b27]/40 text-[#c59b27] text-xs px-3 py-1.5 rounded flex items-center space-x-1 hover:bg-[#c59b27] hover:text-black transition-all"
                >
                  <Plus size={14} />
                  <span>Add New Address</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {user?.addresses?.map((addr) => (
                  <div
                    key={addr.id}
                    className="border border-emerald-900/40 bg-[#141815] rounded-lg p-5 space-y-2 text-xs font-light"
                  >
                    <div className="flex justify-between items-center border-b border-emerald-900/30 pb-2">
                      <span className="font-semibold text-[#c59b27]">{addr.title}</span>
                      {addr.isDefault && (
                        <span className="bg-emerald-950 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-mono">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="text-stone-200 font-medium">{addr.fullName}</div>
                    <div className="text-stone-400">{addr.addressLine1} {addr.addressLine2}</div>
                    <div className="text-stone-400">{addr.city}, {addr.postalCode}</div>
                    <div className="text-stone-400">{addr.country}</div>
                    <div className="text-stone-500 font-mono pt-1">Tel: {addr.phone}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: Profile & Account Details */}
          {activeTab === 'profile' && (
            <div className="bg-[#101411] border border-emerald-900/30 rounded-lg p-6 space-y-6">
              <h2 className="font-serif-luxury text-xl text-white font-medium border-b border-emerald-900/30 pb-3">
                Account Details
              </h2>

              {profileMsg && (
                <div className="bg-emerald-950 border border-emerald-700 text-emerald-400 text-xs p-3 rounded flex items-center space-x-2">
                  <CheckCircle size={16} />
                  <span>Account details updated successfully!</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-stone-300 font-medium">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full bg-stone-900 border border-emerald-900/40 rounded px-3 py-2 text-stone-200 focus:outline-none focus:border-[#c59b27]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-stone-300 font-medium">Email Address (Read only)</label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full bg-stone-950 border border-emerald-900/20 rounded px-3 py-2 text-stone-500 cursor-not-allowed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-stone-300 font-medium">Phone Number</label>
                    <input
                      type="text"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      className="w-full bg-stone-900 border border-emerald-900/40 rounded px-3 py-2 text-stone-200 focus:outline-none focus:border-[#c59b27]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-stone-300 font-medium">Company Name</label>
                    <input
                      type="text"
                      value={profileCompany}
                      onChange={(e) => setProfileCompany(e.target.value)}
                      className="w-full bg-stone-900 border border-emerald-900/40 rounded px-3 py-2 text-stone-200 focus:outline-none focus:border-[#c59b27]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="bg-[#c59b27] hover:bg-[#b08820] text-black font-semibold py-2.5 px-6 rounded text-xs uppercase tracking-wider transition-all"
                >
                  Save Changes
                </button>
              </form>
            </div>
          )}

          {/* Tab 5: Wishlist */}
          {activeTab === 'wishlist' && (
            <div className="bg-[#101411] border border-emerald-900/30 rounded-lg p-6 space-y-6">
              <h2 className="font-serif-luxury text-xl text-white font-medium border-b border-emerald-900/30 pb-3">
                Saved Wishlist ({wishlist.length})
              </h2>

              {wishlist.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <Heart size={36} className="mx-auto text-stone-600" />
                  <p className="text-xs text-stone-400">Your wishlist is currently empty.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {wishlist.map((item) => (
                    <div
                      key={item.id}
                      className="border border-emerald-900/40 bg-[#141815] rounded-lg p-4 flex space-x-4 items-center"
                    >
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded border border-emerald-900/30"
                      />
                      <div className="flex-1 space-y-1">
                        <Link
                          href={`/products/${item.id}`}
                          className="font-serif-luxury text-xs font-medium text-stone-200 hover:text-[#c59b27] block line-clamp-1"
                        >
                          {item.name}
                        </Link>
                        <div className="font-mono text-xs font-bold text-[#c59b27]">
                          ${(item.price || 50).toFixed(2)}
                        </div>
                        <div className="flex items-center space-x-2 pt-1">
                          <button
                            onClick={() => addToCart(item, 1)}
                            className="bg-[#c59b27] text-black font-semibold text-[10px] uppercase px-2.5 py-1 rounded"
                          >
                            Add to Cart
                          </button>
                          <button
                            onClick={() => removeFromWishlist(item.id)}
                            className="text-stone-500 hover:text-red-400 p-1"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </main>
  );
}

export default function MyAccountPage() {
  return (
    <div className="min-h-screen bg-[#141815] text-stone-100 pb-24">
      {/* Header Banner */}
      <div className="bg-[#0d110e] border-b border-emerald-900/30 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-2">
          <div className="flex items-center space-x-2 text-xs text-stone-500 font-mono">
            <Link href="/" className="hover:text-stone-300">Home</Link>
            <ChevronRight size={12} />
            <span className="text-[#c59b27]">My Account</span>
          </div>
          <h1 className="font-serif-luxury text-3xl font-light text-white">
            Customer Dashboard
          </h1>
        </div>
      </div>

      <Suspense fallback={<div className="p-8 text-center text-xs text-stone-400">Loading Account Dashboard...</div>}>
        <MyAccountContent />
      </Suspense>
    </div>
  );
}
