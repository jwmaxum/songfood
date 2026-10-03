import { readJson, ApiError, failure } from '@/lib/request-security';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/admin-auth';
import {
  getJournalArticles,
  getJournalBySlug,
  saveJournalArticle,
  toggleJournalPublishStatus,
  deleteJournalArticle,
} from '@/lib/journal-db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode');
    const slug = searchParams.get('slug');
    if (mode === 'admin') {
      const denied = await requireStaff(req, ['admin', 'product_staff']);
      if (denied) return denied;
    }

    if (slug) {
      const article = await getJournalBySlug(slug);
      if (article && !article.is_published) {
        const denied = await requireStaff(req, ['admin', 'product_staff']);
        if (denied) return denied;
      }
      return NextResponse.json({ success: true, data: article });
    }

    const isPublishedOnly = mode !== 'admin';
    const articles = await getJournalArticles(isPublishedOnly);
    return NextResponse.json({ success: true, count: articles.length, data: articles });
  } catch (error) {
    if (error instanceof ApiError) return failure(error);
    return NextResponse.json({ success: false, error: 'Failed to fetch journal articles' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await requireStaff(req, ['admin', 'product_staff']);
  if (denied) return denied;
  try {
    const body = await readJson(req, 131072);
    const { id, is_published } = body;

    if (typeof id !== 'string' || !id || typeof is_published !== 'boolean') {
      return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
    }

    const ok = await toggleJournalPublishStatus(id, is_published);
    return NextResponse.json({ success: ok });
  } catch (error) {
    if (error instanceof ApiError) return failure(error);
    return NextResponse.json({ success: false, error: 'Failed to update publish status' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireStaff(req, ['admin', 'product_staff']);
  if (denied) return denied;
  try {
    const body = await readJson(req, 131072);
    const saved = await saveJournalArticle(body);
    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    if (error instanceof ApiError) return failure(error);
    return NextResponse.json({ success: false, error: 'Failed to save journal article' }, { status: 500 });
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

    const ok = await deleteJournalArticle(id);
    return NextResponse.json({ success: ok });
  } catch (error) {
    if (error instanceof ApiError) return failure(error);
    return NextResponse.json({ success: false, error: 'Failed to delete journal article' }, { status: 500 });
  }
}
