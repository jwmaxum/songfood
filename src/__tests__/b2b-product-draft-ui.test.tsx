/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProductManager from '@/app/admin/products/ProductManagerV2';
import { storageGroup } from '@/lib/storefront';
import type { ProductItem } from '@/lib/types';
import type { ProductDraft } from '@/lib/product-drafts/types';
jest.mock('next/link', () => ({ __esModule: true, default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a> }));
const initialProduct = { id: 'product-existing', name: '기존 상품', name_en: '', sku: 'EXIST-001', collection: 'K-만두/냉동식품', category: '만두 & 교자', format: '1 kg', storage: '냉동', image_url: '/logo.png', description: '', price: 1200, stock: 0 } as ProductItem;
let catalogue: ProductItem[], saved: ProductDraft[], conflict: boolean, publishFailure: number, fetcher: jest.Mock;
const response = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body });
beforeEach(() => {
 catalogue = [{ ...initialProduct }]; saved = []; conflict = false; publishFailure = 0;
 fetcher = jest.fn(async (input: string, options?: RequestInit) => {
  const url = new URL(input, 'https://songfood.invalid');
  if (url.pathname === '/api/products') return response({ success: true, data: catalogue });
  if (url.pathname !== '/api/admin/product-drafts') throw new Error('Unexpected URL');
  if (!options?.method) {
   if (url.searchParams.has('id')) return response({ draft: saved.find(item => item.id === url.searchParams.get('id')) });
   if (url.searchParams.has('product_id')) return response({ product: catalogue[0], base_hash: 'a'.repeat(64), draft: saved.find(item => item.product_id === catalogue[0].id && item.status === 'draft') || null });
   return response({ drafts: saved });
  }
  const body = JSON.parse(options.body as string);
  if (conflict) return response({ error: '초안 또는 원본이 변경되었습니다.' }, 409);
  const previous = saved.find(item => item.id === body.id);
  if (options.method === 'POST') {
   const item = { id: previous?.id || '00000000-0000-4000-8000-000000000001', product_id: body.product_id, revision: (previous?.revision || 0) + 1, data: body.data, source_notes: body.source_notes, base_hash: body.base_hash || null, base_product: body.rebase ? { ...catalogue[0] } : previous?.base_product || (body.product_id ? { ...catalogue[0] } : null), status: 'draft', updated_at: '2026-10-15T00:00:00Z', created_at: '2026-10-15T00:00:00Z', created_by: 'staff', updated_by: 'staff' } as ProductDraft;
   saved = [item]; return response({ success: true, draft: item });
  }
  if (options.method === 'PUT' && previous) {
   if (publishFailure) return response({ error: publishFailure === 409 ? '초안 버전이 변경되었습니다.' : '카탈로그 연결에 실패했습니다.' }, publishFailure);
   const product = { ...(previous.base_product || {}), ...previous.data, id: previous.product_id || 'new-published-product' } as ProductItem;
   for (const key of ['name', 'name_en', 'collection', 'category']) if (!String(product[key as keyof ProductItem] || '').trim()) Object.assign(product, { [key]: null });
   if (!product.sku) product.sku = 'AUTO-10000000-0000-4000-8000-000000000001';
   const item = { ...previous, status: 'published', revision: previous.revision + 1 } as ProductDraft;
   saved = [item]; catalogue = [product, ...catalogue.filter(p => p.id !== product.id)];
   return response({ success: true, draft: item, product });
  }
  throw new Error('Unexpected request');
 });
 global.fetch = fetcher;
 jest.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => { cleanup(); jest.restoreAllMocks(); });
async function startNew() {
 render(<ProductManager />);
 const add = screen.getByRole('button', { name: '+ 상품 초안 만들기' }); await waitFor(() => expect(add).toBeEnabled()); fireEvent.click(add);
 return screen.getByRole('dialog');
}
const write = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name, { exact: true }), { target: { value } });

test('a name-only sparse private draft saves and resumes without invented categories, stock or prices', async () => {
 const dialog = await startNew();
 expect(within(dialog).getByLabelText('대분류')).toHaveValue('');
 expect(within(dialog).getByLabelText('기존 참고 판매가 (선택)')).toHaveValue(null);
 write('상품명 (한국어)', '실제 자료 작성 중');
 write('규격서 출처·확인 메모', '비공개 규격서 문서명 확인 중');
 fireEvent.click(within(dialog).getByRole('button', { name: '비공개 임시저장' }));
 await screen.findByText(/비공개 초안을 DB에 임시저장했습니다/);
 await waitFor(() => expect(within(dialog).getByRole('status')).toHaveFocus());
 const call = fetcher.mock.calls.find(([, o]) => o?.method === 'POST')!;
 expect(JSON.parse(call[1].body)).toMatchObject({ product_id: null, revision: 0, data: { name: '실제 자료 작성 중' }, source_notes: { specification: '비공개 규격서 문서명 확인 중', label: '', sales_terms: '' } });
 expect(Object.keys(JSON.parse(call[1].body).data)).toEqual(['name']);
 expect(catalogue).toHaveLength(1);
 expect(within(dialog).getByRole('button', { name: '카탈로그에 반영' })).toBeEnabled();
 fireEvent.click(within(dialog).getAllByRole('button', { name: '닫기' })[0]);
 fireEvent.click(screen.getByRole('button', { name: '계속 작성' }));
 expect(await screen.findByLabelText('규격서 출처·확인 메모')).toHaveValue('비공개 규격서 문서명 확인 중');
 expect(screen.getByLabelText('상품명 (한국어)')).toHaveValue('실제 자료 작성 중');
});

