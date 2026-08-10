'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MenuItem } from '@/lib/types';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useWishlist } from '@/context/WishlistContext';
import LanguageSelector from './LanguageSelector';
import { Menu, X, ChevronDown, Shield, Heart, User, ShoppingBag, Globe, Store, Building2, FileText } from 'lucide-react';

interface HeaderClientProps {
  menus: MenuItem[];
}

export default function HeaderClient({ menus }: HeaderClientProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { cartItems, setIsCartOpen } = useCart();
  const { user, isLoggedIn } = useAuth();
  const { wishlist } = useWishlist();

  // Determine current active hub
  const isGlobalHub = pathname?.startsWith('/global') || pathname?.startsWith('/rfq') || pathname?.startsWith('/why-kfood');
  const isWholesaleHub = pathname?.startsWith('/wholesale');
  const isDomesticHub = !isGlobalHub && !isWholesaleHub;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMobileMenu, setExpandedMobileMenu] = useState<string | null>(null);

  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const toggleMobileAccordion = (id: string) => {
    setExpandedMobileMenu((prev) => (prev === id ? null : id));
  };

  return (
    <header className="sticky top-0 z-50 w-full glass-header transition-all duration-300">
      {/* 2-Hub Business Navigation Bar */}
      <div className="bg-[#0A0A0C] text-stone-200 border-b border-stone-800/60 py-1.5 px-4 text-xs font-medium">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Link
              href="/shop"
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
                isDomesticHub
                  ? 'bg-[#14532D] text-white shadow-sm ring-1 ring-emerald-400/30'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800/70'
              }`}
            >
              <Store size={13} className="text-[#EAB308]" />
              <span>🇰🇷 K-FOOD SHOP</span>
            </Link>

            <Link
              href="/global"
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
                isGlobalHub
                  ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400/40'
                  : 'text-amber-400 hover:text-white hover:bg-amber-950/40 border border-amber-500/30'
              }`}
            >
              <Globe size={13} className="animate-pulse" />
              <span>🌎 GLOBAL B2B / EXPORT</span>
            </Link>
          </div>

          {/* Quick Action Links & Admin */}
          <div className="flex items-center space-x-3 text-[11px]">
            <Link
              href="/rfq"
              className="flex items-center space-x-1 text-[#EAB308] hover:underline font-bold"
            >
              <FileText size={12} />
              <span>Request a Quote (RFQ)</span>
            </Link>

            <Link
              href="/admin"
              className="flex items-center space-x-1 text-stone-400 hover:text-amber-400 transition-colors bg-stone-900 border border-stone-700 px-2 py-0.5 rounded"
            >
              <Shield size={11} />
              <span>Admin Studio</span>
            </Link>

            {/* 7-Language i18n Selector Component */}
            <LanguageSelector />
          </div>
        </div>
      </div>

      {/* Main Header Row 1: Logo | Company Introduction & Media Lab Navigation | Action Icons */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 relative">
          
          {/* Logo */}
          <Link href="/" className="flex items-center group flex-shrink-0 z-20 py-1">
            <img
              src="/logo.png"
              alt="송영민푸드 (Song Youngmin Food) - K-Food, Korea Food &amp; K-Fresh Food"
              className="h-10 sm:h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </Link>

          {/* Center: GNB Navigation */}
          <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8 font-jakarta text-xs uppercase tracking-wider font-extrabold text-stone-800 z-20">
            {/* 1st Position: K-FOOD SHOP */}
            <Link href="/shop" className="flex items-center space-x-1.5 hover:text-[#14532D] transition-colors py-2">
              <Store size={15} className="text-[#14532D]" />
              <span>K-FOOD SHOP</span>
            </Link>

            {/* 2nd Position: COMPANY Dropdown */}
            <div className="relative group py-2">
              <Link href="/about" className="flex items-center space-x-1.5 hover:text-[#14532D] transition-colors py-2">
                <Building2 size={15} className="text-[#14532D]" />
                <span>COMPANY</span>
                <ChevronDown size={12} className="group-hover:rotate-180 transition-transform duration-200" />
              </Link>

              <div className="absolute top-full left-0 w-60 bg-white border border-stone-200 rounded-xl shadow-xl py-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 -translate-y-1 group-hover:translate-y-0 z-50">
                <Link href="/about" className="block px-4 py-2.5 hover:bg-[#FAFAF8] text-xs font-bold text-stone-700 hover:text-[#14532D] transition-colors">
                  🏢 회사 소개 &amp; 브랜드 스토리
                </Link>
                <Link href="/why-kfood" className="block px-4 py-2.5 hover:bg-[#FAFAF8] text-xs font-bold text-stone-700 hover:text-[#14532D] transition-colors">
                  🏆 Why K-Food &amp; 품질인증
                </Link>
                <Link href="/global" className="block px-4 py-2.5 hover:bg-[#FAFAF8] text-xs font-bold text-stone-700 hover:text-[#14532D] transition-colors">
                  🌐 글로벌 유통 파트너십
                </Link>
                <div className="my-1 border-t border-stone-100" />
                <Link href="/news-events" className="block px-4 py-2.5 hover:bg-[#FAFAF8] text-xs font-bold text-stone-700 hover:text-[#14532D] transition-colors">
                  📰 뉴스&amp;이벤트 (News &amp; Events)
                </Link>
                <Link href="/catalogues" className="block px-4 py-2.5 hover:bg-[#FAFAF8] text-xs font-bold text-stone-700 hover:text-[#14532D] transition-colors">
                  📁 자료실 (Catalogues)
                </Link>
              </div>
            </div>

            {/* 3rd Position: B2B / RFQ QUOTE */}
            <Link href="/rfq" className="flex items-center space-x-1.5 text-amber-700 hover:text-amber-600 transition-colors py-2 font-black">
              <Globe size={15} className="text-[#EAB308]" />
              <span>B2B / RFQ QUOTE</span>
            </Link>
          </nav>

          {/* Right Action Icons (Account, Wishlist, Cart) */}
          <div className="flex items-center space-x-3 sm:space-x-4 z-20">
            {/* Wishlist Link */}
            <Link
              href="/account?tab=wishlist"
              aria-label="Wishlist"
              className="relative p-2 text-stone-700 hover:text-[#14532D] transition-colors"
            >
              <Heart size={20} />
              {wishlist.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#DC2626] animate-pulse" />
              )}
            </Link>

            {/* User / Customer Account Link */}
            <Link
              href={isLoggedIn ? '/account' : '/account/login'}
              aria-label="Customer Account"
              className="p-2 text-stone-700 hover:text-[#14532D] transition-colors flex items-center space-x-1"
              title={isLoggedIn ? `Account (${user?.name})` : 'Customer Login'}
            >
              <User size={20} />
            </Link>

            {/* Cart Drawer Trigger Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              aria-label="Shopping Cart"
              className="relative p-2 text-stone-800 hover:text-[#14532D] transition-colors flex items-center"
            >
              <ShoppingBag size={21} />
              {cartItemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#DC2626] text-white font-extrabold text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-md">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-stone-800 hover:text-[#14532D] transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Hamburger Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-[108px] bg-[#0d110e]/98 border-b border-emerald-900/40 shadow-2xl backdrop-blur-xl animate-in slide-in-from-top duration-300 max-h-[calc(100vh-108px)] overflow-y-auto">
          <div className="px-6 py-6 space-y-4">
            {/* Mobile GNB Items */}
            <div className="border-b border-emerald-900/30 pb-3 space-y-3">
              <div className="text-xs font-extrabold uppercase text-[#c59b27] tracking-wider">COMPANY (회사소개)</div>
              <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="block text-xs text-stone-300 hover:text-white pl-2">
                🏢 회사 소개 &amp; 브랜드 스토리
              </Link>
              <Link href="/why-kfood" onClick={() => setMobileMenuOpen(false)} className="block text-xs text-stone-300 hover:text-white pl-2">
                🏆 Why K-Food &amp; 품질인증
              </Link>
              <Link href="/global" onClick={() => setMobileMenuOpen(false)} className="block text-xs text-stone-300 hover:text-white pl-2">
                🌐 글로벌 유통 파트너십
              </Link>
              <Link href="/news-events" onClick={() => setMobileMenuOpen(false)} className="block text-xs text-stone-300 hover:text-white pl-2">
                📰 뉴스&amp;이벤트 (News &amp; Events)
              </Link>
              <Link href="/catalogues" onClick={() => setMobileMenuOpen(false)} className="block text-xs text-stone-300 hover:text-white pl-2">
                📁 자료실 (Catalogues)
              </Link>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Link
                href="/shop"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center py-2.5 bg-[#14532D] text-white text-xs font-bold rounded-lg"
              >
                🛒 K-FOOD SHOP 바로가기
              </Link>
              <Link
                href="/rfq"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center py-2.5 bg-amber-600 text-white text-xs font-bold rounded-lg"
              >
                📋 B2B / RFQ 견적 신청
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
