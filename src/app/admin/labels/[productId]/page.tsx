import {createLabelDrafts} from '@/lib/label-draft';
import { staffPageAccess } from '@/lib/staff-page';
import React from 'react';
import { notFound } from 'next/navigation';
import { getProductById } from '@/lib/products-db';
import { getFoodLabelsByProductId } from '@/lib/labels-db';
import { FoodLabel, ExportCountry } from '@/types/label';
import LabelStudioClient from '@/components/admin/labels/LabelStudioClient';

// Load staff-only product data per request, after the access check.

// 기본 5대국 템플릿 생성기

export default async function AdminLabelStudioPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  if (!(await staffPageAccess('/admin/labels/[productId]')).allowed) return <p className="p-8">이 페이지를 볼 수 있는 직원 권한이 필요합니다.</p>;

  const resolvedParams = await params;
  const productId = resolvedParams.productId;

  const product = await getProductById(productId);
  if (!product) {
    notFound();
  }

  // DB에서 기존 라벨들 로드
  const existingLabels = await getFoodLabelsByProductId(productId);
  const defaultLabels = createLabelDrafts(productId, product);

  // 기존 라벨이 있으면 병합
  existingLabels.forEach((lbl) => {
    if (lbl.country && defaultLabels[lbl.country]) {
      defaultLabels[lbl.country] = {
        ...defaultLabels[lbl.country],
        ...lbl,
      };
    }
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <LabelStudioClient
        product={product}
        initialLabels={defaultLabels}
      />
    </div>
  );
}
