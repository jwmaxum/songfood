'use client';

import React, { Suspense } from 'react';
import productsData from '@/../data/products.json';
import { ProductItem } from '@/lib/types';
import CollectionShowcaseClient from '../collections/CollectionShowcaseClient';

export default function ShopPage() {
  const products: ProductItem[] = productsData as ProductItem[];

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0c] py-24 text-center text-stone-500 font-mono">Loading Shop...</div>}>
      <CollectionShowcaseClient initialProducts={products} />
    </Suspense>
  );
}
