import { staffPageAccess } from '@/lib/staff-page';
import React from 'react';
import HeroManager from './HeroManager';

export const metadata = {
  title: '히어로 비디오 & 슬라이더 CMS | 송영민푸드 관리자',
  description: '송영민푸드 메인 랜딩 비주얼, MP4 동영상 및 이미지 슬라이더, 카피 문구 CMS.',
};

export default async function AdminHeroPage() {
  if (!(await staffPageAccess('/admin/hero')).allowed) return <p className="p-8">이 페이지를 볼 수 있는 직원 권한이 필요합니다.</p>;

  return <HeroManager />;
}
