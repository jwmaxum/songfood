import { NextResponse } from 'next/server';
import { supabaseAdmin } from './supabase';

export type StaffRole = 'admin' | 'product_staff' | 'inquiry_staff' | 'order_staff';

export async function getStaffIdentity(request: Request, tokenOverride?: string): Promise<{ id: string; email: string; role: StaffRole } | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const cookie = request.headers.get('cookie')?.split(';').map((part) => part.trim()).find((part) => part.startsWith('sf_admin_access='))?.slice('sf_admin_access='.length);
  const token = tokenOverride || bearer || cookie;
  if (!token) return null;
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) return null;
  const { data: profile, error: profileError } = await supabaseAdmin.from('user_profiles')
    .select('role,status').eq('id', userData.user.id).maybeSingle();
  if (profileError || profile?.status !== 'active') return null;
  if (!['admin', 'product_staff', 'inquiry_staff', 'order_staff'].includes(profile.role)) return null;
  return { id: userData.user.id, email: userData.user.email || '', role: profile.role as StaffRole };
}

export async function requireStaff(request: Request, allowedRoles: StaffRole[] = ['admin']): Promise<NextResponse | null> {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ success: false, error: '요청 출처가 일치하지 않습니다.' }, { status: 403 });
  }
  const identity = await getStaffIdentity(request);
  if (!identity || !allowedRoles.includes(identity.role)) {
    return NextResponse.json({ success: false, error: '직원 인증 또는 권한이 필요합니다.' }, { status: 403 });
  }
  return null;
}
