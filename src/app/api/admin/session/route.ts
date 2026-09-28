import { NextRequest, NextResponse } from 'next/server';
import { getStaffIdentity } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
const COOKIE_NAME = 'sf_admin_access';

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ success: false }, { status: 403 });
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const staff = token ? await getStaffIdentity(request, token) : null;
  if (!staff) return NextResponse.json({ success: false, error: '활성 직원 계정이 아닙니다.' }, { status: 403 });
  const response = NextResponse.json({ success: true, email: staff.email, role: staff.role });
  response.cookies.set(COOKIE_NAME, token!, { httpOnly: true, secure: request.nextUrl.protocol === 'https:', sameSite: 'strict', path: '/', maxAge: 55 * 60 });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export async function GET(request: NextRequest) {
  const staff = await getStaffIdentity(request);
  return staff ? NextResponse.json({ success: true, email: staff.email, role: staff.role }, { headers: { 'Cache-Control': 'no-store' } })
    : NextResponse.json({ success: false }, { status: 401 });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 });
  return response;
}
