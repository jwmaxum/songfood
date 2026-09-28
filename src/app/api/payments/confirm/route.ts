import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) return NextResponse.json({ success: false, message: '결제 서비스가 아직 설정되지 않았습니다.' }, { status: 503 });
  try {
    const { paymentKey, orderId, amount } = await request.json();
    if (typeof paymentKey !== 'string' || typeof orderId !== 'string' || !Number.isSafeInteger(amount) || amount <= 0) {
      return NextResponse.json({ success: false, message: '결제 승인 값이 올바르지 않습니다.' }, { status: 400 });
    }
    const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ success: false, message: '결제 승인이 거절되었습니다.', data }, { status: response.status });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Payment confirmation failed', error);
    return NextResponse.json({ success: false, message: '결제 승인에 실패했습니다.' }, { status: 502 });
  }
}
