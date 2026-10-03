import { staffPageAccess } from '@/lib/staff-page';
import PageContent from './PageContent';
export default async function Page({searchParams}:{searchParams:Promise<{inquiry?:string}>}) {
  if (!(await staffPageAccess('/admin/crm')).allowed) return <p className="p-8">이 페이지를 볼 수 있는 직원 권한이 필요합니다.</p>;
  const {inquiry}=await searchParams;return <PageContent initialId={inquiry&&/^[a-f0-9-]{36}$/i.test(inquiry)?inquiry:undefined} />;
}
