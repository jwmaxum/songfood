import 'server-only';
import { supabaseAdmin } from './supabase-admin';
import { sessionUser } from './auth-session';
import { ApiError } from './request-security';
import type { Company, CustomerSession, Membership } from './b2b-types';

export async function requireCustomer(request: Request): Promise<CustomerSession> {
  const user = await sessionUser(request, 'customer');
  if (!user) throw new ApiError(401, '로그인이 필요하거나 세션이 만료되었습니다.');
  const { data: account, error } = await supabaseAdmin.from('customer_accounts').select('name,status').eq('id', user.id).maybeSingle();
  if (error) throw new ApiError(503, '회원 정보 확인에 실패했습니다.');
  if (!account || account.status !== 'active') throw new ApiError(403, '이용이 중지된 계정입니다. 관리자에게 문의해 주세요.');
  const memberResult = await supabaseAdmin.from('company_members').select('company_id,role,status').eq('user_id', user.id).maybeSingle();
  if (memberResult.error) throw new ApiError(503, '회사 소속 확인에 실패했습니다.');
  const membership = memberResult.data as Membership | null;
  let company: Company | null = null;
  if (membership) {
    const result = await supabaseAdmin.from('companies').select('id,name,kind,country,registration_no,status,created_at')
      .eq('id', membership.company_id).maybeSingle();
    if (result.error || !result.data) throw new ApiError(503, '회사 확인에 실패했습니다.');
    company = result.data as Company;
  }
  return { user: { id: user.id, email: user.email || '', name: account.name }, membership, company };
}
export function assertApproved(session: CustomerSession, companyId?: string) {
  if (!session.company || session.company.status !== 'approved' || session.membership?.status !== 'active')
    throw new ApiError(403, '승인된 회사의 활성 담당자만 이용할 수 있습니다.');
  if (companyId && session.company.id !== companyId) throw new ApiError(404, '자료를 찾을 수 없습니다.');
  return session.company.id;
}
export async function customerInquiries(request: Request, id?: string) {
  const session = await requireCustomer(request);
  let query = supabaseAdmin.from('commercial_inquiries')
    .select('id,kind,status,items,created_at,updated_at');
  if (session.company?.status === 'approved' && session.membership?.status === 'active') {
    query = query.or('company_id.eq.' + session.company.id + ',and(company_id.is.null,submitted_by.eq.' + session.user.id + ')');
  } else {
    query = query.is('company_id', null).eq('submitted_by', session.user.id);
  }
  if (id) query = query.eq('id', id);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(100);
  if (error) throw new ApiError(503, '문의 내역을 불러오지 못했습니다.');
  if (id && !data?.length) throw new ApiError(404, '자료를 찾을 수 없습니다.');
  const ids=(data||[]).map(i=>i.id);
  if(!ids.length)return [];
  const activities=await supabaseAdmin.from('b2b_inquiry_activities').select('inquiry_id,id,event,message,created_at').in('inquiry_id',ids).eq('visibility','customer').order('created_at',{ascending:false}).limit(1000);
  if(activities.error)throw new ApiError(503,'문의 진행 내역을 불러오지 못했습니다.');
  return data!.map(i=>({...i,activities:activities.data.filter(a=>a.inquiry_id===i.id).slice(0,20)}));
}
