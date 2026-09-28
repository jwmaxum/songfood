import { NextRequest, NextResponse } from 'next/server';
import { getStaffIdentity, requireStaff } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const denied = await requireStaff(request, ['admin']);
  if (denied) return denied;
  const { data, error } = await supabaseAdmin.from('user_profiles').select('id,email,name,role,status,created_at').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: '직원 목록 조회 실패' }, { status: 503 });
  return NextResponse.json({ data }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(request: NextRequest) {
  const denied = await requireStaff(request, ['admin']);
  if (denied) return denied;
  const body = await request.json();
  if (typeof body.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.id)) return NextResponse.json({ error: '직원 ID가 올바르지 않습니다.' }, { status: 400 });
  const update: Record<string, string> = {};
  if (body.role !== undefined) {
    if (!['admin', 'product_staff', 'inquiry_staff', 'order_staff', 'viewer'].includes(body.role)) return NextResponse.json({ error: '역할이 올바르지 않습니다.' }, { status: 400 });
    update.role = body.role;
  }
  if (body.status !== undefined) {
    if (!['active', 'suspended'].includes(body.status)) return NextResponse.json({ error: '상태가 올바르지 않습니다.' }, { status: 400 });
    update.status = body.status;
  }
  if (!Object.keys(update).length) return NextResponse.json({ error: '변경할 값이 없습니다.' }, { status: 400 });
  const actor = await getStaffIdentity(request);
  if (actor?.id === body.id && (update.role && update.role !== 'admin' || update.status === 'suspended')) {
    return NextResponse.json({ error: '자기 자신의 관리자 권한을 해제할 수 없습니다.' }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin.from('user_profiles').update(update).eq('id', body.id).select('id,email,name,role,status').maybeSingle();
  if (error || !data) return NextResponse.json({ error: '직원 정보를 변경하지 못했습니다.' }, { status: 503 });
  return NextResponse.json({ data });
}
