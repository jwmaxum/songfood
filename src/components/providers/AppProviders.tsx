'use client';

import React from 'react';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import { PricingProvider } from '@/context/PricingContext';
import { RFQProvider } from '@/context/RFQContext';
import { CartProvider } from '@/context/CartContext';
import { AuthProvider } from '@/context/AuthContext';
import { WishlistProvider } from '@/context/WishlistContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
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
