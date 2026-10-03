import { staffPageAccess } from '@/lib/staff-page';
import PageContent from './PageContent';
export default async function Page() {
  if (!(await staffPageAccess('/admin/account')).allowed) return <p className="p-8">이 페이지를 볼 수 있는 직원 권한이 필요합니다.</p>;
  return <PageContent />;
}
