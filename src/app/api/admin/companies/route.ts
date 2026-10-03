import { getStaffIdentity, requireStaff } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { ApiError, failure, json, readJson, textField, uuidField } from '@/lib/request-security';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const denied = await requireStaff(request);
  if (denied) return denied;
  try {
    const company=new URL(request.url).searchParams.get('company');
    let query=supabaseAdmin.from('companies')
      .select('id,name,kind,country,registration_no,status,created_at,review_reason,company_members(user_id,role,status,customer_accounts(name,email))')
      .order('created_at',{ascending:false}).limit(200);
    if(company)query=query.eq('id',uuidField(company));
    const {data,error}=await query;
    if (error) throw error;
    return json({ success: true, companies: data });
  } catch (error) { return failure(error); }
}
export async function PATCH(request: Request) {
  const denied = await requireStaff(request);
  if (denied) return denied;
  try {
    const actor = await getStaffIdentity(request);
    if (!actor) throw new ApiError(403, '직원 인증이 필요합니다.');
    const body = await readJson(request, 8192);
    const companyId = uuidField(body.companyId);
    const memberId = body.memberId ? uuidField(body.memberId) : null;
    const statuses = memberId ? ['active','suspended'] : ['approved','rejected','suspended'];
    if (!statuses.includes(String(body.status))) throw new ApiError(400, '상태를 확인해 주세요.');
    const { error } = await supabaseAdmin.rpc('b2b_review_access', {
      p_actor: actor.id, p_company: companyId, p_status: body.status,
      p_reason: textField(body.reason,'승인·변경 사유',1000,3), p_member: memberId,
    });
    if (error) throw error;
    return json({ success: true });
  } catch (error) { return failure(error); }
}
