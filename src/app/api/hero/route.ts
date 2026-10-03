import { readJson, ApiError, failure } from '@/lib/request-security';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/admin-auth';
import {
  getAllHeroSlides,
  getActiveHeroSlides,
  toggleHeroSlideActive,
  saveHeroSlide,
  deleteHeroSlide,
} from '@/lib/cms-db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode');

    if (mode === 'admin') {
      const denied = await requireStaff(req, ['admin', 'product_staff']);
      if (denied) return denied;
      const slides = await getAllHeroSlides();
      return NextResponse.json({ success: true, data: slides });
    }

    const activeSlides = await getActiveHeroSlides();
    return NextResponse.json({ success: true, data: activeSlides });
  } catch (error) {
    if (error instanceof ApiError) return failure(error);
    return NextResponse.json({ success: false, error: 'Failed to fetch hero slides' }, { status: 500 });
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

    const ok = await toggleHeroSlideActive(id, is_active);
    return NextResponse.json({ success: ok });
  } catch (error) {
    if (error instanceof ApiError) return failure(error);
    return NextResponse.json({ success: false, error: 'Failed to update slide status' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireStaff(req, ['admin', 'product_staff']);
  if (denied) return denied;
  try {
    const body = await readJson(req, 131072);
    const saved = await saveHeroSlide(body);
    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    if (error instanceof ApiError) return failure(error);
    return NextResponse.json({ success: false, error: 'Failed to save hero slide' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireStaff(req, ['admin', 'product_staff']);
  if (denied) return denied;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    const ok = await deleteHeroSlide(id);
    return NextResponse.json({ success: ok });
  } catch (error) {
    if (error instanceof ApiError) return failure(error);
    return NextResponse.json({ success: false, error: 'Failed to delete hero slide' }, { status: 500 });
  }
}
