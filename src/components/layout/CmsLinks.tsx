'use client';
import type {MenuItem} from '@/lib/types';
import {useLanguage} from '@/lib/i18n/LanguageContext';
import {CATALOGUE_KEYS,catalogueHref,catalogueSelectionValid,readCatalogueParams,safeCatalogueReturn} from '@/lib/catalogue-navigation';
import Link from './LocalizedLink';

import {safeImageAddress} from '@/lib/media-image-url';

export type CmsSection='company'|'catalogue'|'all';
const companyRoute=/^\/(?:about|contact|catalogues|wholesale|rfq|terms|privacy)(?:\/|$)/;
function publicDestination(raw:string):{section:'company'|'catalogue';href:string}|null {
 if(!raw.startsWith('/')||raw.startsWith('//')||raw.length>2400||/[\\\u0000-\u0020\u007f]/.test(raw))return null;
 try {
  const url=new URL(raw,'https://songfood.invalid');
  if(url.origin!=='https://songfood.invalid'||/[\\\u0000-\u001f\u007f]/.test(decodeURIComponent(url.pathname+url.search+url.hash)))return null;
  if(companyRoute.test(url.pathname))return {section:'company',href:url.pathname+url.search+url.hash};
  const productPath=/^\/products\/([^/]+)$/.exec(url.pathname);
  if(productPath) {
   const id=decodeURIComponent(productPath[1]);
   if(!id||id.length>100||/[\\/\u0000-\u0020\u007f?#]/.test(id))return null;
   const query=new URLSearchParams(),seen=new Set<string>();
   for(const [key,value]of url.searchParams) {
    if(!['mode','lang','returnTo'].includes(key)||seen.has(key))return null;
    seen.add(key);
    if(key==='mode'&&!['domestic','export'].includes(value))return null;
    if(key==='lang'&&!['ko','en'].includes(value))return null;
    if(key==='returnTo') {const safe=safeCatalogueReturn(value);if(!safe)return null;query.set(key,safe);}
    else query.set(key,value);
   }
   return {section:'catalogue',href:'/products/'+encodeURIComponent(id)+(query.size?'?'+query.toString():'')+url.hash};
  }
  if(url.pathname!=='/shop'||url.hash||url.searchParams.has('cat'))return null;
  const params=readCatalogueParams(url.searchParams),seen=new Set<string>();
  for(const [key,value]of url.searchParams) {
   if(!(CATALOGUE_KEYS as readonly string[]).includes(key)||seen.has(key)||value.length>200)return null;
   seen.add(key);
   if(value.normalize('NFC').trim()&&(params.get(key)||'')!==value.normalize('NFC').trim())return null;
  }
  if(!catalogueSelectionValid(params))return null;
  return {section:'catalogue',href:catalogueHref(params)};
 }catch{return null;}
}
function destinationKey(href:string):string {
 const url=new URL(href,'https://songfood.invalid');
 url.searchParams.delete('lang');
 if(url.pathname==='/shop'&&url.searchParams.get('page')==='1')url.searchParams.delete('page');
 url.searchParams.sort();
 return url.pathname+(url.searchParams.size?'?'+url.searchParams.toString():'')+url.hash;
}
/** Menu trees have already been filtered for their header/footer position on the server. */
export function publicCmsLinks(menus:MenuItem[],section:CmsSection='all',excludeHrefs:readonly string[]=[]):MenuItem[] {
 const excluded=new Set(excludeHrefs.map(destinationKey)),seen=new Set<string>(),result:MenuItem[]=[];
 const visit=(rows:MenuItem[])=>{
  for(const menu of rows) {
   if(!menu.is_active)continue;
   const destination=publicDestination(menu.url);
   if(destination&&(section==='all'||section===destination.section)) {
    const key=destinationKey(destination.href);
    if(!excluded.has(key)&&!seen.has(key)){seen.add(key);result.push({...menu,url:destination.href});}
   }
   visit(menu.children||[]);
  }
 };
 visit(menus);
 return result;
}
export default function CmsLinks({menus,onNavigate,section='all',excludeHrefs=['/about','/catalogues']}:{menus:MenuItem[];onNavigate?:()=>void;section?:CmsSection;excludeHrefs?:readonly string[]}) {
 const {language}=useLanguage();
 // CMS has one operator-entered title. Static taxonomy supplies bilingual category names.
 if(language!=='ko')return null;
 return <>{publicCmsLinks(menus,section,excludeHrefs).map(menu=><Link key={menu.id} href={menu.url} onClick={onNavigate} className="flex min-h-11 items-center gap-2 px-3 py-3 text-sm">{menu.image_url&&safeImageAddress(menu.image_url)&&<img src={menu.image_url} alt="" loading="lazy" className="h-9 w-9 shrink-0 rounded object-cover"/>}{menu.title}</Link>)}</>;
}
