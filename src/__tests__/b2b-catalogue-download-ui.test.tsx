/** @jest-environment jsdom */
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProductManager from '@/app/admin/products/ProductManagerV2';
import type { ProductItem } from '@/lib/types';
jest.mock('next/link', () => ({ __esModule: true, default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a> }));
jest.mock('@/lib/catalogue/pdf-client', () => ({ createCataloguePdf: jest.fn() }), { virtual: true });
const renderPdf = jest.requireMock('@/lib/catalogue/pdf-client').createCataloguePdf as jest.Mock;
const product = (index: number) => ({ id: 'catalogue-' + index, name: index === 1 ? '선택 대상 하나' : '등록 상품 ' + index, name_en: 'Catalogue product ' + index, sku: 'CAT-' + index, collection: '', category: '', image_url: '' } as ProductItem);
let products: ProductItem[], fetcher: jest.Mock, responseStatus: number, filename: string, downloads: { filename: string; href: string }[];
const response = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body });
beforeEach(() => {
 products = Array.from({ length: 53 }, (_, index) => product(index + 1)); responseStatus = 200; filename = 'songfood-catalogue-en-2026-10-15.pdf'; downloads = [];
 renderPdf.mockReset().mockResolvedValue(new Uint8Array([37, 80, 68, 70, 45]));
 Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: jest.fn(() => 'blob:catalogue-test') });
 Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: jest.fn() });
 jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function(this: HTMLAnchorElement) { downloads.push({ filename: this.download, href: this.href }); });
 fetcher = jest.fn(async (input: string, options?: RequestInit) => {
  const url = new URL(input, 'https://songfood.invalid');
  if (url.pathname === '/api/products') return response({ success: true, data: products });
  if (url.pathname === '/api/admin/product-drafts') return response({ drafts: [{ id: 'private-draft', status: 'draft', data: { name: '비공개 제외 상품' }, revision: 1, product_id: null }] });
  if (url.pathname === '/api/admin/catalogue/pdf') {
   const body = JSON.parse(options!.body as string);
   return response(responseStatus === 200 ? { success: true, catalogue: { filename, language: body.language, products: products.filter(item => body.product_ids.includes(item.id)).map(item => ({ id: item.id, name: item.name })) } } : { error: '권한 없음' }, responseStatus);
  }
  throw Error('Unexpected URL');
 });
 global.fetch = fetcher;
});
afterEach(() => { cleanup(); jest.restoreAllMocks(); });
async function start() {
 render(<ProductManager />);
 await waitFor(() => expect(screen.getByRole('button', { name: '등록 상품 전체 53개 선택' })).toBeEnabled());
 return screen.getByRole('region', { name: '카탈로그 PDF' });
}
const pdfRequests = () => fetcher.mock.calls.filter(([url]) => url === '/api/admin/catalogue/pdf');

test('selecting all exports the entire 53-product catalogue despite an active search and excludes private drafts', async () => {
 const region = await start();
 expect(within(region).getByRole('button', { name: '선택 상품 PDF 다운로드' })).toBeDisabled();
 expect(screen.getAllByRole('checkbox')).toHaveLength(53);
 fireEvent.change(screen.getByLabelText('카탈로그 상품 검색'), { target: { value: '선택 대상 하나' } });
 expect(screen.getAllByRole('checkbox')).toHaveLength(1);
 fireEvent.click(within(region).getByRole('button', { name: '등록 상품 전체 53개 선택' }));
 expect(region).toHaveTextContent('선택 53개 / 등록 53개 · 검색 결과 1개 · 검색 밖 선택 52개');
 fireEvent.change(within(region).getByRole('combobox', { name: 'PDF 언어 / Language' }), { target: { value: 'en' } });
 fireEvent.click(within(region).getByRole('button', { name: '선택 상품 PDF 다운로드' }));
 await within(region).findByText('선택한 53개 상품의 PDF 다운로드를 시작했습니다.');
 const options = pdfRequests()[0][1];
 expect(JSON.parse(options.body)).toEqual({ product_ids: products.map(item => item.id), language: 'en' });
 expect(options).toMatchObject({ method: 'POST', credentials: 'same-origin', cache: 'no-store' });
 expect(renderPdf).toHaveBeenCalledWith(expect.objectContaining({ language: 'en', products: expect.arrayContaining([{ id: 'catalogue-53', name: '등록 상품 53' }]) }));
 expect(downloads).toEqual([{ filename, href: 'blob:catalogue-test' }]);
 expect(JSON.stringify(renderPdf.mock.calls)).not.toContain('비공개 제외 상품');
 fireEvent.click(within(region).getByRole('button', { name: '선택 해제' }));
 expect(within(region).getByRole('button', { name: '선택 상품 PDF 다운로드' })).toBeDisabled();
 expect(screen.getByRole('checkbox', { name: '선택 대상 하나 PDF 선택' })).not.toBeChecked();
});

