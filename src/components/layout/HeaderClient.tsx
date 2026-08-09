'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MenuItem } from '@/lib/types';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useWishlist } from '@/context/WishlistContext';
import LanguageSelector from './LanguageSelector';
import { Menu, X, ChevronDown, Search, Shield, Heart, User, ShoppingBag, Globe, Store, Building2, FileText } from 'lucide-react';

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

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMobileMenu, setExpandedMobileMenu] = useState<string | null>(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.success) {
          setSearchResults(data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const renderSearchDropdown = (isMobile = false) => {
    if (!isSearchFocused && !searchQuery && !isMobile) return null;
    if (!isSearchFocused) return null;

    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-stone-200 shadow-2xl rounded-lg p-4 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
        {!searchQuery.trim() ? (
          <div>
            <div className="text-[10px] tracking-[0.18em] uppercase font-extrabold text-[#14532D] mb-3 pb-1 border-b border-stone-100 font-jakarta">
              Popular Searches
            </div>
            <div className="flex flex-wrap gap-2">
              {['Tomato', 'Olive Oil', 'Turkish Coffee', 'Cheese', 'Dates'].map(term => (
                <button
                  key={term}
                  onClick={() => { setSearchQuery(term); setIsSearchFocused(true); }}
                  className="px-3 py-1.5 bg-[#FAFAF8] border border-stone-200 hover:border-[#14532D] hover:bg-[#14532D] hover:text-white rounded-md text-xs font-medium text-stone-700 transition-all duration-150"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
             <div className="text-[10px] tracking-[0.18em] uppercase font-extrabold text-[#14532D] mb-3 pb-1 border-b border-stone-100 font-jakarta">
              {isSearching ? 'Searching...' : 'Search Results'}
            </div>
            {searchResults.length > 0 ? (
               <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                 {searchResults.map(product => (
                   <Link 
                     key={product.id} 
                     href={`/products/${product.id}`}
                     onClick={() => { setIsSearchFocused(false); setMobileSearchOpen(false); }}
                     className="flex items-center space-x-3 p-2 hover:bg-[#FAFAF8] rounded-md transition-colors border border-transparent hover:border-stone-200"
                   >
                     <img src={product.image_url} alt={product.name} className="w-10 h-10 object-cover rounded" />
                     <div className="flex-1 overflow-hidden">
                       <p className="text-xs font-medium text-stone-800 truncate">{product.name}</p>
                       <p className="text-[11px] font-bold text-[#14532D]">${product.price}</p>
                     </div>
                   </Link>
                 ))}
               </div>
            ) : (
               !isSearching && <div className="text-xs text-stone-500 py-2">No products found for &quot;{searchQuery}&quot;.</div>
            )}
          </div>
        )}
      </div>
    );
  };

  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Active menu hover image preview (Anatolia megamenu feature)
  const activeParentMenu = menus.find((m) => m.id === activeMenuId);

  const toggleMobileAccordion = (id: string) => {
    setExpandedMobileMenu((prev) => (prev === id ? null : id));
  };

  return (
    <header className="sticky top-0 z-50 w-full glass-header transition-all duration-300">
      {/* 3-Hub Business Navigation Bar */}
      <div className="bg-[#0A0A0C] text-stone-200 border-b border-stone-800/60 py-1.5 px-4 text-xs font-medium">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2">
          {/* 2-Hub Business Navigation Bar */}
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

      {/* Main Header Row 1: Logo | Centered Search | Action Icons */}
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

          {/* Center: Search Bar (Absolute centered on desktop) */}
          <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 w-full max-w-md xl:max-w-lg items-center z-20 pointer-events-auto" ref={searchRef}>
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder={t('search_placeholder', '만두, 원소주, 막걸리, 떡볶이, 치킨 검색...')}
                className="w-full bg-white border-2 border-stone-200 rounded-full py-2.5 pl-5 pr-12 text-sm text-stone-800 focus:outline-none focus:border-[#14532D] focus:ring-2 focus:ring-[#14532D]/20 transition-all placeholder:text-stone-400 shadow-sm"
              />
              <button className="absolute right-4 top-1/2 -translate-y-1/2 text-[#14532D] hover:text-[#EAB308] transition-colors" aria-label="Submit Search">
                <Search size={18} />
              </button>
              
              {/* Desktop Autocomplete Dropdown */}
              {renderSearchDropdown()}
            </div>
          </div>

          {/* Right Action Icons (Account, Wishlist, Cart) */}
          <div className="flex items-center space-x-3 sm:space-x-4 z-20">
            {/* Mobile Search Icon */}
            <button
              className="lg:hidden p-2 text-stone-700 hover:text-[#14532D] transition-colors"
              aria-label="Search"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            >
              <Search size={20} />
            </button>

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

      {/* Row 2 GNB Navigation Bar removed as per user request */}

      {/* Mobile Search Overlay */}
      {mobileSearchOpen && (
        <div className="lg:hidden absolute top-20 inset-x-0 bg-[#FAFAF8] border-b border-stone-200 shadow-xl p-4 animate-in slide-in-from-top-2 duration-200 z-40" ref={mobileSearchRef}>
          <div className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder={t('search_placeholder', 'Search...')}
              className="w-full bg-white border border-stone-200 rounded-full py-2.5 pl-4 pr-10 text-sm text-stone-800 focus:outline-none focus:border-[#14532D] focus:ring-2 focus:ring-[#14532D]/20 transition-all"
              autoFocus
            />
            <button className="absolute right-4 top-1/2 -translate-y-1/2 text-[#14532D] hover:text-[#EAB308] transition-colors">
              <Search size={18} />
            </button>
            
            {/* Mobile Autocomplete Dropdown */}
            {renderSearchDropdown(true)}
          </div>
        </div>
      )}

      {/* Mobile Hamburger Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-[108px] bg-[#0d110e]/98 border-b border-emerald-900/40 shadow-2xl backdrop-blur-xl animate-in slide-in-from-top duration-300 max-h-[calc(100vh-108px)] overflow-y-auto">
          <div className="px-6 py-6 space-y-4">
            {menus.map((parent) => {
              const hasChildren = parent.children && parent.children.length > 0;
              const isExpanded = expandedMobileMenu === parent.id;

              return (
                <div key={parent.id} className="border-b border-emerald-900/30 pb-3">
                  <div className="flex justify-between items-center">
                    <Link
                      href={parent.url}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-sm font-medium uppercase tracking-[0.15em] text-stone-200 hover:text-[#c59b27] transition-colors"
                    >
                      {parent.title}
                    </Link>
                    {hasChildren && (
                      <button
                        onClick={() => toggleMobileAccordion(parent.id)}
                        className="p-2 text-stone-400 hover:text-[#c59b27]"
                      >
                        <ChevronDown
                          size={18}
                          className={`transition-transform duration-200 ${
                            isExpanded ? 'rotate-180 text-[#c59b27]' : ''
                          }`}
                        />
                      </button>
                    )}
                  </div>

                  {/* Depth 2 Accordion List */}
                  {hasChildren && isExpanded && (
                    <div className="mt-2.5 ml-4 pl-3 border-l border-[#c59b27]/30 space-y-2 py-1">
                      {parent.children?.map((child) => (
                        <Link
                          key={child.id}
                          href={child.url}
                          onClick={() => setMobileMenuOpen(false)}
                          className="block text-xs tracking-wider text-stone-400 hover:text-white py-1"
                        >
                          {child.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Mobile Admin Link */}
            <div className="pt-4">
              <Link
                href="/admin/navigation"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center w-full py-2.5 px-4 bg-[#c59b27]/15 border border-[#c59b27]/40 rounded text-xs font-semibold tracking-wider text-[#c59b27] hover:bg-[#c59b27] hover:text-black transition-all"
              >
                Go to Admin Navigation Manager
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
