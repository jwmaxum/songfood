import { getStaffIdentity, requireStaff } from '@/lib/admin-auth';
import { createAuthClient, supabaseAdmin } from '@/lib/supabase-admin';
import { ApiError, failure, json, rateLimit, readJson } from '@/lib/request-security';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  const denied = await requireStaff(request, ['admin','product_staff','inquiry_staff','order_staff']);
  if (denied) return denied;
  try {
    const staff = await getStaffIdentity(request);
    if (!staff) throw new ApiError(401,'다시 로그인해 주세요.');
    await rateLimit(request,'staff-password',5,900,staff.id);
    const body = await readJson(request,4096);
    if (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 128
      || typeof body.currentPassword !== 'string' || body.currentPassword.length > 128)
      throw new ApiError(400,'비밀번호를 확인해 주세요. 새 비밀번호는 12~128자입니다.');
    const verification = await createAuthClient().auth.signInWithPassword({ email:staff.email,password:body.currentPassword });
    if (verification.error || verification.data.user?.id !== staff.id) throw new ApiError(401,'현재 비밀번호가 일치하지 않습니다.');
    const changed = await supabaseAdmin.auth.admin.updateUserById(staff.id,{password:body.password});
    if (changed.error) throw new ApiError(503,'비밀번호 변경에 실패했습니다.');
    const revoked = await supabaseAdmin.from('b2b_sessions').delete().eq('user_id',staff.id);
    if (revoked.error) throw new ApiError(503,'비밀번호가 변경되었으나 세션 종료에 실패했습니다. 관리자에게 문의해 주세요.');
    const response = json({success:true});
    response.cookies.set('sf_admin_access','',{httpOnly:true,path:'/',maxAge:0});
    return response;
  } catch(error) { return failure(error); }
}
