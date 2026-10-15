export const MAX_SOURCE_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_UPLOAD_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_IMAGE_EDGE = 1400;
export const MAX_IMAGE_PIXELS = 2_000_000;
const sourceTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);
export function validateSourceImage(file: File) {
  if (!sourceTypes.has(file.type.toLowerCase()) || /\.svgz?$/i.test(file.name)) throw new Error('JPEG, PNG, WebP, GIF 사진을 선택해 주세요. SVG는 지원하지 않습니다.');
  if (!file.size) throw new Error('빈 사진 파일은 업로드할 수 없습니다.');
  if (file.size > MAX_SOURCE_IMAGE_BYTES) throw new Error('원본 사진은 20MB 이하로 선택해 주세요.');
}
type DecodedImage = { source: CanvasImageSource; width: number; height: number; close(): void };
async function decode(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const image = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: image, width: image.width, height: image.height, close: () => image.close() };
    } catch { /* Try the browser's image decoder before reporting an invalid image. */ }
  }
  const url = URL.createObjectURL(file), image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve(); image.onerror = () => reject(new Error('사진을 읽지 못했습니다. 다른 사진 파일을 선택해 주세요.')); image.src = url;
    });
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch (error) { URL.revokeObjectURL(url); throw error; }
}
function toBlob(canvas: HTMLCanvasElement, type: 'image/jpeg' | 'image/png', quality: number) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('사진을 변환하지 못했습니다. 다른 사진을 선택해 주세요.')), type, quality));
}
export async function prepareImageUpload(file: File, options: { preserveTransparency?: boolean } = {}): Promise<{ file: File; width: number; height: number }> {
  validateSourceImage(file);
  const image = await decode(file);
  try {
    if (!Number.isFinite(image.width) || !Number.isFinite(image.height) || image.width < 1 || image.height < 1) throw new Error('사진 크기를 확인하지 못했습니다.');
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.width, image.height), Math.sqrt(MAX_IMAGE_PIXELS / (image.width * image.height)));
    const canvas = document.createElement('canvas');
    let width = Math.max(1, Math.floor(image.width * scale)), height = Math.max(1, Math.floor(image.height * scale)), quality = 0.88;
    const type = options.preserveTransparency !== false && !['image/jpeg', 'image/jpg'].includes(file.type.toLowerCase()) ? 'image/png' : 'image/jpeg';
    for (let attempt = 0; attempt < 12; attempt++) {
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d', { alpha: type === 'image/png' });
      if (!context) throw new Error('이 브라우저에서 사진 변환을 사용할 수 없습니다. 다른 브라우저에서 시도해 주세요.');
      if (type === 'image/jpeg') { context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height); }
      context.drawImage(image.source, 0, 0, width, height);
      const blob = await toBlob(canvas, type, quality);
      if (blob.size > 0 && blob.size <= MAX_UPLOAD_IMAGE_BYTES && blob.type === type) {
        const base = file.name.replace(/\.[^.]*$/, '').replace(/[\\/\u0000-\u001f\u007f]/g, '_').slice(0, 100) || 'product-photo';
        return { file: new File([blob], base + (type === 'image/png' ? '.png' : '.jpg'), { type, lastModified: Date.now() }), width, height };
      }
      if (type === 'image/jpeg' && quality > 0.5) quality -= 0.15;
      else { width = Math.max(1, Math.floor(width * 0.75)); height = Math.max(1, Math.floor(height * 0.75)); }
    }
    throw new Error('사진을 2MB 이하로 줄이지 못했습니다. 더 작은 사진을 선택해 주세요.');
  } finally { image.close(); }
}
