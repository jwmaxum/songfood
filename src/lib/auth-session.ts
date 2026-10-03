import 'server-only';
import type { User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from './supabase-admin';
import { ApiError, digest, requireConfiguration, applicationOrigin } from './request-security';

export type Audience = 'customer' | 'staff';
export const sessionCookie = (audience: Audience) => audience === 'staff' ? 'sf_admin_access' : 'sf_customer_access';
export function cookieToken(request: Request, audience: Audience) {
  return request.headers.get('cookie')?.split(';').map(v => v.trim())
    .find(v => v.startsWith(sessionCookie(audience) + '='))?.slice(sessionCookie(audience).length + 1);
}
export function verifiedUser(user: User | null): user is User {
  const bannedUntil = (user as (User & { banned_until?: string }) | null)?.banned_until;
  return !!user?.email_confirmed_at && !(bannedUntil && new Date(bannedUntil).getTime() > Date.now());
}
export async function createSession(request: Request, response: NextResponse, userId: string, audience: Audience) {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
  const expires = new Date(Date.now() + 55 * 60_000);
  const { error } = await supabaseAdmin.from('b2b_sessions').insert({
    token_hash: await digest(token), user_id: userId, audience, expires_at: expires.toISOString(),
  });
  if (error) throw new ApiError(503, '세션을 저장하지 못했습니다.');
  response.cookies.set(sessionCookie(audience), token, {
    httpOnly: true, secure: new URL(applicationOrigin(request)).protocol === 'https:', sameSite: 'strict', path: '/', maxAge: 55 * 60,
  });
}
export async function sessionUser(request: Request, audience: Audience): Promise<User | null> {
  const token = cookieToken(request, audience);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  requireConfiguration();
  const { data, error } = await supabaseAdmin.from('b2b_sessions').select('user_id,expires_at')
    .eq('token_hash', await digest(token)).eq('audience', audience).maybeSingle();
  if (error) throw new ApiError(503, '세션 확인에 실패했습니다.');
  if (!data || Date.parse(data.expires_at) <= Date.now()) return null;
  const result = await supabaseAdmin.auth.admin.getUserById(data.user_id);
  if (result.error || !verifiedUser(result.data.user)) return null;
  return result.data.user;
}
export async function revokeSession(request: Request, response: NextResponse, audience: Audience) {
  const token = cookieToken(request, audience);
  if (token && /^[0-9a-f]{64}$/.test(token)) {
    requireConfiguration();
    const { error } = await supabaseAdmin.from('b2b_sessions').delete().eq('token_hash', await digest(token)).eq('audience', audience);
    if (error) throw new ApiError(503, '로그아웃을 완료하지 못했습니다. 다시 시도해 주세요.');
  }
  response.cookies.set(sessionCookie(audience), '', { httpOnly: true, secure: new URL(applicationOrigin(request)).protocol === 'https:', sameSite: 'strict', path: '/', maxAge: 0 });
}
