import { readJson, ApiError, failure } from '@/lib/request-security';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/admin-auth';
import { reorderMenus } from '@/lib/menus-db';
import { ReorderItemPayload } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const denied = await requireStaff(req, ['admin', 'product_staff']);
  if (denied) return denied;
  try {
    const body = await readJson(req, 131072);
    const items = body.items as ReorderItemPayload[];

    if (!Array.isArray(items)) {
      return NextResponse.json({ success: false, error: 'Invalid items array' }, { status: 400 });
    }

    const ok = await reorderMenus(items);
    return NextResponse.json({ success: ok });
  } catch (error) {
    if (error instanceof ApiError) return failure(error);
    return NextResponse.json({ success: false, error: 'Failed to reorder menus' }, { status: 500 });
  }
}
