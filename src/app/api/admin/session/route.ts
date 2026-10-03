import { getStaffIdentity } from '@/lib/admin-auth';
import { createSession, revokeSession } from '@/lib/auth-session';
import { ApiError, failure, json, rateLimit, requireSameOrigin } from '@/lib/request-security';
export const dynamic = 'force-dynamic';
// Allows an existing verified Supabase staff invitation session to establish the application cookie.
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await rateLimit(request, 'staff-session', 20);
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const staff = token ? await getStaffIdentity(request, token) : null;
    if (!staff) throw new ApiError(403, '활성 직원 계정이 아닙니다.');
    const response = json({ success: true, email: staff.email, role: staff.role });
    await createSession(request, response, staff.id, 'staff');
    return response;
  } catch (error) { return failure(error); }
}
export async function GET(request: Request) {
  const staff = await getStaffIdentity(request);
  return staff ? json({ success: true, email: staff.email, role: staff.role }) : json({ success: false }, 401);
}
export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    const response = json({ success: true });
    await revokeSession(request, response, 'staff');
    return response;
  } catch (error) { return failure(error); }
}
