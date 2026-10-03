import { cookies } from 'next/headers';
import { getStaffIdentity } from '@/lib/admin-auth';
import AdminLogin from './AdminLogin';
import AdminShell from './AdminShell';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get('sf_admin_access')?.value;
  const staff = token ? await getStaffIdentity(new Request('https://admin.local/', { headers: { Cookie: `sf_admin_access=${token}` } })) : null;
  if (!staff) return <AdminLogin />;
  return <AdminShell email={staff.email} role={staff.role}>{children}</AdminShell>;
}
