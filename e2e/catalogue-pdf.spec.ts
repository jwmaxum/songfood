import { test, expect, type BrowserContext, type Download, type Page } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
async function isolated(page: Page) {
 await page.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
}
async function signIn(context: BrowserContext) {
 await context.addCookies([{ name: 'sf_admin_access', value: 'a'.repeat(64), url: 'http://127.0.0.1:3100', httpOnly: true, sameSite: 'Strict' }]);
}
async function validPdf(download: Download, language: 'ko' | 'en') {
 expect(download.suggestedFilename()).toMatch(new RegExp('^songfood-catalogue-' + language + '-[0-9]{4}-[0-9]{2}-[0-9]{2}\\.pdf$'));
 const stream = await download.createReadStream(); expect(stream).toBeTruthy();
 const chunks: Buffer[] = []; for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
 const bytes = Buffer.concat(chunks); expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
 const document = await PDFDocument.load(bytes); expect(document.getPageCount()).toBeGreaterThan(0);
 expect(await download.failure()).toBeNull();
}
test.beforeEach(async ({ page, context, request }) => {
 await request.post('http://127.0.0.1:4011/__reset'); await request.post('http://127.0.0.1:4011/__catalogue');
 await isolated(page); await signIn(context);
});
test.afterEach(async ({ request }) => {
 const state = await (await request.get('http://127.0.0.1:4011/__state')).json();
 expect(state.unknown).toEqual([]); expect(state.emails).toEqual([]); expect(state.documentEmails).toEqual([]); expect(state.records).toEqual([]);
});

test('PDF catalogue downloads all registered products across a filtered list in Korean and English without private drafts', async ({ page }) => {
 test.setTimeout(120000);
 const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
 await page.goto('/admin/products');
 await page.getByRole('button', { name: '+ 상품 초안 만들기', exact: true }).click();
 const dialog = page.getByRole('dialog');
 await dialog.getByRole('textbox', { name: '상품명 (한국어)', exact: true }).fill('QA 비공개 PDF 제외 상품');
 await dialog.getByRole('textbox', { name: '규격서 출처·확인 메모', exact: true }).fill('QA PRIVATE PDF SOURCE');
 await dialog.getByRole('button', { name: '비공개 임시저장', exact: true }).click();
 await expect(dialog).toContainText('비공개 초안을 DB에 임시저장했습니다.');
 await expect(dialog.getByRole('status')).toBeFocused(); await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
 const main = page.getByRole('main'), region = main.getByRole('region', { name: '카탈로그 PDF', exact: true });
 await main.getByRole('textbox', { name: '카탈로그 상품 검색', exact: true }).fill('NAV-001');
 await expect(main.getByRole('checkbox')).toHaveCount(1);
 await region.getByRole('button', { name: '등록 상품 전체 30개 선택', exact: true }).click();
 await expect(region).toContainText('선택 30개 / 등록 30개 · 검색 결과 1개 · 검색 밖 선택 29개');
 for (const language of ['ko', 'en'] as const) {
  if (language === 'en') await region.getByRole('combobox', { name: 'PDF 언어 / Language', exact: true }).selectOption('en');
  const responsePromise = page.waitForResponse(response => new URL(response.url()).pathname === '/api/admin/catalogue/pdf' && response.request().method() === 'POST');
  const downloadPromise = page.waitForEvent('download', { timeout: 90000 });
  await region.getByRole('button', { name: '선택 상품 PDF 다운로드', exact: true }).click();
  const response = await responsePromise; expect(response.ok()).toBe(true);
  const payload = await response.json();
  expect(payload.catalogue.language).toBe(language); expect(payload.catalogue.products).toHaveLength(30);
  expect(JSON.stringify(payload)).not.toContain('QA PRIVATE PDF SOURCE'); expect(JSON.stringify(payload)).not.toContain('QA 비공개 PDF 제외 상품');
  for (const product of payload.catalogue.products) {
   expect(product).not.toHaveProperty('price'); expect(product).not.toHaveProperty('wholesale_price_krw'); expect(product).not.toHaveProperty('source_notes'); expect(product).not.toHaveProperty('base_product');
  }
  const request = response.request().postDataJSON(); expect(request.product_ids).toHaveLength(30); expect(new Set(request.product_ids).size).toBe(30);
  await validPdf(await downloadPromise, language);
  await expect(region).toContainText('선택한 30개 상품의 PDF 다운로드를 시작했습니다.');
 }
 await region.getByRole('button', { name: '선택 해제', exact: true }).click();
 await expect(region.getByRole('button', { name: '선택 상품 PDF 다운로드', exact: true })).toBeDisabled();
 expect(errors).toEqual([]);
});

test('PDF catalogue permission failures preserve the selection and offer a clear sign-in message', async ({ page }) => {
 await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/admin/products');
 const main = page.getByRole('main'), region = main.getByRole('region', { name: '카탈로그 PDF', exact: true });
 const checkbox = main.getByRole('checkbox', { name: '비비고 만두 1 PDF 선택', exact: true }); await checkbox.check();
 let downloads = 0; page.on('download', () => downloads++);
 await page.route('**/api/admin/catalogue/pdf', route => route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'Forbidden' }) }));
 await region.getByRole('button', { name: '선택 상품 PDF 다운로드', exact: true }).click();
 await expect(region.getByRole('alert')).toContainText('다시 로그인해 주세요.'); await expect(checkbox).toBeChecked();
 await expect(region.getByRole('button', { name: '선택 상품 PDF 다운로드', exact: true })).toBeEnabled();
 expect(downloads).toBe(0);
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
