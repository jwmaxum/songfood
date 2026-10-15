import ProductDetailPage from '@/app/products/[id]/page';
import { getPublicProducts } from '@/lib/products-db';
import { serverLanguage } from '@/lib/i18n/server';
import type { ProductItem } from '@/lib/types';

jest.mock('@/lib/products-db', () => ({ getPublicProducts: jest.fn() }));
jest.mock('@/lib/i18n/server', () => ({ serverLanguage: jest.fn() }));
jest.mock('next/navigation', () => ({ notFound: () => { throw new Error('NEXT_NOT_FOUND'); } }));
jest.mock('@/app/products/[id]/ProductDetailClient', () => ({ __esModule: true, default: () => null }));

const products = Array.from({ length: 12 }, (_, index) => ({
  id: String(index).padStart(2, '0'), name: '상품 ' + index, name_en: 'Product ' + index,
  collection: 'K-만두/냉동식품', category: '만두 & 교자', sku: 'MAN-' + index,
  image_url: '/product.jpg', description: 'Public description',
})) as ProductItem[];
beforeEach(() => {
  jest.mocked(getPublicProducts).mockResolvedValue(products.map(product => ({ ...product, purchase_minimum: { unit: 'CTN' as const, quantity: 2 } })));
  jest.mocked(serverLanguage).mockResolvedValue({ language: 'en' } as Awaited<ReturnType<typeof serverLanguage>>);
});

test('the request-time page limits client props to current product, related cards and neighbour names', async () => {
  const result = await ProductDetailPage({
    params: Promise.resolve({ id: '04' }),
    searchParams: Promise.resolve({ returnTo: '/shop?sort=sku&view=grid&page=2&mode=export&lang=en' }),
  });
  expect(result.props.product.id).toBe('04');
  expect(result.props.relatedProducts).toHaveLength(4);
  expect(result.props).not.toHaveProperty('products');
  expect(result.props.navigation.previous).toEqual({ id: '03', name: '상품 3', name_en: 'Product 3' });
  expect(result.props.navigation.next).toEqual({ id: '05', name: '상품 5', name_en: 'Product 5' });
  expect(result.props.navigation.mode).toBe('export');
});

test('direct detail uses the current server language and ignores repeated return arguments', async () => {
  const result = await ProductDetailPage({
    params: Promise.resolve({ id: '00' }),
    searchParams: Promise.resolve({ returnTo: ['/shop?q=other', '/shop?mode=export'], mode: 'export' }),
  });
  expect(result.props.navigation.fromResults).toBe(false);
  expect(result.props.navigation.returnTo).toContain('lang=en');
  expect(result.props.navigation.returnTo).toContain('mode=export');
  expect(result.props.navigation.returnTo).not.toContain('q=other');
});

test('an item absent from the current public catalogue remains a not found page', async () => {
  await expect(ProductDetailPage({
    params: Promise.resolve({ id: 'private-or-deleted' }),
    searchParams: Promise.resolve({ returnTo: '/shop?lang=en' }),
  })).rejects.toThrow('NEXT_NOT_FOUND');
});
