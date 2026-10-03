import { json } from '@/lib/request-security';
export const dynamic = 'force-dynamic';
// Bank deposits are confirmed only by authorized staff through the order transaction RPC.
export async function POST() {
  return json({ success: false, error: '카드 결제는 제공하지 않습니다. 내 주문에서 확정 금액과 계좌입금 안내를 확인해 주세요.' }, 503);
}
