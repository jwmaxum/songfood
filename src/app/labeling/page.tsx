import React from 'react';
import { Metadata } from 'next';
import { getAllFoodLabels } from '@/lib/labels-db';
import LabelingShowcaseClient from './LabelingShowcaseClient';

export const metadata: Metadata = {
  title: '글로벌 식품 마스터 라벨링 시스템 (Global Food Master Labeling) | 송영민푸드',
  description: '송영민푸드(Song Youngmin Food) 300여 개 K-Food 품목의 5대 수출 권역(미국 US FDA/USDA, 중국 GACC, 일본 소비자청, 유럽 EU EFSA, 중동 UAE MoIAT) 맞춤형 마스터 라벨링 스펙시트 및 실시간 규제 검증 시스템.',
  keywords: [
    '식품 라벨링 시스템',
    'Food Master Labeling',
    'K-Food Export Label',
    'FDA Nutrition Facts',
    'GACC 등록 라벨',
    '할랄 인증 라벨',
    'EU 식품표시 규정',
    '송영민푸드 라벨링'
  ],
  openGraph: {
    title: '글로벌 식품 마스터 라벨링 시스템 | 송영민푸드',
    description: '5대 수출 대상국(미국, 중국, 일본, EU, UAE) 규제 100% 준수 마스터 라벨 스펙시트 및 바이어 제출용 규격 생성.',
    type: 'website',
  },
};

export default async function FoodLabelingPage() {
  const initialLabels = await getAllFoodLabels();

  return (
    <main>
      <LabelingShowcaseClient initialLabels={initialLabels} />
    </main>
  );
}
