import { staffPageAccess } from '@/lib/staff-page';
import React from 'react';
import ContentBlockManager from './ContentBlockManager';

export const metadata = {
  title: '콘텐츠 블록 관리 | 송영민푸드 관리자',
  description: '콘텐츠 블록의 문구와 이미지 파일을 등록하고 수정합니다.',
};

export default async function AdminContentBlocksPage() {
  if (!(await staffPageAccess('/admin/content-blocks')).allowed) return <p className="p-8">이 페이지를 볼 수 있는 직원 권한이 필요합니다.</p>;

  return <ContentBlockManager />;
}
