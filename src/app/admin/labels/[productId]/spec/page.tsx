import {createLabelDrafts} from '@/lib/label-draft';
import { staffPageAccess } from '@/lib/staff-page';
import React from 'react';
import { notFound } from 'next/navigation';
import { getProductById } from '@/lib/products-db';
import { getFoodLabelsByProductId } from '@/lib/labels-db';
import { FoodLabel, TargetCountry } from '@/types/label';
import SpecSheetClient from './SpecSheetClient';

// Load staff-only product data per request, after the access check.


export default async function SpecSheetPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  if (!(await staffPageAccess('/admin/labels/[productId]/spec')).allowed) return <p className="p-8">이 페이지를 볼 수 있는 직원 권한이 필요합니다.</p>;

  const { productId } = await params;
  const product = await getProductById(productId);

  if (!product) {
    notFound();
  }

  // 기존 DB 라벨 가져오기
  const labels = await getFoodLabelsByProductId(productId);
  const labelsMap = createLabelDrafts(productId, product);

  labels.forEach((l) => {
    labelsMap[l.country] = {
      ...labelsMap[l.country],
      ...l,
      header: l.header || labelsMap[l.country].header,
      pdp: l.pdp || labelsMap[l.country].pdp,
      informationPanel: l.informationPanel || labelsMap[l.country].informationPanel,
      nutrition: l.nutrition || labelsMap[l.country].nutrition,
      datingLot: l.datingLot || labelsMap[l.country].datingLot,
      barcodeMarking: l.barcodeMarking || labelsMap[l.country].barcodeMarking,
      ingredients: l.ingredients || labelsMap[l.country].ingredients,
    };
  });

  return <SpecSheetClient productId={productId} labelsMap={labelsMap} />;
}
