import { Metadata } from 'next';
import { getAllFoodLabels } from '@/lib/labels-db';
import AuditDashboardClient from './AuditDashboardClient';

export const metadata: Metadata = {
  title: 'QA/RA 감사 추적 & 통관 리스크 관제 센터 | 송영민푸드',
  description:
    '글로벌 식품 라벨 변경 이력(Audit Trail), 수입국 법규 개정 D-Day 모니터링, 해외 세관 통관 보류(Refusal) 리스크 예측 스코어링 시스템',
};

export const dynamic = 'force-static';

export default async function AuditDashboardPage() {
  const labels = await getAllFoodLabels();

  return <AuditDashboardClient initialLabels={labels} />;
}