test('an existing product saves only changed fields while preserving untouched values and private notes', async () => {
 render(<ProductManager />);
 fireEvent.click(await screen.findByRole('button', { name: '기존 상품 수정' }));
 const dialog = await screen.findByRole('dialog');
 expect(screen.getByLabelText('판매 규격')).toHaveValue('1 kg');
 write('보관 방법', '냉장 확인 자료');
 write('원본 라벨 출처·확인 메모', '공급사 원본 라벨 검토 중');
 fireEvent.click(within(dialog).getByRole('button', { name: '비공개 임시저장' }));
 await screen.findByText(/비공개 초안을 DB에 임시저장했습니다/);
 const call = fetcher.mock.calls.find(([, o]) => o?.method === 'POST')!;
 expect(JSON.parse(call[1].body).data).toEqual({ storage: '냉장 확인 자료' });
 expect(JSON.parse(call[1].body).base_hash).toBe('a'.repeat(64));
 expect(catalogue[0].storage).toBe('냉동');
 fireEvent.click(within(dialog).getByRole('button', { name: '카탈로그에 반영' }));
 await screen.findByText(/카탈로그에 반영했습니다/);
 expect(catalogue[0]).toMatchObject({ storage: '냉장 확인 자료', name: initialProduct.name, format: '1 kg', price: 1200 });
 expect(catalogue[0]).not.toHaveProperty('source_notes');
});

test('a saved identity-only new product may be explicitly applied without a legacy price or invented metadata', async () => {
 const dialog = await startNew();
 write('상품명 (한국어)', '식별정보만 확인한 상품'); write('SKU', 'IDENTITY-001');
 fireEvent.change(screen.getByLabelText('대분류', { exact: true }), { target: { value: 'K-만두/냉동식품' } });
 fireEvent.change(screen.getByLabelText('제품 종류', { exact: true }), { target: { value: '만두 & 교자' } });
 fireEvent.click(within(dialog).getByRole('button', { name: '비공개 임시저장' }));
 await screen.findByText(/비공개 초안을 DB에 임시저장했습니다/);
 fireEvent.click(within(dialog).getByRole('button', { name: '카탈로그에 반영' }));
 await screen.findByText(/카탈로그에 반영했습니다/);
 const product = catalogue.find(item => item.sku === 'IDENTITY-001')!;
 expect(product).toBeTruthy(); expect(product).not.toHaveProperty('price'); expect(product).not.toHaveProperty('storage'); expect(product).not.toHaveProperty('source_notes');
});

test('a stale save keeps the operator input and stops another overwrite until explicit review', async () => {
 const dialog = await startNew(); write('상품명 (한국어)', '보존할 미저장 입력'); conflict = true;
 fireEvent.click(within(dialog).getByRole('button', { name: '비공개 임시저장' }));
 await screen.findByRole('alert');
 expect(screen.getByLabelText('상품명 (한국어)')).toHaveValue('보존할 미저장 입력');
 expect(within(dialog).getByRole('button', { name: '비공개 임시저장' })).toBeDisabled();
 expect(within(dialog).getByRole('button', { name: '카탈로그에 반영' })).toBeDisabled();
 expect(catalogue[0]).toEqual(initialProduct);
});

test('nullable unopened storage remains unknown until actual storage information is entered', () => {
 expect(storageGroup(null)).toBe('unknown'); expect(storageGroup(undefined)).toBe('unknown');
 expect(storageGroup('')).toBe('unknown');
});

test('a changed original is compared before an explicit private rebase save', async () => {
 render(<ProductManager />);
 fireEvent.click(await screen.findByRole('button', { name: '기존 상품 수정' }));
 const dialog = await screen.findByRole('dialog');
 write('보관 방법', '원본 대조 후 적용할 값');
 fireEvent.click(within(dialog).getByRole('button', { name: '비공개 임시저장' }));
 await screen.findByText(/비공개 초안을 DB에 임시저장했습니다/);
 catalogue[0] = { ...catalogue[0], net_weight: '2 kg' }; conflict = true;
 fireEvent.click(within(dialog).getByRole('button', { name: '카탈로그에 반영' }));
 await screen.findByRole('alert'); conflict = false;
 fireEvent.click(within(dialog).getByRole('button', { name: '현재 상품 원본과 대조' }));
 const comparison = await screen.findByRole('region', { name: '상품 원본 변경 대조' });
 expect(within(comparison).getByText('현재 상품: 2 kg')).toBeInTheDocument();
 fireEvent.click(within(comparison).getByRole('button', { name: '대조한 현재 원본 기준으로 초안 재저장' }));
 await screen.findByText(/최신 원본을 대조한 기준으로 비공개 초안을 다시 저장했습니다/);
 const postCalls = fetcher.mock.calls.filter(([, options]) => options?.method === 'POST');
 expect(JSON.parse(postCalls[postCalls.length - 1][1].body)).toMatchObject({ rebase: true, base_hash: 'a'.repeat(64), data: { storage: '원본 대조 후 적용할 값' } });
 expect(catalogue[0].storage).toBe('냉동'); expect(catalogue[0].net_weight).toBe('2 kg');
});

