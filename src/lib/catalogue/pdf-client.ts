'use client';
import type {CatalogueImage, CatalogueSnapshot} from './types';

const IMAGE_BYTES = 2 * 1024 * 1024, TOTAL_IMAGE_BYTES = 12 * 1024 * 1024;

/** Fixed asset/public-image allowlist; never fetch arbitrary administrator-entered URLs. */
export function catalogueImageUrl(value: string, origin: string, supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL): string | null {
  if (!value || value.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(value)) return null;
  try {
    const url = new URL(value, origin), app = new URL(origin);
    if (url.username || url.password || url.hash || url.port && ![app.port, '443'].includes(url.port)) return null;
    if (url.origin === app.origin) {
      if (!/^\/images\/[A-Za-z0-9_./-]+\.(?:png|jpe?g)$/i.test(url.pathname) || /\.\./.test(value)) return null;
      return url.toString();
    }
    if (url.protocol !== 'https:' || url.port) return null;
    if (supabaseUrl) {
      const storage = new URL(supabaseUrl);
      if (url.origin === storage.origin && /^\/storage\/v1\/object\/public\//.test(url.pathname)) return url.toString();
    }
    if (url.hostname === 'images.unsplash.com' && /^\/photo-[A-Za-z0-9-]+$/.test(url.pathname)) {
      url.search = ''; url.searchParams.set('fm', 'jpg'); url.searchParams.set('w', '480'); url.searchParams.set('q', '75'); url.searchParams.set('fit', 'max');
      return url.toString();
    }
  } catch { /* Missing/invalid images become visible placeholders; products still export. */ }
  return null;
}

async function limitedBytes(response: Response, limit: number) {
  if (!response.ok || Number(response.headers.get('content-length') || 0) > limit) throw new Error('Asset unavailable');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Asset unavailable');
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const {done, value} = await reader.read(); if (done) break;
      size += value.length;
      if (size > limit) { await reader.cancel(); throw new Error('Asset exceeds limit'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}

/** Reject compressed image bombs before pdf-lib decompresses them. */
export function catalogueImageKind(bytes: Uint8Array): CatalogueImage['kind'] | null {
  let w = 0, h = 0;
  if (bytes.length >= 24 && [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    w = view.getUint32(16); h = view.getUint32(20);
    return w > 0 && h > 0 && w * h <= 2_000_000 ? 'png' : null;
  }
  if (bytes[0] !== 255 || bytes[1] !== 216) return null;
  for (let offset = 2; offset + 8 < bytes.length;) {
    if (bytes[offset] !== 255) return null;
    const marker = bytes[offset + 1];
    if (marker === 217 || marker === 218) return null;
    if (marker === 255) { offset++; continue; }
    if (marker === 216 || marker === 1 || marker >= 208 && marker <= 215) { offset += 2; continue; }
    const length = bytes[offset + 2] * 256 + bytes[offset + 3];
    if (length < 2 || offset + 2 + length > bytes.length) return null;
    if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
      h = bytes[offset + 5] * 256 + bytes[offset + 6]; w = bytes[offset + 7] * 256 + bytes[offset + 8];
      return w > 0 && h > 0 && w * h <= 2_000_000 ? 'jpg' : null;
    }
    offset += length + 2;
  }
  return null;
}

export async function createCataloguePdf(snapshot: CatalogueSnapshot): Promise<Uint8Array> {
  // Font loading is mandatory. A missing Korean font must never create a corrupt/blank PDF.
  const fontResponse = await fetch('/fonts/NanumGothic-Regular.ttf', {credentials: 'omit', signal: AbortSignal.timeout(20_000)});
  const fontBytes = await limitedBytes(fontResponse, 3 * 1024 * 1024);
  const images = new Map<string, CatalogueImage>();
  const origin = window.location.origin;
  const urls = [...new Set(snapshot.products.map(p => p.image_url).filter(Boolean))].slice(0, 32);
  let total = 0;
  // Two concurrent downloads keep memory bounded. Failed photos do not drop a product card.
  for (let start = 0; start < urls.length; start += 2) {
    await Promise.all(urls.slice(start, start + 2).map(async original => {
      const url = catalogueImageUrl(original, origin);
      if (!url || total >= TOTAL_IMAGE_BYTES) return;
      try {
        const response = await fetch(url, {credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(4_000)});
        const bytes = await limitedBytes(response, IMAGE_BYTES), kind = catalogueImageKind(bytes);
        if (!kind || total + bytes.length > TOTAL_IMAGE_BYTES) return;
        total += bytes.length; images.set(original, {bytes, kind});
      } catch { /* Safe placeholder for missing, too-large, unsupported or unavailable photos. */ }
    }));
  }
  const {renderCataloguePdf} = await import('./pdf');
  return renderCataloguePdf(snapshot, fontBytes, images);
}
