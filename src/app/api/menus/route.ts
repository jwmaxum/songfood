import { readJson, ApiError, failure } from '@/lib/request-security';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/admin-auth';
import {
  getAllMenusTree,
  getActiveMenusTree,
  toggleMenuStatus,
  createMenuItem,
  deleteMenuItem,
} from '@/lib/menus-db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode'); // 'admin' or null/active
    const position = searchParams.get('position') as 'header' | 'footer' | undefined;

    if (mode === 'admin') {
      const denied = await requireStaff(req, ['admin', 'product_staff']);
      if (denied) return denied;
      const tree = await getAllMenusTree();
      return NextResponse.json({ success: true, data: tree });
    }

    const activeTree = await getActiveMenusTree(position);
    return NextResponse.json({ success: true, data: activeTree });
  } catch (error) {
    if (error instanceof ApiError) return failure(error);
    return NextResponse.json({ success: false, error: 'Failed to fetch menus' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await requireStaff(req, ['admin', 'product_staff']);
  if (denied) return denied;
  try {
    const body = await readJson(req, 131072);
    const { id, is_active } = body;

    if (typeof id !== 'string' || !id || typeof is_active !== 'boolean') {
      return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
    }

    const ok = await toggleMenuStatus(id, is_active);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Menu not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) return failure(error);
    return NextResponse.json({ success: false, error: 'Failed to update menu' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireStaff(req, ['admin', 'product_staff']);
  if (denied) return denied;
  try {
    const body = await readJson(req, 131072);
    const { title, url, parent_id, sort_order, is_active, position, image_url } = body;

    if (typeof title !== 'string' || typeof url !== 'string' || !title || !url
      || (parent_id != null && typeof parent_id !== 'string')
      || (sort_order != null && (typeof sort_order !== 'number' || !Number.isFinite(sort_order)))
      || (is_active != null && typeof is_active !== 'boolean')
      || (position != null && position !== 'header' && position !== 'footer' && position !== 'both')
      || (image_url != null && typeof image_url !== 'string')) {
      return NextResponse.json({ success: false, error: 'Title and URL are required' }, { status: 400 });
    }

    const newItem = await createMenuItem({
      title,
      url,
      parent_id: parent_id || null,
      sort_order: sort_order ?? 99,
      is_active: is_active ?? true,
      position: position || 'both',
      image_url: image_url || '',
    });

    return NextResponse.json({ success: true, data: newItem });
  } catch (error) {
    if (error instanceof ApiError) return failure(error);
    return NextResponse.json({ success: false, error: 'Failed to create menu' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireStaff(req, ['admin', 'product_staff']);
  if (denied) return denied;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Menu ID is required' }, { status: 400 });
    }

    const ok = await deleteMenuItem(id);
    return NextResponse.json({ success: true, deleted: ok });
  } catch (error) {
    if (error instanceof ApiError) return failure(error);
    return NextResponse.json({ success: false, error: 'Failed to delete menu' }, { status: 500 });
  }
}
