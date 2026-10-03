import { readJson, ApiError, failure } from '@/lib/request-security';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/admin-auth';
import { getAllContentBlocks, getContentBlockByKey, saveContentBlock } from '@/lib/content-blocks-db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (key) {
      const block = await getContentBlockByKey(key);
      return NextResponse.json({ success: true, data: block });
    }

    const blocks = await getAllContentBlocks();
    return NextResponse.json({ success: true, data: blocks });
  } catch (error) {
    if (error instanceof ApiError) return failure(error);
    return NextResponse.json({ success: false, error: 'Failed to fetch content blocks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireStaff(req, ['admin', 'product_staff']);
  if (denied) return denied;
  try {
    const body = await readJson(req, 131072);
    const { section_key } = body;

    if (typeof section_key !== 'string' || !section_key) {
      return NextResponse.json({ success: false, error: 'section_key is required' }, { status: 400 });
    }

    const saved = await saveContentBlock({ ...body, section_key });
    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    if (error instanceof ApiError) return failure(error);
    return NextResponse.json({ success: false, error: 'Failed to save content block' }, { status: 500 });
  }
}
