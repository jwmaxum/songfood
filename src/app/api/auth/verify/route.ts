import { createAuthClient } from '@/lib/supabase-admin';
import { createSession, verifiedUser } from '@/lib/auth-session';
import {getStaffIdentity} from '@/lib/admin-auth';
import { ensureCustomerAccount } from '@/lib/customer-account';
import { ApiError, failure, json, rateLimit, readJson, requireSameOrigin } from '@/lib/request-security';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const body = await readJson(request, 16384);
    if (typeof body.accessToken !== 'string' || body.accessToken.length < 20 || body.accessToken.length > 12000)
      throw new ApiError(400, '인증 링크를 다시 요청해 주세요.');
    await rateLimit(request, 'email-verify-ip', 30, 900);
    // Validate with Supabase Auth; never trust browser-supplied identity, role or company.
    const { data, error } = await createAuthClient().auth.getUser(body.accessToken);
    if (error || !verifiedUser(data.user)) throw new ApiError(401, '인증 링크가 만료되었거나 유효하지 않습니다. 새 링크를 요청해 주세요.');
    await ensureCustomerAccount(data.user);
    const staff=await getStaffIdentity(request,body.accessToken);
    const response = json({ success: true, staff:!!staff });
    await createSession(request, response, data.user.id, 'customer');
    if(staff)await createSession(request,response,staff.id,'staff');
    return response;
  } catch (error) { return failure(error); }
}
