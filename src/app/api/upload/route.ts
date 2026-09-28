import { NextRequest, NextResponse } from 'next/server';
import { addMediaItem } from '@/lib/media-db';
import { requireStaff } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// ─── 보안 설정 ───────────────────────────────────────────────────
const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
};

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;   // 5MB
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;  // Supabase project upload limit
// ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const denied = await requireStaff(req, ['admin', 'product_staff']);
  if (denied) return denied;
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    // ── 1. MIME 타입 화이트리스트 검증 ──────────────────────────────
    const mimeType = file.type.toLowerCase();
    if (!ALLOWED_MIME_TYPES[mimeType]) {
      return NextResponse.json(
        {
          success: false,
          error: `허용되지 않는 파일 형식입니다. 허용: ${Object.keys(ALLOWED_MIME_TYPES).join(', ')}`,
        },
        { status: 415 }
      );
    }

    // ── 2. 파일 크기 제한 ──────────────────────────────────────────
    const isVideo = mimeType.startsWith('video/');
    const maxSize = isVideo ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
    if (file.size > maxSize) {
      const limitMb = (maxSize / (1024 * 1024)).toFixed(0);
      return NextResponse.json(
        {
          success: false,
          error: `파일 크기 초과: ${isVideo ? '동영상' : '이미지'}는 최대 ${limitMb}MB까지 허용됩니다.`,
        },
        { status: 413 }
      );
    }

    // ── 3. 파일명 sanitize ─────────────────────────────────────────
    const ext = ALLOWED_MIME_TYPES[mimeType]; // 검증된 확장자 사용 (사용자 입력 확장자 무시)
    const safeName = `${crypto.randomUUID()}-${file.name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.[^.]+$/, '')}${ext}`;  // 기존 확장자 제거 후 검증된 확장자 추가

    // ── 4. 저장 ────────────────────────────────────────────────────
    const { error: uploadError } = await supabaseAdmin.storage.from('media').upload(safeName, await file.arrayBuffer(), {
      contentType: mimeType,
      upsert: false,
    });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabaseAdmin.storage.from('media').getPublicUrl(safeName);
    const publicUrl = urlData.publicUrl;
    const mediaType = isVideo ? 'video' : 'image';
    const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

    const mediaItem = await addMediaItem({
      name: file.name,
      url: publicUrl,
      type: mediaType,
      size: fileSizeMb,
    });

    return NextResponse.json({ success: true, data: mediaItem });
  } catch (error) {
    console.error('File Upload Error:', error);
    return NextResponse.json({ success: false, error: 'File upload failed' }, { status: 500 });
  }
}
