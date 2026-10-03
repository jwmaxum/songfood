import React, { Suspense } from 'react';
import { getPublicProducts } from '@/lib/products-db';
import CollectionShowcaseClient from './CollectionShowcaseClient';

export const metadata = {
  title: 'K-Food 프리미엄 컬렉션 | 송영민푸드 (Song Youngmin Food)',
  description:
    '김치, 만두, 간편식, 면류, 소스, 수산가공품, 스낵, 주류와 전통차를 종류별로 탐색합니다.',
};

export default async function CollectionsPage() {
  const initialProducts = await getPublicProducts();

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0c] py-24 text-center text-stone-500">Loading Collections...</div>}>
      <CollectionShowcaseClient
        initialProducts={initialProducts}
      />
    </Suspense>
  );
}
