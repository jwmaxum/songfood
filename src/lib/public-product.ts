import type { ProductItem } from './types';
// Only the catalogue fields already used by the public storefront. Contract prices, discounts,
// exact stock and future internal columns must not be included by spreading a database row.
const PUBLIC_FIELDS = [
  'id','name','name_en','collection','category','box_qty','carton_box_qty','purchase_minimum',
  'rating','reviews_count','sku','format','finish','color','look','image_url','images','description','thickness','origin',
  'is_featured','is_todays_deal','is_best_seller','brand','manufacturer','country_of_origin',
  'net_weight','package_size','shelf_life','storage','ingredients','allergens','certifications','carton_qty',
  'carton_size','gross_weight','cbm','moq_cartons','hs_code','production_lead_time','export_packaging','loading_port','target_markets',
] as const satisfies readonly (keyof ProductItem)[];
export function publicProduct(product: ProductItem): ProductItem {
  return Object.fromEntries(PUBLIC_FIELDS.filter(key => product[key] !== undefined).map(key => [key,product[key]])) as unknown as ProductItem;
}
