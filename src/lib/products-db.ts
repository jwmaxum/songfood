import 'server-only';
import { publicMinimums } from './pricing/repository';
import { publicProduct } from './public-product';
import localProducts from '../../data/products.json';
import { ProductItem } from './types';
import { supabaseAdmin, isSupabaseConfigured } from './supabase-admin';

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
    products=[];
    for(let start=0;;start+=500) {
      const {data,error}=await supabaseAdmin.from('products').select('*').order('id').range(start,start+499);
      if(error)throw error;
      products.push(...data as ProductItem[]);
      if(data.length<500)break;
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
      if (![product.sku, product.brand, product.name, product.name_en, product.description, product.collection, product.category, product.hs_code]
        .some((value) => value?.toLowerCase().includes(query))) return false;
    }
    return true;
  });
}

export async function getProductById(id: string): Promise<ProductItem | null> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabaseAdmin.from('products').select('*').eq('id', id).maybeSingle();
    if (!error) return data as ProductItem | null;
    console.error('Product read failed');
    throw error;
  }
  return snapshot.find((product) => product.id === id) || null;
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

export async function getPublicProducts(filters?: ProductFilters) {
  const [products,minimums]=await Promise.all([getProducts(filters),isSupabaseConfigured()?publicMinimums():Promise.resolve({} as Awaited<ReturnType<typeof publicMinimums>>)]);
  return products.map(product=>({...publicProduct(product),purchase_minimum:minimums[product.id]}));
}
export async function getPublicProductById(id: string) {
  const [product,minimums]=await Promise.all([getProductById(id),isSupabaseConfigured()?publicMinimums():Promise.resolve({} as Awaited<ReturnType<typeof publicMinimums>>)]);
  return product?{...publicProduct(product),purchase_minimum:minimums[id]}:null;
}
