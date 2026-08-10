import React from 'react';
import MediaLabUnifiedManager from '../media-lab/MediaLabUnifiedManager';

export const metadata = {
  title: '미디어랩 통합 CMS | 송영민푸드 관리자',
  description: '뉴스&이벤트 에디터, 자료실 카탈로그 관리 및 미디어 라이브러리 CDN 통합 관리 센터.',
};

export default function AdminMediaPage() {
  return <MediaLabUnifiedManager />;
}
