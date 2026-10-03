'use client';

import React from 'react';
import type {Locale} from '@/lib/i18n/locale';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import { PricingProvider } from '@/context/PricingContext';
import { RFQProvider } from '@/context/RFQContext';
import { CartProvider } from '@/context/CartContext';
import { AuthProvider } from '@/context/AuthContext';
import { WishlistProvider } from '@/context/WishlistContext';

export function AppProviders({ children,initialLanguage }: { children: React.ReactNode;initialLanguage?:Locale }) {
  return (
    <LanguageProvider initialLanguage={initialLanguage}>
      <AuthProvider>
        <PricingProvider><WishlistProvider>
          <CartProvider><RFQProvider>
            {children}
          </RFQProvider></CartProvider>
        </WishlistProvider></PricingProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
