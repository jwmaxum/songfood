import { createAuthClient, supabaseAdmin } from '@/lib/supabase-admin';
import { ensureCustomerAccount } from '@/lib/customer-account';
import { createSession, verifiedUser } from '@/lib/auth-session';
import { ApiError, emailField, failure, json, rateLimit, readJson, requireSameOrigin } from '@/lib/request-security';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await rateLimit(request, 'login-ip', 30);
    const body = await readJson(request, 4096);
    const email = emailField(body.email);
    if (typeof body.password !== 'string' || body.password.length < 1 || body.password.length > 128) throw new ApiError(400, '비밀번호를 확인해 주세요.');
    const audience = body.audience === 'staff' ? 'staff' : 'customer';
    await rateLimit(request, 'login-email', 5, 900, email);
    const { data, error } = await createAuthClient().auth.signInWithPassword({ email, password: body.password });
    if (error || !verifiedUser(data.user)) throw new ApiError(401, '이메일·비밀번호 또는 이메일 인증 상태를 확인해 주세요.');
    if (audience === 'staff') {
      const result = await supabaseAdmin.from('user_profiles').select('role,status').eq('id', data.user.id).maybeSingle();
      if (result.error) throw new ApiError(503, '직원 정보 확인에 실패했습니다.');
      if (result.data?.status !== 'active' || !['admin','product_staff','inquiry_staff','order_staff'].includes(result.data.role))
        throw new ApiError(403, '활성 직원 권한이 필요합니다.');
    } else {
      await ensureCustomerAccount(data.user);
    }
    const response = json({ success: true });
    await createSession(request, response, data.user.id, audience);
    return response;
  } catch (error) { return failure(error); }
}
