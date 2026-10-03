import { requireCustomer } from '@/lib/customer-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { ApiError, failure, json, rateLimit, readJson, requireSameOrigin, textField, uuidField } from '@/lib/request-security';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const session = await requireCustomer(request);
    await rateLimit(request, 'company-application', 5, 3600, session.user.id);
    if (session.membership) throw new ApiError(409, '이미 회사에 소속되어 있습니다. 정보 변경은 관리자에게 문의해 주세요.');
    const body = await readJson(request, 8192);
    if (body.action === 'join') {
      const companyId = uuidField(body.companyId);
      const { error } = await supabaseAdmin.from('company_join_requests').upsert({
        company_id: companyId, user_id: session.user.id, status: 'pending',
      }, { onConflict: 'company_id,user_id', ignoreDuplicates: true });
      if (error) throw new ApiError(400, '회사 코드를 확인해 주세요.');
      return json({ success: true, message: '소속 요청을 저장했습니다. 회사 대표 담당자의 승인을 기다려 주세요.' }, 201);
    }
    const name = textField(body.name, '회사명', 200);
    const country = textField(body.country, '국가', 100, 2);
    const registrationNo = (body.registrationNo === undefined || body.registrationNo === null || body.registrationNo === '') ? null : textField(body.registrationNo, '사업자·법인 등록번호', 100, 0) || null;
    if (!['domestic','overseas'].includes(String(body.kind))) throw new ApiError(400, '거래 유형을 선택해 주세요.');
    const { data, error } = await supabaseAdmin.rpc('b2b_apply_company', {
      p_actor: session.user.id, p_name: name, p_kind: body.kind, p_country: country, p_registration_no: registrationNo,
    });
    if (error?.code === '23505') throw new ApiError(409, '이미 회사 소속이 등록되었습니다.');
    if (error) throw new ApiError(503, '회사 정보를 저장하지 못했습니다.');
    return json({ success: true, id: data, message: '회사 정보를 등록했습니다. 별도 가입 승인 없이 이용할 수 있습니다.' }, 201);
  } catch (error) { return failure(error); }
}
