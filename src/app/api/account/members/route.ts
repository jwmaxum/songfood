import { assertApproved, requireCustomer } from '@/lib/customer-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { ApiError, emailField, failure, json, rateLimit, readJson, requireSameOrigin } from '@/lib/request-security';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const session = await requireCustomer(request);
    const companyId = assertApproved(session);
    if (session.membership?.role !== 'owner') throw new ApiError(403, '대표 담당자 권한이 필요합니다.');
    const { data, error } = await supabaseAdmin.from('company_members').select('user_id,role,status,customer_accounts(name,email)').eq('company_id', companyId);
    if (error) throw new ApiError(503, '담당자 목록을 확인하지 못했습니다.');
    const joins = await supabaseAdmin.from('company_join_requests').select('user_id,customer_accounts(name,email)').eq('company_id', companyId).eq('status','pending');
    if (joins.error) throw new ApiError(503, '소속 요청 목록을 확인하지 못했습니다.');
    return json({ success: true, members: data, requests: joins.data });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const session = await requireCustomer(request);
    assertApproved(session);
    if (session.membership?.role !== 'owner') throw new ApiError(403, '대표 담당자 권한이 필요합니다.');
    await rateLimit(request, 'member-add', 10, 3600, session.user.id);
    const body = await readJson(request, 4096);
    const { error } = await supabaseAdmin.rpc('b2b_add_company_member', { p_actor: session.user.id, p_email: emailField(body.email) });
    if (error) throw new ApiError(409, '이메일 인증과 소속 요청이 완료된 미소속 회원인지 확인해 주세요.');
    return json({ success: true }, 201);
  } catch (error) { return failure(error); }
}
