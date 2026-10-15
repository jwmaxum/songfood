import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function isolated(page: Page) {
  await page.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
}
async function signIn(context: BrowserContext, token = 'a') {
  await context.addCookies([{ name: 'sf_admin_access', value: token.repeat(64), url: 'http://127.0.0.1:3100', httpOnly: true, sameSite: 'Strict' }]);
}
test.beforeEach(async ({ page, request }) => {
  await request.post('http://127.0.0.1:4011/__reset');
  await request.post('http://127.0.0.1:4011/__catalogue');
  await isolated(page);
});
test.afterEach(async ({ request }) => {
  const state = await (await request.get('http://127.0.0.1:4011/__state')).json();
  expect(state.unknown).toEqual([]); expect(state.emails).toEqual([]); expect(state.documentEmails).toEqual([]); expect(state.records).toEqual([]);
});

test('private name-only product template persists, resumes and stays outside the public catalogue', async ({ page, context, request }) => {
  await signIn(context); await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/admin/products');
  await page.getByRole('button', { name: '+ 상품 초안 만들기', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('combobox', { name: '대분류', exact: true })).toHaveValue('');
  await expect(dialog.getByRole('spinbutton', { name: '기존 참고 판매가 (선택)', exact: true })).toBeEmpty();
  await dialog.getByRole('textbox', { name: '상품명 (한국어)', exact: true }).fill('QA 비공개 작업 중 상품');
  await dialog.getByRole('textbox', { name: '규격서 출처·확인 메모', exact: true }).fill('QA PRIVATE SPECIFICATION SOURCE');
  await dialog.getByRole('button', { name: '비공개 임시저장', exact: true }).click();
  await expect(dialog).toContainText('비공개 초안을 DB에 임시저장했습니다.');
  await expect(dialog.getByRole('status')).toBeFocused();
  await expect(dialog.getByRole('button', { name: '카탈로그에 반영', exact: true })).toBeEnabled();
  const publicBody = await (await request.get('/api/products')).json();
  expect(publicBody.data).toHaveLength(30);
  expect(JSON.stringify(publicBody)).not.toContain('QA PRIVATE SPECIFICATION SOURCE');
  expect(publicBody.data.some((p: { name: string }) => p.name === 'QA 비공개 작업 중 상품')).toBe(false);
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
  await page.reload(); await page.getByRole('button', { name: '계속 작성', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '상품명 (한국어)', exact: true })).toHaveValue('QA 비공개 작업 중 상품');
  await expect(page.getByRole('textbox', { name: '규격서 출처·확인 메모', exact: true })).toHaveValue('QA PRIVATE SPECIFICATION SOURCE');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const a11y = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(a11y.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
  expect(errors).toEqual([]);
  expect((await request.get('/api/admin/product-drafts')).status()).toBe(403);
});

test('English name-only catalogue publish saves first and uses a server SKU without fabricated metadata', async ({ page, context, request }) => {
  await signIn(context);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/admin/products'); await page.getByRole('button', { name: '+ 상품 초안 만들기', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: '상품명 (영어)', exact: true }).fill('QA actual named product');
  await dialog.getByRole('textbox', { name: '원본 라벨 출처·확인 메모', exact: true }).fill('QA PRIVATE LABEL SOURCE');
  await expect(dialog.getByRole('button', { name: '카탈로그에 반영', exact: true })).toBeEnabled();
  await dialog.getByRole('button', { name: '카탈로그에 반영', exact: true }).click();
  await expect(dialog).toHaveCount(0); await expect(page.getByRole('main')).toContainText('카탈로그에 반영했습니다.');
  const body = await (await request.get('/api/products')).json(), item = body.data.find((p: { name_en: string }) => p.name_en === 'QA actual named product');
  expect(item).toBeTruthy(); expect(item.sku).toMatch(/^AUTO-/); expect(item.storage == null || item.storage === '').toBe(true);
  expect(item.collection == null || item.collection === '').toBe(true); expect(item.category == null || item.category === '').toBe(true);
  expect(item).not.toHaveProperty('price'); expect(item).not.toHaveProperty('source_notes'); expect(item).not.toHaveProperty('base_product');
  expect(JSON.stringify(body)).not.toContain('QA PRIVATE LABEL SOURCE');
  await page.goto('/products/' + encodeURIComponent(item.id) + '?lang=ko');
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText('QA actual named product');
  await expect(page.getByRole('main')).toContainText('확인 필요');
  await page.goto('/shop?q=' + encodeURIComponent('QA actual named product') + '&storage=unknown&lang=ko');
  await expect(page.getByRole('main').getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('main').getByRole('article')).toContainText('규격 확인 필요');
  expect(errors).toEqual([]);
});

test('existing product partial edit is private until explicit apply and stale tabs keep their own input', async ({ page, context, request }) => {
  await signIn(context); await page.goto('/admin/products');
  await page.getByRole('button', { name: '비비고 만두 1 수정', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: '보관 방법', exact: true }).fill('QA 실제 확인 대기 냉장');
  await dialog.getByRole('textbox', { name: '판매조건 출처·확인 메모', exact: true }).fill('QA PRIVATE SALES TERMS SOURCE');
  await dialog.getByRole('button', { name: '비공개 임시저장', exact: true }).click();
  await expect(dialog).toContainText('비공개 초안을 DB에 임시저장했습니다.');
  let body = await (await request.get('/api/products')).json();
  expect(body.data.find((p: { id: string }) => p.id === 'nav-product-01').storage).toBe('Frozen / 냉동');
  const second = await context.newPage(); await isolated(second); await second.goto('/admin/products');
  await second.getByRole('button', { name: '계속 작성', exact: true }).click();
  await dialog.getByRole('textbox', { name: '상품명 (한국어)', exact: true }).fill('QA 첫 번째 직원 입력');
  await dialog.getByRole('button', { name: '비공개 임시저장', exact: true }).click();
  await expect(dialog).toContainText('비공개 초안을 DB에 임시저장했습니다.');
  await second.getByRole('textbox', { name: '상품명 (한국어)', exact: true }).fill('QA 두 번째 직원 보존 입력');
  await second.getByRole('button', { name: '비공개 임시저장', exact: true }).click();
  await expect(second.getByRole('dialog').getByRole('alert')).toContainText('내 입력은 보존되어 있습니다.');
  await expect(second.getByRole('textbox', { name: '상품명 (한국어)', exact: true })).toHaveValue('QA 두 번째 직원 보존 입력');
  await expect(second.getByRole('button', { name: '비공개 임시저장', exact: true })).toBeDisabled();
  await second.close();
  await dialog.getByRole('button', { name: '카탈로그에 반영', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  body = await (await request.get('/api/products')).json();
  const item = body.data.find((p: { id: string }) => p.id === 'nav-product-01');
  expect(item.storage).toBe('QA 실제 확인 대기 냉장'); expect(item.name).toBe('QA 첫 번째 직원 입력');
  expect(item.sku).toBe('NAV-001'); expect(item.format).toBe('1 kg');
  expect(JSON.stringify(body)).not.toContain('QA PRIVATE SALES TERMS SOURCE');
});

test('changed public originals require explicit comparison and rebase without losing another staff change', async ({ page, context, request }) => {
  await signIn(context); await page.goto('/admin/products');
  await page.getByRole('button', { name: '비비고 만두 1 수정', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: '보관 방법', exact: true }).fill('QA 원본 대조 후 냉장');
  await dialog.getByRole('button', { name: '비공개 임시저장', exact: true }).click();
  await expect(dialog).toContainText('비공개 초안을 DB에 임시저장했습니다.');
  expect((await request.post('http://127.0.0.1:4011/__draft-product-change', { data: { id: 'nav-product-01', patch: { net_weight: '2 kg' } } })).ok()).toBe(true);
  await dialog.getByRole('button', { name: '카탈로그에 반영', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('내 입력은 보존되어 있습니다.');
  await expect(dialog.getByRole('textbox', { name: '보관 방법', exact: true })).toHaveValue('QA 원본 대조 후 냉장');
  await dialog.getByRole('button', { name: '현재 상품 원본과 대조', exact: true }).click();
  const comparison = dialog.getByRole('region', { name: '상품 원본 변경 대조', exact: true });
  await expect(comparison).toContainText('현재 상품: 2 kg');
  await comparison.getByRole('button', { name: '대조한 현재 원본 기준으로 초안 재저장', exact: true }).click();
  await expect(dialog).toContainText('최신 원본을 대조한 기준으로 비공개 초안을 다시 저장했습니다.');
  let body = await (await request.get('/api/products')).json(), item = body.data.find((p: { id: string }) => p.id === 'nav-product-01');
  expect(item.storage).toBe('Frozen / 냉동'); expect(item.net_weight).toBe('2 kg');
  await dialog.getByRole('button', { name: '카탈로그에 반영', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  body = await (await request.get('/api/products')).json(); item = body.data.find((p: { id: string }) => p.id === 'nav-product-01');
  expect(item.storage).toBe('QA 원본 대조 후 냉장'); expect(item.net_weight).toBe('2 kg');
  expect(item.name).toBe('비비고 만두 1'); expect(item.sku).toBe('NAV-001');
});
