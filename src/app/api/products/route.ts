import { NextRequest, NextResponse } from 'next/server';
import { getProducts, saveProduct, deleteProduct } from '@/lib/products-db';
export const dynamic = 'force-static';
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

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

    return NextResponse.json({ success: true, count: products.length, data: products });
  } catch (error) {
    console.error('API GET /api/products error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const saved = await saveProduct(body);
    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('API POST /api/products error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save product' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    const ok = await deleteProduct(id);
    return NextResponse.json({ success: ok });
  } catch (error) {
    console.error('API DELETE /api/products error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete product' }, { status: 500 });
  }
}
