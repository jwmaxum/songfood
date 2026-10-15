import type { ProductItem, MenuItem } from './types';
import {readCatalogueParams} from './catalogue-navigation';
import {brandKey,brandLabel,collectionLabel,categoryLabel,productName} from './catalogue-taxonomy';
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
export function storageGroup(value:string|null|undefined='') {
  // After-opening instructions do not describe unopened shipping or storage.
  const unopened=(value||'').split(/개봉\s*후|\bafter\s+opening\b|\bonce\s+opened\b/i,1)[0];
  if(/냉동|frozen|freez/i.test(unopened))return 'frozen';
  if(/냉장|chill|refrigerat/i.test(unopened))return 'chilled';
  if(/상온|실온|ambient|room temp/i.test(unopened))return 'ambient';
  return 'unknown';
}
export type CatalogueFilters={q:string;collection:string;category:string;brand:string;storage:string;market:string;minimum:string;maxMinimum:string;legacy:string};
export function readFilters(params:URLSearchParams):CatalogueFilters {
 const values=readCatalogueParams(params);
 return {...Object.fromEntries(['q','collection','category','brand','storage','market','minimum','maxMinimum'].map(k=>[k,(values.get(k)||'').slice(0,200)])),legacy:values.get('cat')||''} as CatalogueFilters;
}
const normalize=(text='')=>text.normalize('NFC').toLocaleLowerCase('en-US').replace(/\s+/g,' ').trim();
const compactSku=(text='')=>normalize(text).replace(/[\s\-_]/g,'');
const foodWords=[['김치','kimchi'],['만두','mandu','dumpling','dumplings'],['라면','ramyeon','ramen']];
function searchDocument(p:ProductItem) {
 let result=normalize([p.sku,p.name,p.name_en,p.brand,brandKey(p.brand||''),brandLabel(p.brand||'','en'),p.category,p.collection,collectionLabel(p.collection,'en'),categoryLabel(p.category||'','en')].filter(Boolean).join(' '));
 for(const group of foodWords)if(group.some(word=>result.includes(word)))result+=' '+group.join(' ');
 return result;
}
function matchesQuery(product:ProductItem,query:string) {
 const text=normalize(query);if(!text)return true;
 if(product.sku&&compactSku(product.sku)===compactSku(text))return true;
 const document=searchDocument(product);
 return text.split(' ').every(word=>document.includes(word));
}
export function filterProducts(products:ProductItem[],filters:CatalogueFilters) {
 if(filters.legacy)return [];
 return products.filter(p=>{
  const minimum=p.purchase_minimum;
  if(!matchesQuery(p,filters.q))return false;
  if(filters.collection&&p.collection!==filters.collection)return false;
  if(filters.category&&p.category!==filters.category)return false;
  if(filters.brand&&brandKey(p.brand||'')!==brandKey(filters.brand))return false;
  if(filters.storage&&storageGroup(p.storage)!==filters.storage)return false;
  if(filters.market&&!p.target_markets?.includes(filters.market))return false;
  if(filters.minimum==='unknown'&&minimum)return false;
  if(filters.minimum&&filters.minimum!=='unknown'&&minimum?.unit!==filters.minimum)return false;
  if(filters.maxMinimum&&['EA','BOX','CTN'].includes(filters.minimum)){
   const max=Number(filters.maxMinimum);
   if(!Number.isInteger(max)||max<1||!minimum||minimum.quantity>max)return false;
  }
  return true;
 });
}
function searchScore(p:ProductItem,q:string) {
 const query=normalize(q);if(!query)return 0;
 if(p.sku&&compactSku(p.sku)===compactSku(query))return 3;
 if([p.name,p.name_en].some(name=>name&&normalize(name).includes(query)))return 2;
 return matchesQuery(p,query)?1:0;
}
export function sortProducts(products:ProductItem[],sort='relevance',q='',locale:'ko'|'en'='ko'):ProductItem[] {
 const compare=new Intl.Collator(locale,{numeric:true,sensitivity:'base'});
 return [...products].sort((a,b)=>{
  let order=0;
  if(sort==='name'||sort==='name-desc')order=compare.compare(productName(a,locale),productName(b,locale))*(sort==='name-desc'?-1:1);
  else if(sort==='sku')order=compare.compare(a.sku||'',b.sku||'');
  else if(sort==='featured')order=Number(!!b.is_featured)-Number(!!a.is_featured);
  else order=searchScore(b,q)-searchScore(a,q);
  return order||compare.compare(a.id,b.id);
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
