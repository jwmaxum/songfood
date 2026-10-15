/** @jest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProductDetailClient from '@/app/products/[id]/ProductDetailClient';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import { detailNavigation } from '@/lib/catalogue-detail';
import type { ProductItem } from '@/lib/types';

jest.mock('next/link', () => ({ __esModule: true, default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a> }));
jest.mock('@/components/pricing/ProductPrice', () => ({
  ProductPrice: () => <p>MOQ review required</p>,
  PurchasePanel: () => <section aria-label="domestic-purchase">Domestic purchase</section>,
}));
jest.mock('@/components/storefront/ExportSelection', () => ({
  __esModule: true, default: ({ reviewHref }: { reviewHref: string }) => <section aria-label="export-selection"><a href={reviewHref}>Review RFQ</a></section>,
}));
const mockPrices: Record<string, { export_moq_ctn: number; units: Record<string, never> }> = {};
jest.mock('@/context/PricingContext', () => ({ usePricing: () => ({ products: mockPrices }) }));
beforeEach(() => { for (const id of Object.keys(mockPrices)) delete mockPrices[id]; });
jest.mock('@/context/WishlistContext', () => ({ useWishlist: () => ({ toggleWishlist: jest.fn(), isInWishlist: () => false }) }));
const product = { id: 'b', name: '왕만두', name_en: 'King Dumplings', collection: 'K-만두/냉동식품', category: '만두 & 교자', sku: 'MAN-B', format: '1 kg', target_markets: ['USA'], image_url: '/product.jpg', description: '' } as ProductItem;
const related = { ...product, id: 'c', name: '김치만두', name_en: 'Kimchi Dumplings', sku: 'MAN-C' };
const previous = { ...product, id: 'a', name: '고기만두', name_en: 'Meat Dumplings', sku: 'MAN-A' };

test('English export detail has localized full breadcrumbs, result context, safe neighbours and distinct category navigation', () => {
  const returnTo = '/shop?q=dumplings&category=' + encodeURIComponent(product.category!) + '&sort=sku&page=2&view=grid&mode=export&lang=en&market=USA';
  mockPrices[product.id] = { export_moq_ctn: 8, units: {} };
  mockPrices[related.id] = { export_moq_ctn: 12, units: {} };
  const navigation = detailNavigation([previous, product, related], product, new URLSearchParams({ returnTo }));
  render(<LanguageProvider initialLanguage="en"><ProductDetailClient product={product} relatedProducts={[related]} navigation={navigation} /></LanguageProvider>);
  expect(screen.getByRole('heading', { level: 1, name: 'King Dumplings' })).toBeInTheDocument();
  const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
  expect(within(breadcrumb).getByText('Dumplings & Frozen Foods')).toBeInTheDocument();
  expect(within(breadcrumb).getByText('Dumplings & Gyoza')).toBeInTheDocument();
  expect(within(breadcrumb).getByText('King Dumplings')).toHaveAttribute('aria-current', 'page');
  const back = new URL(screen.getByRole('link', { name: /Back to results/ }).getAttribute('href')!, 'https://songfood.invalid');
  expect(back.hash).toBe('#product-b'); expect(back.searchParams.get('page')).toBe('2');
  expect(back.searchParams.get('q')).toBe('dumplings'); expect(back.searchParams.get('view')).toBe('grid'); expect(back.searchParams.get('mode')).toBe('export');
  const category = new URL(screen.getByRole('link', { name: 'Browse all Dumplings & Gyoza' }).getAttribute('href')!, 'https://songfood.invalid');
  expect(category.searchParams.has('q')).toBe(false); expect(category.searchParams.get('category')).toBe(product.category); expect(category.searchParams.get('mode')).toBe('export');
  expect(screen.getByRole('region', { name: 'export-selection' })).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'domestic-purchase' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Review RFQ' })).toHaveAttribute('href', '/rfq?mode=export&lang=en');
  expect(screen.getByRole('link', { name: /Previous product.*Meat Dumplings/ })).toHaveAttribute('rel', 'prev');
  expect(screen.getByRole('link', { name: /Next product.*Kimchi Dumplings/ })).toHaveAttribute('rel', 'next');
  const relatedLink = screen.getByRole('link', { name: 'Kimchi Dumplings' });
  expect(relatedLink.querySelector('img')).toHaveAttribute('src', '/product.jpg');
  expect(new URL(relatedLink.getAttribute('href')!, 'https://songfood.invalid').searchParams.get('returnTo')).toContain('page=2');
  expect(screen.getByRole('link', { name: 'Export RFQ' })).toHaveAttribute('aria-current', 'page');
  const domestic = new URL(screen.getByRole('link', { name: 'Korea wholesale & bulk' }).getAttribute('href')!, 'https://songfood.invalid');
  expect(domestic.searchParams.has('mode')).toBe(false);
  expect(new URL(domestic.searchParams.get('returnTo')!, 'https://songfood.invalid').searchParams.has('market')).toBe(false);
  expect(screen.queryByText('MOQ review required')).not.toBeInTheDocument();
  expect(screen.getByText('Export MOQ: 8 CTN')).toBeInTheDocument();
  expect(screen.getByText('Export MOQ: 12 CTN')).toBeInTheDocument();
  expect(screen.getAllByText('FOB quotation requires review.')).toHaveLength(2);
});

test('English domestic direct detail uses English names with domestic buying and a category fallback', () => {
  const navigation = detailNavigation([product], product, new URLSearchParams('lang=en'));
  render(<LanguageProvider initialLanguage="en"><ProductDetailClient product={product} relatedProducts={[]} navigation={navigation} /></LanguageProvider>);
  expect(screen.getByRole('heading', { name: 'King Dumplings' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Browse this category/ })).toHaveAttribute('href', expect.stringContaining('category='));
  expect(screen.getByRole('region', { name: 'domestic-purchase' })).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'export-selection' })).not.toBeInTheDocument();
  expect(screen.getByText('No previous product')).toHaveAttribute('aria-disabled', 'true');
  expect(screen.getByText('No next product')).toHaveAttribute('aria-disabled', 'true');
  expect(screen.queryByRole('link', { name: /Previous product/ })).not.toBeInTheDocument();
  expect(screen.getByText('MOQ review required')).toBeInTheDocument();
});


test('client navigation to another product resets the selected photo even when its gallery shares the previous URL', () => {
 const first = { ...product, image_url: '/first.jpg', images: ['/first.jpg', '/shared-extra.jpg'] };
 const second = { ...related, image_url: '/second.jpg', images: ['/second.jpg', '/shared-extra.jpg'] };
 const view = (item: ProductItem) => <LanguageProvider initialLanguage="en"><ProductDetailClient product={item} relatedProducts={[]} navigation={detailNavigation([item], item, new URLSearchParams('lang=en'))} /></LanguageProvider>;
 const { rerender } = render(view(first));
 fireEvent.click(screen.getByRole('button', { name: 'Product image 2' })); expect(screen.getByRole('img', { name: 'King Dumplings' })).toHaveAttribute('src', '/shared-extra.jpg');
 rerender(view(second)); expect(screen.getByRole('img', { name: 'Kimchi Dumplings' })).toHaveAttribute('src', '/second.jpg');
 expect(screen.getByRole('button', { name: 'Product image 1' })).toHaveAttribute('aria-pressed', 'true');
});

test('removing the selected photo from the same product falls back to its first remaining image or placeholder', () => {
 const item = { ...product, image_url: '/first.jpg', images: ['/first.jpg', '/removed-extra.jpg'] };
 const view = (current: ProductItem) => <LanguageProvider initialLanguage="en"><ProductDetailClient product={current} relatedProducts={[]} navigation={detailNavigation([current], current, new URLSearchParams('lang=en'))} /></LanguageProvider>;
 const { rerender } = render(view(item)); fireEvent.click(screen.getByRole('button', { name: 'Product image 2' }));
 rerender(view({ ...item, images: ['/first.jpg'] })); expect(screen.getByRole('img', { name: 'King Dumplings' })).toHaveAttribute('src', '/first.jpg');
 rerender(view({ ...item, image_url: '', images: [] })); expect(screen.getByRole('img', { name: 'King Dumplings' })).toHaveAttribute('src', '/images/products/coming-soon.png');
});
