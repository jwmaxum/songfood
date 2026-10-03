import { staffPageAccess } from '@/lib/staff-page';
import { cookies } from 'next/headers';
import { getStaffIdentity } from '@/lib/admin-auth';
import UsersManager from './UsersManager';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  if (!(await staffPageAccess('/admin/users')).allowed) return <p className="p-8">이 페이지를 볼 수 있는 직원 권한이 필요합니다.</p>;

  const token = (await cookies()).get('sf_admin_access')?.value;
  const staff = token ? await getStaffIdentity(new Request('https://admin.local/', { headers: { Authorization: `Bearer ${token}` } })) : null;
  if (staff?.role !== 'admin') return <main className="p-8">관리자 권한이 필요합니다.</main>;
  return <UsersManager />;
}
