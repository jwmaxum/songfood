import 'server-only';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from './supabase-admin';
import { sessionUser, verifiedUser } from './auth-session';
import { requireSameOrigin } from './request-security';
export type StaffRole = 'admin' | 'product_staff' | 'inquiry_staff' | 'order_staff';
export async function getStaffIdentity(request: Request, tokenOverride?: string): Promise<{ id: string; email: string; role: StaffRole } | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const bearer = tokenOverride || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const user = bearer ? (await supabaseAdmin.auth.getUser(bearer)).data.user : await sessionUser(request, 'staff');
    if (!verifiedUser(user)) return null;
    const { data: profile, error } = await supabaseAdmin.from('user_profiles').select('role,status').eq('id', user.id).maybeSingle();
    if (error || profile?.status !== 'active' || !['admin','product_staff','inquiry_staff','order_staff'].includes(profile.role)) return null;
    return { id: user.id, email: user.email || '', role: profile.role as StaffRole };
  } catch { return null; }
}
export async function requireStaff(request: Request, allowedRoles: StaffRole[] = ['admin']): Promise<NextResponse | null> {
  if (!['GET','HEAD','OPTIONS'].includes(request.method)) {
    try { requireSameOrigin(request, true); }
    catch { return NextResponse.json({ success: false, error: '요청 출처가 일치하지 않습니다.' }, { status: 403 }); }
  }
  const identity = await getStaffIdentity(request);
  if (!identity || !allowedRoles.includes(identity.role))
    return NextResponse.json({ success: false, error: '직원 인증 또는 권한이 필요합니다.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  return null;
}