test('explicit reload of a draft already published by another staff returns to the current catalogue', async () => {
 render(<ProductManager />);
 fireEvent.click(await screen.findByRole('button', { name: '기존 상품 수정' }));
 const dialog = await screen.findByRole('dialog');
 write('보관 방법', '보존 중인 수정');
 fireEvent.click(within(dialog).getByRole('button', { name: '비공개 임시저장' }));
 await screen.findByText(/비공개 초안을 DB에 임시저장했습니다/);
 conflict = true; fireEvent.click(within(dialog).getByRole('button', { name: '카탈로그에 반영' })); await screen.findByRole('alert');
 saved[0] = { ...saved[0], status: 'published', revision: saved[0].revision + 1 };
 fireEvent.click(within(dialog).getByRole('button', { name: '최신 저장 자료 다시 불러오기' }));
 await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
 expect(await screen.findByText(/다른 직원이 이미 카탈로그에 반영한 초안입니다/)).toBeInTheDocument();
});


test('an English-only name is directly published after saving without a client-invented SKU or category', async () => {
 const dialog = await startNew();
 write('상품명 (영어)', 'Actual English name');
 expect(within(dialog).getByRole('button', { name: '카탈로그에 반영' })).toBeEnabled();
 fireEvent.click(within(dialog).getByRole('button', { name: '카탈로그에 반영' }));
 await screen.findByText(/카탈로그에 반영했습니다/);
 const post = fetcher.mock.calls.find(([, options]) => options?.method === 'POST')!;
 expect(JSON.parse(post[1].body).data).toEqual({ name_en: 'Actual English name' });
 const put = fetcher.mock.calls.find(([, options]) => options?.method === 'PUT')!;
 expect(JSON.parse(put[1].body)).toMatchObject({ id: '00000000-0000-4000-8000-000000000001', revision: 1 });
 const published = catalogue.find(product => product.name_en === 'Actual English name')!;
 expect(published).toMatchObject({ name: null, name_en: 'Actual English name', sku: 'AUTO-10000000-0000-4000-8000-000000000001', collection: null, category: null });
 expect(published).not.toHaveProperty('price');
 expect(screen.getByRole('checkbox', { name: 'Actual English name PDF 선택' })).toBeInTheDocument();
}, 15000);


test('direct publish preserves the saved private draft after a failed apply and retries its saved revision', async () => {
 const dialog = await startNew(); write('상품명 (한국어)', '상품명만 바로 반영'); publishFailure = 503;
 expect(within(dialog).getByRole('button', { name: '카탈로그에 반영' })).toBeEnabled();
 fireEvent.click(within(dialog).getByRole('button', { name: '카탈로그에 반영' }));
 await screen.findByText(/초안은 임시저장되었지만 카탈로그에 반영하지 못했습니다/);
 expect(saved[0]).toMatchObject({ status: 'draft', revision: 1, data: { name: '상품명만 바로 반영' } });
 expect(screen.getByLabelText('상품명 (한국어)')).toHaveValue('상품명만 바로 반영');
 expect(catalogue).toHaveLength(1); publishFailure = 0;
 fireEvent.click(within(dialog).getByRole('button', { name: '카탈로그에 반영' }));
 await screen.findByText(/카탈로그에 반영했습니다/);
 expect(fetcher.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1);
 const publications = fetcher.mock.calls.filter(([, options]) => options?.method === 'PUT');
 expect(publications).toHaveLength(2); expect(JSON.parse(publications[1][1].body)).toMatchObject({ revision: 1 });
 expect(catalogue.find(product => product.name === '상품명만 바로 반영')).toBeTruthy();
});

test('a conflict in direct publish keeps the newly saved draft and operator input without retrying blindly', async () => {
 const dialog = await startNew(); write('상품명 (한국어)', '충돌 후 보존할 상품'); publishFailure = 409;
 fireEvent.click(within(dialog).getByRole('button', { name: '카탈로그에 반영' }));
 await screen.findByText(/초안은 임시저장되었지만 카탈로그에 반영하지 못했습니다/);
 expect(within(dialog).getByRole('alert')).toHaveTextContent('내 입력은 보존되어 있습니다.');
 expect(screen.getByLabelText('상품명 (한국어)')).toHaveValue('충돌 후 보존할 상품');
 expect(within(dialog).getByRole('button', { name: '카탈로그에 반영' })).toBeDisabled();
 expect(saved[0]).toMatchObject({ status: 'draft', revision: 1, data: { name: '충돌 후 보존할 상품' } });
 expect(catalogue).toHaveLength(1);
});
