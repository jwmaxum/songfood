import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/admin-auth';
import { getMediaItems, addMediaItem, deleteMediaItem } from '@/lib/media-db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') as 'image' | 'video' | undefined;

    const items = await getMediaItems(type);
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error('API GET /api/media error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch media items' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireStaff(req, ['admin', 'product_staff']);
  if (denied) return denied;
  try {
    const body = await req.json();
    const { name, url, type, size } = body;

    if (!name || !url) {
      return NextResponse.json({ success: false, error: 'Name and URL are required' }, { status: 400 });
    }

    const newItem = await addMediaItem({
      name,
      url,
      type: type || 'image',
      size: size || 'External CDN',
    });

    return NextResponse.json({ success: true, data: newItem });
  } catch (error) {
    console.error('API POST /api/media error:', error);
    return NextResponse.json({ success: false, error: 'Failed to add media item' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireStaff(req, ['admin', 'product_staff']);
  if (denied) return denied;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Media ID required' }, { status: 400 });
    }

    const ok = await deleteMediaItem(id);
    return NextResponse.json({ success: ok });
  } catch (error) {
    console.error('API DELETE /api/media error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete media item' }, { status: 500 });
  }
}
