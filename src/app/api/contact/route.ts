import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const denied = await requireStaff(request, ['admin', 'inquiry_staff']);
  if (denied) return denied;
  const { data, error } = await supabaseAdmin.from('contact_inquiries').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) return NextResponse.json({ success: false, error: '문의 조회 실패' }, { status: 503 });
  return NextResponse.json({ success: true, inquiries: data, unread_count: data.filter((item) => item.status === 'unread').length }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim();
    const message = String(body.message || '').trim();
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || !message || name.length > 120 || email.length > 254 || message.length > 10000) {
      return NextResponse.json({ success: false, error: '이름, 이메일, 문의 내용을 확인해 주세요.' }, { status: 400 });
    }
    const { error } = await supabaseAdmin.from('contact_inquiries').insert({
      name, email, message,
      phone: String(body.phone || '').trim().slice(0, 50),
      company: String(body.company || '').trim().slice(0, 200),
      subject: String(body.subject || '일반 문의').trim().slice(0, 200),
    });
    if (error) throw error;
    return NextResponse.json({ success: true, message: '문의가 접수되었습니다.' }, { status: 201 });
  } catch (error) {
    console.error('Contact submission failed', error);
    return NextResponse.json({ success: false, error: '문의 접수에 실패했습니다.' }, { status: 503 });
  }
}
