import type { ProductItem, MenuItem } from './types';
export type RfqLine={product_id:string;quantity:number};
export const RFQ_STORAGE_KEY='songfood_rfq_v1';
export function validQuantity(value:unknown):value is number {
  return typeof value==='number' && Number.isInteger(value) && value>=1 && value<=100000;
}
export function parseRfqLines(value:unknown):RfqLine[] {
  if(!Array.isArray(value))return [];
  const seen=new Set<string>(),result:RfqLine[]=[];
  for(const item of value.slice(0,100)) {
    if(!item || typeof item!=='object')continue;
    const {product_id,quantity}=item as Record<string,unknown>;
    if(typeof product_id!=='string'||!product_id.trim()||product_id.length>100||!validQuantity(quantity)||seen.has(product_id))continue;
    seen.add(product_id);result.push({product_id,quantity});
  }
  return result;
}
export function storageGroup(value='') {
  if(/냉동|frozen|freez/i.test(value))return 'frozen';
  if(/냉장|chill|refrigerat/i.test(value))return 'chilled';
  if(/상온|실온|ambient|room temp/i.test(value))return 'ambient';
  return 'unknown';
}
export type CatalogueFilters={q:string;category:string;brand:string;storage:string;market:string;minimum:string;maxMinimum:string};
export function readFilters(params:URLSearchParams):CatalogueFilters {
  return Object.fromEntries(['q','category','brand','storage','market','minimum','maxMinimum'].map(k=>[k,(params.get(k)||'').slice(0,200)])) as CatalogueFilters;
}
export function filterProducts(products:ProductItem[],filters:CatalogueFilters) {
  const q=filters.q.trim().toLocaleLowerCase();
  return products.filter(p=>{
    const minimum=p.purchase_minimum;
    if(q && ![p.sku,p.name,p.name_en,p.brand,p.category].some(x=>x?.toLocaleLowerCase().includes(q)))return false;
    if(filters.category && p.category!==filters.category)return false;
    if(filters.brand && p.brand!==filters.brand)return false;
    if(filters.storage && storageGroup(p.storage)!==filters.storage)return false;
    if(filters.market && !p.target_markets?.includes(filters.market))return false;
    if(filters.minimum==='unknown' && minimum)return false;
    if(filters.minimum && filters.minimum!=='unknown' && minimum?.unit!==filters.minimum)return false;
    if(filters.maxMinimum && ['EA','BOX','CTN'].includes(filters.minimum)) {
      const max=Number(filters.maxMinimum);
      if(!Number.isInteger(max)||max<1||!minimum||minimum.quantity>max)return false;
    }
    return true;
  });
}
export function pageWindow<T>(items:T[],raw:string|null,size=12) {
  const pages=Math.max(1,Math.ceil(items.length/size));
  const number=Number(raw),page=Number.isSafeInteger(number)?Math.min(pages,Math.max(1,number)):1;
  return {page,pages,items:items.slice((page-1)*size,page*size),total:items.length};
}
export function safeMenuLinks(menus:MenuItem[]):MenuItem[] {
  return menus.flatMap(m=>[m,...(m.children||[])]).filter(m=>m.is_active && m.url.startsWith('/')&&!m.url.startsWith('//')&&!m.url.includes('\\')&&!m.url.startsWith('/admin'));
}
