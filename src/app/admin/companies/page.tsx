import { staffPageAccess } from '@/lib/staff-page';
import PageContent from './PageContent';
export default async function Page({searchParams}:{searchParams:Promise<{company?:string}>}) {
  if (!(await staffPageAccess('/admin/companies')).allowed) return <p className="p-8">이 페이지를 볼 수 있는 직원 권한이 필요합니다.</p>;
  const {company}=await searchParams;return <PageContent companyId={company&&/^[a-f0-9-]{36}$/i.test(company)?company:undefined} />;
}
