export type CatalogueLanguage = 'ko' | 'en';
export const CATALOGUE_PRODUCT_FIELDS = [
  'id', 'name', 'name_en', 'sku', 'collection', 'category', 'brand', 'manufacturer',
  'country_of_origin', 'origin', 'net_weight', 'package_size', 'format', 'shelf_life',
  'storage', 'image_url',
] as const;
export type CatalogueProduct = Record<typeof CATALOGUE_PRODUCT_FIELDS[number], string>;
export type CatalogueSnapshot = {
  version: 1;
  language: CatalogueLanguage;
  generated_at: string;
  filename: string;
  site_origin: string;
  seller: {name: string; email: string; phone: string; export_phone: string};
  products: CatalogueProduct[];
};
export type CatalogueImage = {bytes: Uint8Array; kind: 'png' | 'jpg'};
export const MAX_CATALOGUE_PRODUCTS = 500;