test('a single checkbox downloads Korean by default without widening the selection', async () => {
 const region = await start();
 fireEvent.click(screen.getByRole('checkbox', { name: '등록 상품 53 PDF 선택' }));
 fireEvent.click(within(region).getByRole('button', { name: '선택 상품 PDF 다운로드' }));
 await within(region).findByText('선택한 1개 상품의 PDF 다운로드를 시작했습니다.');
 expect(JSON.parse(pdfRequests()[0][1].body)).toEqual({ product_ids: ['catalogue-53'], language: 'ko' });
});

test('rendering stays busy through client PDF creation and preserves selection after an error for retry', async () => {
 const region = await start();
 let rejectPdf: (error: Error) => void = () => {};
 renderPdf.mockReturnValueOnce(new Promise<Uint8Array>((_resolve, reject) => { rejectPdf = reject; }));
 fireEvent.click(screen.getByRole('checkbox', { name: '선택 대상 하나 PDF 선택' }));
 fireEvent.click(within(region).getByRole('button', { name: '선택 상품 PDF 다운로드' }));
 await waitFor(() => expect(renderPdf).toHaveBeenCalledTimes(1));
 expect(within(region).getByRole('button', { name: 'PDF 생성 중…' })).toBeDisabled();
 expect(within(region).getByRole('button', { name: '선택 해제' })).toBeDisabled();
 expect(screen.getByRole('checkbox', { name: '선택 대상 하나 PDF 선택' })).toBeDisabled();
 await act(async () => rejectPdf(Error('폰트 자료 연결에 실패했습니다.')));
 expect(await within(region).findByRole('alert')).toHaveTextContent('폰트 자료 연결에 실패했습니다.');
 expect(screen.getByRole('checkbox', { name: '선택 대상 하나 PDF 선택' })).toBeChecked();
 expect(downloads).toEqual([]);
 filename = '../../invalid.pdf';
 fireEvent.click(within(region).getByRole('button', { name: '선택 상품 PDF 다운로드' }));
 await within(region).findByText('선택한 1개 상품의 PDF 다운로드를 시작했습니다.');
 expect(downloads[0].filename).toBe('songfood-catalogue-ko.pdf');
 expect(pdfRequests()).toHaveLength(2);
});

test('a forbidden snapshot asks for authentication and keeps the selected products without rendering or downloading', async () => {
 const region = await start(); responseStatus = 403;
 fireEvent.click(screen.getByRole('checkbox', { name: '선택 대상 하나 PDF 선택' }));
 fireEvent.click(within(region).getByRole('button', { name: '선택 상품 PDF 다운로드' }));
 expect(await within(region).findByRole('alert')).toHaveTextContent('다시 로그인해 주세요.');
 expect(screen.getByRole('checkbox', { name: '선택 대상 하나 PDF 선택' })).toBeChecked();
 expect(within(region).getByRole('button', { name: '선택 상품 PDF 다운로드' })).toBeEnabled();
 expect(renderPdf).not.toHaveBeenCalled(); expect(downloads).toEqual([]);
});

test('refresh removes deleted products from selection while preserving every remaining selection', async () => {
 const region = await start(); fireEvent.click(within(region).getByRole('button', { name: '등록 상품 전체 53개 선택' }));
 products = products.filter(item => item.id !== 'catalogue-53');
 fireEvent.click(screen.getByRole('button', { name: '목록 새로고침' }));
 await waitFor(() => expect(region).toHaveTextContent('선택 52개 / 등록 52개'));
 expect(screen.getAllByRole('checkbox')).toHaveLength(52);
 expect(screen.getAllByRole('checkbox').every(input => (input as HTMLInputElement).checked)).toBe(true);
 fireEvent.click(within(region).getByRole('button', { name: '선택 상품 PDF 다운로드' }));
 await within(region).findByText('선택한 52개 상품의 PDF 다운로드를 시작했습니다.');
 expect(JSON.parse(pdfRequests()[0][1].body).product_ids).not.toContain('catalogue-53');
});

test('more than 500 selections require splitting the PDF before any snapshot request is sent', async () => {
 products = Array.from({ length: 501 }, (_, index) => product(index + 1)); render(<ProductManager />);
 const region = screen.getByRole('region', { name: '카탈로그 PDF' });
 await waitFor(() => expect(within(region).getByRole('button', { name: '등록 상품 전체 501개 선택' })).toBeEnabled());
 fireEvent.click(within(region).getByRole('button', { name: '등록 상품 전체 501개 선택' }));
 expect(within(region).getByRole('button', { name: '선택 상품 PDF 다운로드' })).toBeDisabled();
 expect(region).toHaveTextContent('일부 선택을 해제한 뒤 나누어 다운로드하세요.');
 expect(pdfRequests()).toHaveLength(0);
});
