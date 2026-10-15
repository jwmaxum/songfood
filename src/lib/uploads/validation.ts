import {ApiError} from '../request-security';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 2_000_000;
export const MAX_MULTIPART_BYTES = MAX_VIDEO_BYTES + 65_536;
const ascii = (b: Uint8Array, start: number, n: number) => String.fromCharCode(...b.subarray(start, start + n));
const be16 = (b: Uint8Array, at: number) => b[at] * 256 + b[at + 1];
const le16 = (b: Uint8Array, at: number) => b[at] + b[at + 1] * 256;
const le24 = (b: Uint8Array, at: number) => b[at] + b[at + 1] * 256 + b[at + 2] * 65536;
const be32 = (b: Uint8Array, at: number) => new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(at);
export function inspectUpload(bytes: Uint8Array, declared: string, size: number) {
  const mime = declared.toLowerCase() === 'image/jpg' ? 'image/jpeg' : declared.toLowerCase();
  if (!['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'].includes(mime)) throw new ApiError(415, 'JPG·PNG·WebP·GIF 이미지 또는 MP4·WebM 동영상을 선택해 주세요.');
  if (!Number.isSafeInteger(size) || size <= 0) throw new ApiError(400, '비어 있는 파일은 업로드할 수 없습니다.');
  const video = mime.startsWith('video/');
  if (size > (video ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) throw new ApiError(413, video ? '동영상은 최대 50MB까지 업로드할 수 있습니다.' : '이미지는 최대 5MB까지 업로드할 수 있습니다.');
  let detected = '', extension = '', width = 0, height = 0;
  if (bytes.length >= 24 && [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v) && ascii(bytes,12,4) === 'IHDR') {
    detected = 'image/png'; extension = 'png'; width = be32(bytes,16); height = be32(bytes,20);
  } else if (bytes.length >= 10 && ['GIF87a','GIF89a'].includes(ascii(bytes,0,6))) {
    detected = 'image/gif'; extension = 'gif'; width = le16(bytes,6); height = le16(bytes,8);
  } else if (bytes.length >= 30 && ascii(bytes,0,4) === 'RIFF' && ascii(bytes,8,4) === 'WEBP') {
    const chunk = ascii(bytes,12,4);
    if (chunk === 'VP8X') { width = le24(bytes,24) + 1; height = le24(bytes,27) + 1; }
    else if (chunk === 'VP8L' && bytes[20] === 47) { width = 1 + bytes[21] + ((bytes[22] & 63) << 8); height = 1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 15) << 10); }
    else if (chunk === 'VP8 ' && bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42) { width = le16(bytes,26) & 16383; height = le16(bytes,28) & 16383; }
    detected = 'image/webp'; extension = 'webp';
  } else if (bytes[0] === 255 && bytes[1] === 216) {
    for (let offset = 2; offset + 8 < bytes.length;) {
      if (bytes[offset] !== 255) break;
      const marker = bytes[offset + 1];
      if (marker === 217 || marker === 218) break;
      if (marker === 255) { offset++; continue; }
      if (marker === 216 || marker === 1 || marker >= 208 && marker <= 215) { offset += 2; continue; }
      const length = be16(bytes,offset + 2); if (length < 2 || offset + length + 2 > bytes.length) break;
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) { width = be16(bytes,offset + 7); height = be16(bytes,offset + 5); detected = 'image/jpeg'; extension = 'jpg'; break; }
      offset += length + 2;
    }
  } else if (bytes.length >= 24 && ascii(bytes,4,4) === 'ftyp' && be32(bytes,0) >= 16 && be32(bytes,0) <= size) {
    detected = 'video/mp4'; extension = 'mp4';
  } else if (bytes.length >= 12 && [26,69,223,163].every((v,i) => bytes[i] === v) && ascii(bytes,0,Math.min(bytes.length,4096)).includes('webm')) {
    detected = 'video/webm'; extension = 'webm';
  }
  if (!detected || detected !== mime) throw new ApiError(415, '파일의 실제 형식이 선택한 이미지·동영상 형식과 일치하지 않습니다. 다른 파일로 다시 시도해 주세요.');
  if (!video && (!width || !height || width * height > MAX_IMAGE_PIXELS)) throw new ApiError(413, '이미지를 최적화한 뒤 업로드해 주세요. 최대 2백만 픽셀을 지원합니다.');
  return {contentType: detected, extension, type: video ? 'video' as const : 'image' as const, width, height};
}
