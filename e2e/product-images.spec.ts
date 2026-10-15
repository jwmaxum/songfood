import { test, expect, type BrowserContext, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { installMediaUploadProxy, MEDIA_TEST_ORIGIN } from './media-upload-test-helpers';
async function isolated(page: Page) { await page.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort()); }
async function signIn(context: BrowserContext) { await context.addCookies([{ name: 'sf_admin_access', value: 'a'.repeat(64), url: 'http://127.0.0.1:3100', httpOnly: true, sameSite: 'Strict' }]); }
async function phonePhoto(page: Page, name: string, color: string) {
 const data = await page.evaluate(fill => { const canvas = document.createElement('canvas'); canvas.width = 2400; canvas.height = 1600; const context = canvas.getContext('2d')!; context.fillStyle = fill; context.fillRect(0, 0, canvas.width, canvas.height); return canvas.toDataURL('image/png').split(',')[1]; }, color);
 return { name, mimeType: 'image/png', buffer: Buffer.from(data, 'base64') };
}
test.beforeEach(async ({ page, context, request }) => {
 await request.post('http://127.0.0.1:4011/__reset'); await request.post('http://127.0.0.1:4011/__catalogue');
 await isolated(page); await installMediaUploadProxy(page); await signIn(context);
});
test.afterEach(async ({ request }) => {
 const state = await (await request.get('http://127.0.0.1:4011/__state')).json();
 expect(state.unknown).toEqual([]); expect(state.emails).toEqual([]); expect(state.documentEmails).toEqual([]); expect(state.records).toEqual([]);
});

test('product file photos upload to Storage and media DB then persist through private draft, explicit apply and replacement', async ({ page, request }) => {
 test.setTimeout(120000);
 const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
 await page.goto('/admin/products'); await page.getByRole('button', { name: '비비고 만두 1 수정', exact: true }).click();
 const dialog = page.getByRole('dialog'), primary = dialog.getByRole('region', { name: '대표 사진', exact: true });
 await primary.getByLabel('대표 사진 파일 선택', { exact: true }).setInputFiles(await phonePhoto(page, 'phone-primary.png', '#28603e'));
 await expect(primary).toContainText('업로드 완료');
 const first = await primary.getByLabel('대표 사진 현재 이미지 주소', { exact: true }).inputValue(); expect(first.startsWith(MEDIA_TEST_ORIGIN + '/storage/v1/object/public/media/uploads/')).toBe(true);
 await expect(primary.getByLabel('대표 사진 현재 이미지 주소', { exact: true })).toHaveAttribute('readonly', '');
 const extraField = dialog.getByRole('region', { name: '추가 사진 1', exact: true });
 await extraField.getByLabel('추가 사진 1 파일 선택', { exact: true }).setInputFiles(await phonePhoto(page, 'phone-extra.png', '#a35f30')); await expect(extraField).toContainText('업로드 완료');
 const extra = await extraField.getByLabel('추가 사진 1 현재 이미지 주소', { exact: true }).inputValue();
 let body = await (await request.get('/api/products')).json(); expect(body.data.find((p: { id: string }) => p.id === 'nav-product-01').image_url).toBe('/logo.png');
 await dialog.getByRole('button', { name: '비공개 임시저장', exact: true }).click(); await expect(dialog).toContainText('비공개 초안을 DB에 임시저장했습니다.');
 let state = await (await request.get('http://127.0.0.1:4011/__state')).json();
 expect(state.storageAssets).toHaveLength(2); expect(state.mediaItems).toHaveLength(2); expect(state.productDrafts[0].data).toMatchObject({ image_url: first, images: [first, extra] });
 expect(state.products.find((p: { id: string }) => p.id === 'nav-product-01').image_url).toBe('/logo.png');
 const binary = await request.get('http://127.0.0.1:4011' + new URL(first).pathname), bytes = await binary.body();
 expect(binary.ok()).toBe(true); expect(binary.headers()['content-type']).toBe('image/png'); expect(bytes.readUInt32BE(16)).toBeLessThanOrEqual(1400); expect(bytes.readUInt32BE(20)).toBeLessThanOrEqual(1400); expect(bytes.length).toBeLessThanOrEqual(2 * 1024 * 1024);
 await page.reload(); await page.getByRole('button', { name: '계속 작성', exact: true }).click();
 await expect(dialog.getByLabel('대표 사진 현재 이미지 주소', { exact: true })).toHaveValue(first); await expect(dialog.getByLabel('추가 사진 1 현재 이미지 주소', { exact: true })).toHaveValue(extra);
 await dialog.getByRole('button', { name: '카탈로그에 반영', exact: true }).click(); await expect(dialog).toHaveCount(0);
 await page.goto('/products/nav-product-01?lang=en'); const main = page.getByRole('main');
 const image = main.getByRole('img', { name: 'Bibigo mandu 1', exact: true }); await expect(image).toHaveAttribute('src', first); await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth > 0)).toBe(true);
 await main.getByRole('button', { name: 'Product image 2', exact: true }).click(); await expect(image).toHaveAttribute('src', extra);
 await page.goto('/admin/products'); await page.getByRole('button', { name: '비비고 만두 1 수정', exact: true }).click();
 await primary.getByLabel('대표 사진 파일 선택', { exact: true }).setInputFiles(await phonePhoto(page, 'replacement-primary.png', '#234da2')); await expect(primary).toContainText('업로드 완료');
 const replacement = await primary.getByLabel('대표 사진 현재 이미지 주소', { exact: true }).inputValue(); expect(replacement).not.toBe(first);
 body = await (await request.get('/api/products')).json(); expect(body.data.find((p: { id: string }) => p.id === 'nav-product-01').image_url).toBe(first);
 await dialog.getByRole('button', { name: '카탈로그에 반영', exact: true }).click(); await expect(dialog).toHaveCount(0); await page.reload();
 body = await (await request.get('/api/products')).json(); expect(body.data.find((p: { id: string }) => p.id === 'nav-product-01')).toMatchObject({ image_url: replacement, images: [replacement, extra] });
 state = await (await request.get('http://127.0.0.1:4011/__state')).json(); expect(state.storageAssets).toHaveLength(3); expect(state.mediaItems).toHaveLength(3); expect(state.storageEvents.some((event: { method: string }) => event.method === 'DELETE')).toBe(false);
 expect((await request.get('http://127.0.0.1:4011' + new URL(first).pathname)).ok()).toBe(true); expect(errors).toEqual([]);
});

