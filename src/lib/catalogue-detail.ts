import type { ProductItem } from './types';
import type { Locale } from './i18n/locale';
import { CATALOGUE_PAGE_SIZE, catalogueHref, productAnchor, productHref, safeCatalogueReturn } from './catalogue-navigation';
import { filterProducts, readFilters, sortProducts } from './storefront';

export type CatalogueNeighbour = Pick<ProductItem, 'id' | 'name' | 'name_en'>;
export type DetailNavigation = {
  returnTo: string;
  fromResults: boolean;
  mode: 'domestic' | 'export';
  position: number;
  total: number;
  previous: CatalogueNeighbour | null;
  next: CatalogueNeighbour | null;
};

const neighbour = (product: ProductItem | undefined): CatalogueNeighbour | null =>
  product ? { id: product.id, name: product.name, name_en: product.name_en } : null;

/** Only the server's current public catalogue participates in result navigation. */
export function detailNavigation(products: ProductItem[], product: ProductItem, params: URLSearchParams): DetailNavigation {
  const trustedReturn = safeCatalogueReturn(params.get('returnTo'));
  const previousParams = new URLSearchParams(trustedReturn?.split('?')[1]?.split('#')[0] || '');
  const locale: Locale = params.get('lang') === 'en' ? 'en' : params.get('lang') === 'ko' ? 'ko' : previousParams.get('lang') === 'en' ? 'en' : 'ko';
  const mode = params.get('mode') === 'export' || (params.get('mode') !== 'domestic' && previousParams.get('mode') === 'export') ? 'export' : 'domestic';
  const defaults = new URLSearchParams();
  if (product.collection) defaults.set('collection', product.collection);
  if (product.category) defaults.set('category', product.category);
  const returnTo = catalogueHref(trustedReturn ? previousParams : defaults, { lang: locale, mode: mode === 'export' ? 'export' : '' });
  const resultParams = new URLSearchParams(returnTo.split('?')[1] || '');
  const results = sortProducts(filterProducts(products, readFilters(resultParams)), resultParams.get('sort') || '', resultParams.get('q') || '', locale);
  const index = results.findIndex(item => item.id === product.id);
  return {
    returnTo,
    fromResults: trustedReturn !== null,
    mode,
    position: index + 1,
    total: results.length,
    previous: index > 0 ? neighbour(results[index - 1]) : null,
    next: index >= 0 ? neighbour(results[index + 1]) : null,
  };
}

export function resultProductHref(productId: string, returnTo: string, position: number, locale: Locale): string {
  const params = new URLSearchParams(returnTo.split('?')[1]?.split('#')[0] || '');
  const page = Math.max(1, Math.ceil(position / CATALOGUE_PAGE_SIZE));
  return productHref(productId, catalogueHref(params, { page: String(page), lang: locale }), locale);
}

export function catalogueReturnForProduct(returnTo: string, productId: string): string {
  return returnTo.split('#')[0] + '#' + encodeURIComponent(productAnchor(productId));
}

/** Same product type first, then its collection; never repeat the current or duplicate IDs. */
export function relatedPublicProducts(products: ProductItem[], product: ProductItem, limit = 4): ProductItem[] {
  const seen = new Set([product.id]);
  return products
    .filter(item => item.collection === product.collection && item.id !== product.id)
    .sort((a, b) => {
      const sameA = !!product.category && a.category === product.category;
      const sameB = !!product.category && b.category === product.category;
      return Number(sameB) - Number(sameA) || a.id.localeCompare(b.id, 'en');
    })
    .filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .slice(0, limit);
}
