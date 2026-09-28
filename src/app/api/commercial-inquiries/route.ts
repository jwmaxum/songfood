import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/admin-auth';
import { INQUIRY_STATUSES, parseCommercialInquiry } from '@/lib/commercial-inquiry';
import { getProducts } from '@/lib/products-db';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const denied = await requireStaff(request, ['admin', 'inquiry_staff']);
  if (denied) return denied;
  const { data, error } = await supabaseAdmin.from('commercial_inquiries').select('*').order('created_at', { ascending: false }).limit(500);
  if (error) return NextResponse.json({ success: false, error: '문의 목록 조회에 실패했습니다.' }, { status: 503 });
  return NextResponse.json({ success: true, inquiries: data }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.website) return NextResponse.json({ success: true }, { status: 201 });
    const inquiry = parseCommercialInquiry(body);
    if (inquiry.kind === 'export_rfq') {
      const products = await getProducts();
      const names = new Map(products.map((product) => [product.id, product.name_en || product.name]));
      inquiry.items = inquiry.items.map((item) => {
        const name = names.get(item.product_id);
        if (!name) throw new Error('등록되지 않은 상품이 포함되어 있습니다.');
        return { ...item, product_name: name };
      });
    }
    const { data, error } = await supabaseAdmin.from('commercial_inquiries').insert(inquiry).select('id').single();
    if (error) throw error;
    return NextResponse.json({ success: true, id: data.id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && /확인|선택|포함|올바르/.test(error.message)) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('Commercial inquiry submission failed', error);
    return NextResponse.json({ success: false, error: '문의 접수에 실패했습니다.' }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const denied = await requireStaff(request, ['admin', 'inquiry_staff']);
  if (denied) return denied;
  try {
    const body = await request.json();
    if (typeof body.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.id) || !INQUIRY_STATUSES.includes(body.status)) {
      return NextResponse.json({ success: false, error: '문의 번호 또는 상태가 올바르지 않습니다.' }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin.from('commercial_inquiries')
      .update({ status: body.status, updated_at: new Date().toISOString() }).eq('id', body.id).select('id,status').maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ success: false, error: '문의를 찾을 수 없습니다.' }, { status: 404 });
    return NextResponse.json({ success: true, inquiry: data });
  } catch (error) {
    console.error('Commercial inquiry update failed', error);
    return NextResponse.json({ success: false, error: '문의 상태 변경에 실패했습니다.' }, { status: 503 });
  }
}
