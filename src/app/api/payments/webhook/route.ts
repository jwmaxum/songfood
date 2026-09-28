import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Webhook processing is enabled only after signature verification and durable order updates are implemented.
export async function POST() {
  return NextResponse.json({ success: false, error: 'Webhook processing is not configured.' }, { status: 503 });
}
