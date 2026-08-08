import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { eventType, data } = payload || {};

    console.log('Received Toss Payments Webhook:', eventType, data);

    // Handle Virtual Account Deposit Event (가상계좌 입금 완료 통보)
    if (eventType === 'DEPOSIT_CALLBACK') {
      const { orderId, status, secret } = data || {};
      console.log(`Virtual Account Deposit Completed: orderId=${orderId}, status=${status}`);
      // In production DB, update order status to PAID
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error: any) {
    console.error('Toss Payments Webhook error:', error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
