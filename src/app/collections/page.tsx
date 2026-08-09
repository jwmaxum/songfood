import React, { Suspense } from 'react';
import { getProducts } from '@/lib/products-db';
import CollectionShowcaseClient from './CollectionShowcaseClient';

export const metadata = {
  title: 'K-Food 프리미엄 컬렉션 | 송영민푸드 (Song Youngmin Food)',
  description:
    '대한민국 대표 프리미엄 K-Food, K-냉동식품, K-전통식품, K-간편식, K-소스, K-주류 및 명품 전통주 컬렉션 쇼케이스.',
};

export default async function CollectionsPage() {
  const initialProducts = await getProducts();

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0c] py-24 text-center text-stone-500">Loading Collections...</div>}>
      <CollectionShowcaseClient
        initialProducts={initialProducts}
      />
    </Suspense>
  );
}
