import { NextRequest, NextResponse } from 'next/server';
import { getProducts, saveProduct, deleteProduct } from '@/lib/products-db';
import { isSupabaseConfigured } from '@/lib/supabase-admin';
import { publicMinimums } from '@/lib/pricing/repository';
import { publicProduct } from '@/lib/public-product';
import { readJson, failure } from '@/lib/request-security';
import { requireStaff } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const privateMode = searchParams.get('mode') === 'admin';
    if (privateMode) { const denied = await requireStaff(req, ['admin','product_staff']); if (denied) return denied; }
    const collection = searchParams.get('collection') || undefined;
    const format = searchParams.getAll('format');
    const finish = searchParams.getAll('finish');
    const color = searchParams.getAll('color');
    const look = searchParams.getAll('look');
    const search = searchParams.get('search') || undefined;

    const products = await getProducts({
      collection,
      format: format.length > 0 ? format : undefined,
      finish: finish.length > 0 ? finish : undefined,
      color: color.length > 0 ? color : undefined,
      look: look.length > 0 ? look : undefined,
      search,
    });

    const minimums=privateMode || !isSupabaseConfigured()?{}:await publicMinimums();
    return NextResponse.json({ success: true, count: products.length, data: privateMode ? products : products.map(p=>({...publicProduct(p),purchase_minimum:minimums[p.id]})) }, { headers: { 'Cache-Control':'no-store' } });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const denied = await requireStaff(req, ['admin', 'product_staff']);
    if (denied) return denied;
    const body = await readJson(req, 131072);
    const saved = await saveProduct(body);
    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    // Provider details are deliberately omitted from logs.
    return failure(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const denied = await requireStaff(req, ['admin', 'product_staff']);
    if (denied) return denied;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    const ok = await deleteProduct(id);
    return NextResponse.json({ success: ok });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to delete product' }, { status: 500 });
  }
}
