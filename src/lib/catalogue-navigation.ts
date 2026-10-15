import {PRODUCT_COLLECTIONS,categoriesForCollection} from './product-taxonomy';

export const CATALOGUE_PAGE_SIZE=12;
export const CATALOGUE_KEYS=['q','collection','category','brand','storage','market','minimum','maxMinimum','mode','lang','page','view','sort','cat'] as const;
export const CATALOGUE_SORTS=['relevance','name','name-desc','sku','featured'] as const;
const legacyCollections:Record<string,string>={pantry:'K-간편식/HMR',sauce:'K-소스/장류',dairy:'K-주류/전통주'};
function inputParams(input:URLSearchParams|string):URLSearchParams {
 if(typeof input!=='string')return new URLSearchParams(input.toString());
 if(/^\/(?:shop|collections)(?:\?|$)/.test(input))return new URL(input,'https://songfood.invalid').searchParams;
 return new URLSearchParams(input.replace(/^\?/,''));
}
export function readCatalogueParams(input:URLSearchParams|string):URLSearchParams {
 const source=inputParams(input),params=new URLSearchParams();
 for(const key of CATALOGUE_KEYS){
  const raw=source.get(key);if(!raw)continue;
  const value=raw.normalize('NFC').replace(/[\u0000-\u001f\u007f]/g,'').slice(0,200).trim();
  if(value)params.set(key,value);
 }
 if(params.get('mode')!=='export')params.delete('mode');
 if(!['ko','en'].includes(params.get('lang')||''))params.delete('lang');
 if(!['list','grid'].includes(params.get('view')||''))params.delete('view');
 if(!(CATALOGUE_SORTS as readonly string[]).includes(params.get('sort')||''))params.delete('sort');
 if(params.has('page')){const n=Number(params.get('page'));params.set('page',Number.isSafeInteger(n)&&n>=1?String(n):'1');}
 const legacy=params.get('cat');
 if(legacy){
  if(params.get('collection')||params.get('category')||legacy==='all')params.delete('cat');
  else if(legacy==='fresh'){if(!params.has('storage'))params.set('storage','frozen');params.delete('cat');}
  else if(legacyCollections[legacy]){params.set('collection',legacyCollections[legacy]);params.delete('cat');}
 }
 return params;
}
export function catalogueHref(input:URLSearchParams|string='',changes:Record<string,string>={},pathname='/shop'):string {
 const params=readCatalogueParams(input);
 for(const [key,value]of Object.entries(changes)){
  if(!(CATALOGUE_KEYS as readonly string[]).includes(key))continue;
  if(value)params.set(key,value);else params.delete(key);
 }
 if('collection' in changes||'category' in changes)params.delete('cat');
 if('mode' in changes&&changes.mode!=='export')params.delete('market');
 if('collection' in changes&&!('category' in changes)&&!categoriesForCollection(params.get('collection')||'').includes(params.get('category')||''))params.delete('category');
 const safe=readCatalogueParams(params),query=safe.toString();
 return (pathname==='/collections'?'/collections':'/shop')+(query?'?'+query:'');
}
export function productAnchor(id:string){return 'product-'+id;}
function safeHash(hash:string):string {
 if(!hash)return '';
 try{const value=decodeURIComponent(hash.slice(1));return value.startsWith('product-')&&value.length<=160&&!/[\u0000-\u0020\u007f<>\\/?#]/.test(value)?'#'+encodeURIComponent(value):'';}catch{return '';}
}
export function safeCatalogueReturn(raw:string|null|undefined):string|null {
 if(!raw||raw.length>2400||!/^\/(?:shop|collections)(?:[?#]|$)/.test(raw)||/[\u0000-\u0020\u007f\\]/.test(raw))return null;
 try{
  const url=new URL(raw,'https://songfood.invalid');
  if(url.origin!=='https://songfood.invalid'||!['/shop','/collections'].includes(url.pathname))return null;
  const decoded=decodeURIComponent(url.pathname+url.search+url.hash);
  if(/[\u0000-\u001f\u007f\\]/.test(decoded))return null;
  return catalogueHref(url.searchParams,{},url.pathname)+safeHash(url.hash);
 }catch{return null;}
}
export function productHref(id:string,returnTo:string,locale?:'ko'|'en'):string {
 const safe=safeCatalogueReturn(returnTo)||'/shop',context=new URL(safe,'https://songfood.invalid'),params=new URLSearchParams();
 params.set('returnTo',safe);
 const lang=locale||context.searchParams.get('lang');if(lang==='ko'||lang==='en')params.set('lang',lang);
 if(context.searchParams.get('mode')==='export')params.set('mode','export');
 return '/products/'+encodeURIComponent(id)+'?'+params.toString();
}
export function catalogueSelectionValid(params:URLSearchParams):boolean {
 const collection=params.get('collection'),category=params.get('category');
 if(params.has('cat'))return false;
 if(collection&&!PRODUCT_COLLECTIONS.includes(collection))return false;
 if(collection&&category&&!categoriesForCollection(collection).includes(category))return false;
 if(category&&!collection&&!PRODUCT_COLLECTIONS.some(value=>categoriesForCollection(value).includes(category)))return false;
 return true;
}
