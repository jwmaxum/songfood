import { json } from '@/lib/request-security';
export const dynamic = 'force-dynamic';
// B2B-06 must implement server-owned orders, amount verification and idempotent settlement first.
export async function POST() {
  return json({ success: false, error: '온라인 결제는 아직 제공하지 않습니다. 도매 주문 문의를 이용해 주세요.' }, 503);
}
