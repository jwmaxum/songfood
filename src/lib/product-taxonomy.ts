import taxonomy from '../../data/product-taxonomy.json';

export const PRODUCT_TAXONOMY: ReadonlyArray<{
  collection: string;
  categories: readonly string[];
}> = taxonomy;

export const PRODUCT_COLLECTIONS = PRODUCT_TAXONOMY.map((item) => item.collection);

export function categoriesForCollection(collection: string): readonly string[] {
  return PRODUCT_TAXONOMY.find((item) => item.collection === collection)?.categories ?? [];
}

export function isValidProductCategory(collection: string, category: string): boolean {
  return categoriesForCollection(collection).includes(category);
}
