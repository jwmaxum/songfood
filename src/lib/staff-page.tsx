import 'server-only';
import { cookies } from 'next/headers';
import { getStaffIdentity } from './admin-auth';
import { pageRoles } from './staff-permissions';
export async function staffPageAccess(path: string) {
  const token = (await cookies()).get('sf_admin_access')?.value || '';
  const staff = await getStaffIdentity(new Request('https://admin.local/', { headers: { Cookie: 'sf_admin_access=' + token } }));
  return { staff, allowed: !!staff && pageRoles(path).includes(staff.role) };
}
