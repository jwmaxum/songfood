import { staffPageAccess } from '@/lib/staff-page';
import React from 'react';
import ProductManager from './ProductManagerV2';

export const metadata = {
  title: 'K-푸드 & 주류 제품 관리 | 송영민푸드 관리자',
  description: '송영민푸드 제품 분류, 식품 표시 정보, 이미지와 도매·수출 정보 관리.',
};

export default async function AdminProductsPage() {
  if (!(await staffPageAccess('/admin/products')).allowed) return <p className="p-8">이 페이지를 볼 수 있는 직원 권한이 필요합니다.</p>;

  return <ProductManager />;
}
