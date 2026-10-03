import React, { Suspense } from 'react';
import { getPublicProducts } from '@/lib/products-db';
import CollectionShowcaseClient from '../collections/CollectionShowcaseClient';

export default async function ShopPage() {
  const products = await getPublicProducts();

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0c] py-24 text-center text-stone-500 font-mono">Loading Shop...</div>}>
      <CollectionShowcaseClient initialProducts={products} />
    </Suspense>
  );
}
