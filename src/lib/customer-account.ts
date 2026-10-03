import 'server-only';
import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabase-admin';
import { ApiError } from './request-security';
export async function ensureCustomerAccount(user: User) {
  if (!user.email) throw new ApiError(401, '이메일 인증이 필요합니다.');
  const result = await supabaseAdmin.from('customer_accounts').upsert({
    id: user.id, email: user.email.toLowerCase(),
    name: String(user.user_metadata?.name || user.email.split('@')[0]).trim().slice(0,120) || '회원',
  }, { onConflict: 'id', ignoreDuplicates: true });
  if (result.error) throw new ApiError(503, '회원 정보 저장에 실패했습니다.');
  const account = await supabaseAdmin.from('customer_accounts').select('status').eq('id', user.id).single();
  if (account.error) throw new ApiError(503, '회원 정보 확인에 실패했습니다.');
  if (account.data.status !== 'active') throw new ApiError(403, '이용이 중지된 계정입니다.');
}
