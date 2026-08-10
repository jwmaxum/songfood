import { ProductItem } from './types';

export function getStoredProductsOverride(): ProductItem[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('songfood_products_override');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read songfood_products_override:', e);
  }
  return null;
}

export function saveStoredProductsOverride(products: ProductItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('songfood_products_override', JSON.stringify(products));
    window.dispatchEvent(new Event('songfood_products_updated'));
  } catch (e) {
    console.error('Failed to save songfood_products_override:', e);
  }
}
