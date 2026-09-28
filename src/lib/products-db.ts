import localProducts from '../../data/products.json';
import { ProductItem } from './types';
import { supabaseAdmin, isSupabaseConfigured } from './supabase';
import { isValidProductCategory } from './product-taxonomy';

const snapshot = localProducts as unknown as ProductItem[];

export type ProductFilters = {
  collection?: string;
  category?: string;
  format?: string[];
  finish?: string[];
  color?: string[];
  look?: string[];
  certification?: string[];
  targetMarket?: string[];
  search?: string;
};

export async function getProducts(filters?: ProductFilters): Promise<ProductItem[]> {
  let products = snapshot;
  if (isSupabaseConfigured()) {
    const { data, error } = await supabaseAdmin.from('products').select('*');
    if (error) {
      console.error('Supabase products read failed:', error.message);
      throw error;
    } else {
      products = data as ProductItem[];
    }
  }
  if (!filters) return products;
  return products.filter((product) => {
    if (filters.collection && product.collection.toLowerCase() !== filters.collection.toLowerCase()) return false;
    if (filters.category && !product.category?.toLowerCase().includes(filters.category.toLowerCase())) return false;
    if (filters.format?.length && !filters.format.includes(product.format)) return false;
    if (filters.finish?.length && !filters.finish.includes(product.finish)) return false;
    if (filters.color?.length && !filters.color.includes(product.color)) return false;
    if (filters.look?.length && !filters.look.includes(product.look)) return false;
    if (filters.certification?.length && !product.certifications?.some((item) => filters.certification?.includes(item))) return false;
    if (filters.targetMarket?.length && !product.target_markets?.some((item) => filters.targetMarket?.includes(item))) return false;
    if (filters.search) {
      const query = filters.search.toLowerCase();
      if (![product.name, product.name_en, product.description, product.collection, product.category, product.hs_code]
        .some((value) => value?.toLowerCase().includes(query))) return false;
    }
    return true;
  });
}

export async function getProductById(id: string): Promise<ProductItem | null> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabaseAdmin.from('products').select('*').eq('id', id).maybeSingle();
    if (!error) return data as ProductItem | null;
    console.error('Supabase product read failed:', error.message);
    throw error;
  }
  return snapshot.find((product) => product.id === id) || null;
}

const DB_COLUMNS: Array<keyof ProductItem> = [
  'id', 'name', 'name_en', 'collection', 'category', 'price', 'original_price', 'stock',
  'rating', 'reviews_count', 'sku', 'format', 'finish', 'color', 'look', 'image_url',
  'description', 'thickness', 'origin', 'is_featured', 'is_todays_deal', 'is_best_seller',
  'deal_discount_percent', 'brand', 'manufacturer', 'country_of_origin', 'net_weight',
  'package_size', 'shelf_life', 'storage', 'ingredients', 'allergens', 'certifications',
  'carton_qty', 'wholesale_discount_rate', 'wholesale_price_krw', 'export_price_usd',
  'carton_size', 'gross_weight', 'cbm', 'moq_cartons', 'hs_code',
  'production_lead_time', 'export_packaging', 'loading_port', 'target_markets',
];

export async function saveProduct(product: Partial<ProductItem> & { id?: string }): Promise<ProductItem> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase 관리자 연결이 설정되지 않았습니다.');
  }
  const id = product.id || `prod-${crypto.randomUUID()}`;
  const { data: existing, error: readError } = await supabaseAdmin.from('products').select('*').eq('id', id).maybeSingle();
  if (readError) throw readError;
  const candidate = {
    ...(!existing ? {
      finish: '', color: '', look: '', stock: 0, reviews_count: 0,
      is_featured: false, is_todays_deal: false, is_best_seller: false,
      certifications: [], carton_qty: 0, wholesale_discount_rate: 0,
      wholesale_price_krw: null, export_price_usd: null,
      carton_size: null, gross_weight: null, cbm: null, moq_cartons: null,
      hs_code: null, production_lead_time: null, export_packaging: null,
      loading_port: null, target_markets: [],
    } : {}),
    ...(existing || {}), ...product, id,
    image_url: product.image_url || existing?.image_url || '/images/products/coming-soon.png',
    certifications: product.certifications || existing?.certifications || [],
  } as ProductItem;
  if (!isValidProductCategory(candidate.collection, candidate.category || '')) throw new Error('유효하지 않은 상품 분류');
  const required = ['name', 'name_en', 'sku', 'format', 'description', 'manufacturer', 'country_of_origin', 'net_weight', 'shelf_life', 'storage', 'ingredients', 'allergens'] as const;
  if (required.some((key) => !String(candidate[key] ?? '').trim())) throw new Error('필수 상품·표시 정보가 누락되었습니다.');
  if (!Number.isFinite(candidate.price) || (candidate.price || 0) <= 0) throw new Error('판매가 오류');
  if (!Number.isInteger(candidate.stock) || (candidate.stock || 0) < 0) throw new Error('재고 수량 오류');
  const { data: sameSku, error: skuError } = await supabaseAdmin.from('products').select('id').eq('sku', candidate.sku).neq('id', id).limit(1);
  if (skuError) throw skuError;
  if (sameSku?.length) throw new Error('중복 SKU');
  const dbProduct = Object.fromEntries(DB_COLUMNS.filter((key) => candidate[key] !== undefined).map((key) => [key, candidate[key]]));
  const { data, error } = await supabaseAdmin.from('products').upsert(dbProduct).select('*').single();
  if (error) throw error;
  return data as ProductItem;
}

export async function deleteProduct(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase 관리자 연결이 설정되지 않았습니다.');
  }
  const { data, error } = await supabaseAdmin.from('products').delete().eq('id', id).select('id');
  if (error) throw error;
  return Boolean(data?.length);
}

export type { ProductItem } from './types';
export type Product = ProductItem;
