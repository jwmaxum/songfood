import { cookies } from 'next/headers';
import { getStaffIdentity } from '@/lib/admin-auth';
import UsersManager from './UsersManager';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const token = (await cookies()).get('sf_admin_access')?.value;
  const staff = token ? await getStaffIdentity(new Request('https://admin.local/', { headers: { Authorization: `Bearer ${token}` } })) : null;
  if (staff?.role !== 'admin') return <main className="p-8">관리자 권한이 필요합니다.</main>;
  return <UsersManager />;
}
