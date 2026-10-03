import {localeOf,localizedHref} from '@/lib/i18n/locale';
import { createAuthClient } from '@/lib/supabase-admin';
import { ApiError, applicationOrigin, emailField, failure, json, rateLimit, readJson, requireSameOrigin } from '@/lib/request-security';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const body = await readJson(request, 4096);
    const email = emailField(body.email);
    await rateLimit(request, 'email-link-ip', 10, 3600);
    await rateLimit(request, 'email-link-address', 1, 60, email);
    const { error } = await createAuthClient().auth.signInWithOtp({
      email, options: { shouldCreateUser: true,
        emailRedirectTo: new URL(body.language===undefined?'/account/confirmed':localizedHref('/account/confirmed',localeOf(body.language)), applicationOrigin(request)).toString() },
    });
    if (error) {
      if (error.status === 429) throw new ApiError(429, '인증 메일 요청이 많습니다. 잠시 후 다시 시도해 주세요.');
      throw new ApiError(503, '인증 메일을 발송하지 못했습니다. 잠시 후 다시 시도하거나 문의해 주세요.');
    }
    return json({ success: true, message: '입력하신 이메일로 인증 링크를 요청했습니다. 메일의 링크를 누르면 가입 또는 로그인이 완료됩니다. 스팸함도 확인해 주세요.' }, 202);
  } catch (error) { return failure(error); }
}
