import React from 'react';
import { Metadata } from 'next';
import { getAllFoodLabels } from '@/lib/labels-db';
import { getPublicProducts } from '@/lib/products-db';
import LabelingShowcaseClient from './LabelingShowcaseClient';
import type { ExportCountry } from '@/types/label';

export const metadata: Metadata = {
  title: '수출국별 라벨 및 스펙시트 (Global Food Master Labeling) | 송영민푸드',
  description: '송영민푸드 K-Food 품목의 5대 수출 권역(미국 US FDA/USDA, 중국 GACC, 일본 소비자청, 유럽 EU EFSA, 중동 UAE MoIAT) 맞춤형 마스터 라벨링 스펙시트 및 실시간 규제 검증 시스템.',
};

export default async function FoodLabelingPage({
  searchParams,
}: {
  searchParams?: Promise<{ product?: string; country?: string; mode?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const [initialLabels, products] = await Promise.all([
    getAllFoodLabels(),
    getPublicProducts(),
  ]);

  return (
    <main>
      <LabelingShowcaseClient
        key={`${params.product || ''}-${params.country || ''}`}
        initialLabels={initialLabels}
        products={products}
        initialProductId={params.product}
        initialCountry={params.country as ExportCountry | undefined}
      />
    </main>
  );
}