test('invalid files and failed uploads keep product input and the previous photo with a usable mobile retry', async ({ page, request }) => {
 test.setTimeout(90000); await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/admin/products');
 await page.getByRole('button', { name: '비비고 만두 1 수정', exact: true }).click(); const dialog = page.getByRole('dialog'), field = dialog.getByRole('region', { name: '대표 사진', exact: true });
 await dialog.getByRole('textbox', { name: '상품명 (한국어)', exact: true }).fill('QA 사진 교체 중 입력 보존');
 await field.getByLabel('대표 사진 파일 선택', { exact: true }).setInputFiles({ name: 'not-photo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>') });
 await expect(field.getByRole('alert')).toContainText('SVG');
 const rejectUpload = async (route: Route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, error: 'QA 업로드 재시도 확인' }) });
 await page.route('**/api/upload', rejectUpload);
 await field.getByLabel('대표 사진 파일 선택', { exact: true }).setInputFiles(await phonePhoto(page, 'retry-photo.png', '#723d80')); await expect(field.getByRole('alert')).toContainText('QA 업로드 재시도 확인');
 await expect(field.getByLabel('대표 사진 현재 이미지 주소', { exact: true })).toHaveValue('/logo.png'); await expect(dialog.getByRole('textbox', { name: '상품명 (한국어)', exact: true })).toHaveValue('QA 사진 교체 중 입력 보존');
 await expect(dialog.getByRole('button', { name: '카탈로그에 반영', exact: true })).toBeEnabled();
 const state = await (await request.get('http://127.0.0.1:4011/__state')).json(); expect(state.storageAssets).toHaveLength(0); expect(state.productDrafts).toHaveLength(0);
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
 const a11y = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze(); expect(a11y.violations.map(item => item.id)).toEqual([]);
 await page.unroute('**/api/upload', rejectUpload); await field.getByRole('button', { name: '대표 사진 업로드 다시 시도', exact: true }).click(); await expect(field).toContainText('업로드 완료');
 await dialog.getByRole('button', { name: '카탈로그에 반영', exact: true }).click(); await expect(dialog).toHaveCount(0);
 const body = await (await request.get('/api/products')).json(); expect(body.data.find((p: { id: string }) => p.id === 'nav-product-01')).toMatchObject({ name: 'QA 사진 교체 중 입력 보존', image_url: expect.stringContaining(MEDIA_TEST_ORIGIN) });
});
