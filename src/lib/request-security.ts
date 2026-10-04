import 'server-only';
import {reportOperationalFailure} from './operational-error';
import { NextResponse } from 'next/server';
import { isAuthConfigured, supabaseAdmin } from './supabase-admin';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}
export function failure(error: unknown) {
  reportOperationalFailure('service',error instanceof ApiError?error.status:503);
  if (error instanceof ApiError) return json({ success: false, error: error.message }, error.status);
  // Deliberately exclude request bodies, provider errors, tokens and personal data.
  return json({ success: false, error: '서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, 503);
}
export function requireConfiguration() {
  if (!isAuthConfigured()) throw new ApiError(503, '회원·문의 서비스 연결이 준비되지 않았습니다. 관리자에게 문의해 주세요.');
}
export function applicationOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname))) return url.origin;
    } catch { /* Invalid origin must fail closed. */ }
    throw new ApiError(503, '사이트 접속 주소 설정을 확인해 주세요.');
  }
  if (process.env.NODE_ENV === 'production') throw new ApiError(503, '사이트 접속 주소가 설정되지 않았습니다.');
  return new URL(request.url).origin;
}
export function requireSameOrigin(request: Request, allowBearer = false) {
  const origin = request.headers.get('origin');
  if (origin === applicationOrigin(request)) return;
  if (!origin && allowBearer && /^Bearer\s+\S+$/.test(request.headers.get('authorization') || '')) return;
  throw new ApiError(403, '요청 출처를 확인할 수 없습니다. 사이트에서 다시 시도해 주세요.');
}
export async function readJson(request: Request, limit = 32_768): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new ApiError(415, 'JSON 요청이 필요합니다.');
  const length = Number(request.headers.get('content-length') || 0);
  if (length > limit) throw new ApiError(413, '요청 내용이 너무 큽니다.');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, '요청 내용이 없습니다.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new ApiError(413, '요청 내용이 너무 큽니다.'); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, '요청 형식을 확인해 주세요.');
  } finally { reader.releaseLock(); }
}
export function textField(value: unknown, name: string, max: number, min = 1) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max)
    throw new ApiError(400, name + ' 항목을 확인해 주세요.');
  return value.trim();
}
export function emailField(value: unknown) {
  const email = textField(value, '이메일', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, '이메일을 확인해 주세요.');
  return email;
}
export function uuidField(value: unknown) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
    throw new ApiError(400, '식별자를 확인해 주세요.');
  return value;
}
export async function digest(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}
export async function rateLimit(request: Request, scope: string, max = 10, seconds = 900, identity?: string) {
  requireConfiguration();
  // Unknown deployments share a conservative bucket; never trust arbitrary forwarding headers.
  const client = process.env.TRUST_CLOUDFLARE_IP === '1'
    ? request.headers.get('cf-connecting-ip') || 'unknown' : 'shared';
  const key = await digest((process.env.SUPABASE_SERVICE_ROLE_KEY || '') + ':' + scope + ':' + (identity || client));
  const { data, error } = await supabaseAdmin.rpc('b2b_consume_rate_limit', { p_key: key, p_limit: max, p_seconds: seconds });
  if (error) throw new ApiError(503, '요청 보호 서비스가 준비되지 않았습니다.');
  if (data !== true) throw new ApiError(429, '요청이 많습니다. 잠시 후 다시 시도해 주세요.');
}
