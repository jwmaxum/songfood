import { catalogueReturnForProduct, detailNavigation, relatedPublicProducts, resultProductHref } from '@/lib/catalogue-detail';
import type { ProductItem } from '@/lib/types';
import { productHref } from '@/lib/catalogue-navigation';

const make = (id: string, category = '만두 & 교자', extra: Partial<ProductItem> = {}): ProductItem => ({
  id, name: '만두 ' + id, name_en: 'Dumpling ' + id, collection: 'K-만두/냉동식품',
  category, sku: 'DUM-' + id, format: '1 kg', finish: '', color: '', look: '',
  image_url: '/images/products/coming-soon.png', description: '', ...extra,
});
const current = make('b');
const products = [make('c'), current, make('a'), make('z', '다른 유형'), make('outside', '소스 & 양념', { collection: 'K-소스/장류' })];
const context = (returnTo: string, extra = '') => new URLSearchParams('returnTo=' + encodeURIComponent(returnTo) + extra);

test('result detail preserves filters, page, view, sort, export and independent English language', () => {
  const returnTo = '/shop?q=dumpling&collection=' + encodeURIComponent(current.collection) + '&category=' + encodeURIComponent(current.category!) + '&page=2&view=grid&sort=sku&mode=export&lang=en';
  const nav = detailNavigation(products, current, context(returnTo));
  const query = new URL(nav.returnTo, 'https://songfood.invalid').searchParams;
  expect(nav).toMatchObject({ fromResults: true, mode: 'export', position: 2, total: 3, previous: { id: 'a' }, next: { id: 'c' } });
  expect(Object.fromEntries(query)).toMatchObject({ q: 'dumpling', collection: current.collection, category: current.category, page: '2', view: 'grid', sort: 'sku', mode: 'export', lang: 'en' });
  const next = new URL(productHref(nav.next!.id, nav.returnTo, 'en'), 'https://songfood.invalid');
  expect(next.searchParams.get('returnTo')).toBe(nav.returnTo);
  expect(next.searchParams.get('mode')).toBe('export');
  expect(next.searchParams.get('lang')).toBe('en');
  expect(nav.previous).toEqual({ id: 'a', name: '만두 a', name_en: 'Dumpling a' });
  expect(nav.previous).not.toHaveProperty('description');
});

test('the first and last current results do not wrap', () => {
  const returnTo = '/shop?category=' + encodeURIComponent(current.category!) + '&sort=sku';
  const first = detailNavigation(products, products[2], context(returnTo));
  expect(first.previous).toBeNull(); expect(first.next?.id).toBe('b');
  const last = detailNavigation(products, products[0], context(returnTo));
  expect(last.previous?.id).toBe('b'); expect(last.next).toBeNull();
});

test('invalid external return paths and a direct new tab use current category rather than browser history', () => {
  for (const returnTo of ['https://evil.example/shop', '//evil.example/shop', '/admin/users', '/shop\\evil', '/shop?x=%0aevil']) {
    const nav = detailNavigation(products, current, context(returnTo, '&mode=export&lang=en'));
    const query = new URL(nav.returnTo, 'https://songfood.invalid').searchParams;
    expect(nav.fromResults).toBe(false); expect(nav.mode).toBe('export');
    expect(query.get('category')).toBe(current.category); expect(query.get('collection')).toBe(current.collection);
    expect(query.get('lang')).toBe('en'); expect(query.has('x')).toBe(false);
  }
  const direct = detailNavigation(products, current, new URLSearchParams('lang=en'));
  expect(direct.fromResults).toBe(false); expect(direct.mode).toBe('domestic'); expect(direct.total).toBe(3);
});

test('language and explicit channel changes update the return context without changing the selected filters', () => {
  const nav = detailNavigation(products, current, context('/shop?category=' + encodeURIComponent(current.category!) + '&mode=export&lang=en&view=list', '&mode=domestic&lang=ko'));
  const query = new URL(nav.returnTo, 'https://songfood.invalid').searchParams;
  expect(nav.mode).toBe('domestic'); expect(query.has('mode')).toBe(false); expect(query.get('lang')).toBe('ko');
  expect(query.get('category')).toBe(current.category); expect(query.get('view')).toBe('list');
});

test('a stale result no longer containing this product offers no made-up previous or next', () => {
  const nav = detailNavigation(products, current, context('/shop?q=no-such-product&mode=export&lang=en'));
  expect(nav).toMatchObject({ fromResults: true, position: 0, total: 0, previous: null, next: null });
  expect(new URL(nav.returnTo, 'https://songfood.invalid').searchParams.get('q')).toBe('no-such-product');
});

test('related products prefer product type, exclude current and duplicates, then same collection in a stable order', () => {
  const input = [make('aa', '다른 유형'), make('c'), current, make('a'), make('a'), products[4], make('z', '다른 유형')];
  expect(relatedPublicProducts(input, current).map(item => item.id)).toEqual(['a', 'c', 'aa', 'z']);
  expect(relatedPublicProducts([...input].reverse(), current).map(item => item.id)).toEqual(['a', 'c', 'aa', 'z']);
  expect(input.map(item => item.id)).toEqual(['aa', 'c', 'b', 'a', 'a', 'outside', 'z']);
});

test('result neighbours crossing page boundaries return to the page containing the target product', () => {
  const returnTo = '/shop?q=mandu&page=2&view=grid&sort=sku&mode=export&lang=en';
  for (const [position, page] of [[12, '1'], [25, '3']]) {
    const detail = new URL(resultProductHref('target', returnTo, Number(position), 'en'), 'https://songfood.invalid');
    const result = new URL(detail.searchParams.get('returnTo')!, 'https://songfood.invalid');
    expect(result.searchParams.get('page')).toBe(page);
    expect(result.searchParams.get('q')).toBe('mandu');
    expect(result.searchParams.get('mode')).toBe('export');
    expect(result.searchParams.get('view')).toBe('grid');
  }
});

test('back to results carries an exact encoded product anchor without retaining another product hash', () => {
  expect(catalogueReturnForProduct('/shop?q=mandu&page=2#product-old', 'b')).toBe('/shop?q=mandu&page=2#product-b');
});
