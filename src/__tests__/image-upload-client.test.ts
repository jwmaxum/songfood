/** @jest-environment jsdom */
import { prepareImageUpload, validateSourceImage, MAX_SOURCE_IMAGE_BYTES, MAX_UPLOAD_IMAGE_BYTES } from '@/lib/image-upload-client';
let bitmap: { width: number; height: number; close: jest.Mock }, context: { drawImage: jest.Mock; fillRect: jest.Mock; fillStyle: string }, sizes: number[];
beforeEach(() => {
 bitmap = { width: 4000, height: 3000, close: jest.fn() }; context = { drawImage: jest.fn(), fillRect: jest.fn(), fillStyle: '' }; sizes = [];
 Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, value: jest.fn(async () => bitmap) });
 jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
 jest.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback, type) => callback(new Blob([new Uint8Array(sizes.shift() ?? 100)], { type })));
});
afterEach(() => jest.restoreAllMocks());
const photo = (type = 'image/jpeg', name = '실제 사진.jpg') => new File(['source bytes'], name, { type });
test('native decoding creates a bounded JPEG with original orientation and releases decoded resources', async () => {
 const source = photo(), result = await prepareImageUpload(source);
 expect(globalThis.createImageBitmap).toHaveBeenCalledWith(source, { imageOrientation: 'from-image' });
 expect(result).toMatchObject({ width: 1400, height: 1050 }); expect(result.width * result.height).toBeLessThanOrEqual(2_000_000);
 expect(result.file.type).toBe('image/jpeg'); expect(result.file.name).toBe('실제 사진.jpg'); expect(result.file.size).toBeLessThanOrEqual(MAX_UPLOAD_IMAGE_BYTES);
 expect(context.fillRect).toHaveBeenCalledWith(0, 0, 1400, 1050); expect(bitmap.close).toHaveBeenCalledTimes(1);
});
test('transparent PNGs remain PNG without a white background and oversized output is downscaled', async () => {
 sizes = [MAX_UPLOAD_IMAGE_BYTES + 1, 100];
 const result = await prepareImageUpload(photo('image/png', '원본.png'));
 expect(result.file.type).toBe('image/png'); expect(result.width).toBe(1050); expect(result.height).toBe(787); expect(context.fillRect).not.toHaveBeenCalled();
});
test('turning transparency off produces a PDF-compatible JPEG with a white background', async () => {
 const result = await prepareImageUpload(photo('image/webp', '투명.webp'), { preserveTransparency: false });
 expect(result.file.name).toBe('투명.jpg'); expect(result.file.type).toBe('image/jpeg'); expect(context.fillStyle).toBe('#ffffff'); expect(context.fillRect).toHaveBeenCalled();
});
test('JPEG quality is reduced before dimensions when the first output exceeds 2MB', async () => {
 sizes = [MAX_UPLOAD_IMAGE_BYTES + 1, 100]; const result = await prepareImageUpload(photo());
 expect(result.width).toBe(1400); expect(result.height).toBe(1050);
 expect((HTMLCanvasElement.prototype.toBlob as jest.Mock).mock.calls.map(call => call[2])).toEqual([0.88, 0.73]);
});
test('SVGs, empty files and originals above 20MB fail before decoding', () => {
 const tooLarge = photo(); Object.defineProperty(tooLarge, 'size', { value: MAX_SOURCE_IMAGE_BYTES + 1 });
 expect(() => validateSourceImage(photo('image/svg+xml', 'image.svg'))).toThrow('SVG');
 expect(() => validateSourceImage(photo('image/png', 'image.svg'))).toThrow('SVG');
 expect(() => validateSourceImage(new File([], 'empty.png', { type: 'image/png' }))).toThrow('빈 사진');
 expect(() => validateSourceImage(tooLarge)).toThrow('20MB'); expect(globalThis.createImageBitmap).not.toHaveBeenCalled();
});
test('small images are never enlarged and invalid dimensions release the native bitmap', async () => {
 bitmap.width = 120; bitmap.height = 80; expect(await prepareImageUpload(photo())).toMatchObject({ width: 120, height: 80 });
 bitmap.width = 0; await expect(prepareImageUpload(photo())).rejects.toThrow('사진 크기'); expect(bitmap.close).toHaveBeenCalledTimes(2);
});
test('failed browser encoding releases the decoded bitmap and reports an actionable error', async () => {
 (HTMLCanvasElement.prototype.toBlob as jest.Mock).mockImplementation((callback: BlobCallback) => callback(null));
 await expect(prepareImageUpload(photo())).rejects.toThrow('사진을 변환하지 못했습니다'); expect(bitmap.close).toHaveBeenCalledTimes(1);
});
