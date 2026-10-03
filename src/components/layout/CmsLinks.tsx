'use client';
import type {MenuItem} from '@/lib/types';
import {useLanguage} from '@/lib/i18n/LanguageContext';
import Link from './LocalizedLink';
// Only reviewed public routes are shown until legacy marketing content is approved.
const reviewed=/^\/(?:about|contact|catalogues|shop|collections|products|wholesale|rfq|terms|privacy)(?:\/|\?|$)/;
export default function CmsLinks({menus,onNavigate}:{menus:MenuItem[];onNavigate?:()=>void}){
 const {language}=useLanguage();
 if(language!=='ko')return null;
 const flatten=(rows:MenuItem[]):MenuItem[]=>rows.flatMap(m=>[m,...flatten(m.children||[])]);
 const unique=[...new Map(flatten(menus).filter(m=>m.is_active&&reviewed.test(m.url)&&!/[\\\r\n]/.test(m.url)&&!['/about','/catalogues'].includes(m.url)).map(m=>[m.url,m])).values()];
 return <>{unique.map(m=><Link key={m.id} href={m.url} onClick={onNavigate} className="block px-3 py-3 text-sm">{m.title}</Link>)}</>;
}
