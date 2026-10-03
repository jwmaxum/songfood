'use client';
import Link from 'next/link';
import {koreanOnlyPath} from '@/lib/i18n/locale';
import type {ComponentProps} from 'react';
import {useLanguage} from '@/lib/i18n/LanguageContext';
export default function LocalizedLink({href,onClick,...props}:ComponentProps<typeof Link>) {
 const {href:localize,language}=useLanguage();
 const pathname=typeof href==='string'?(href.startsWith('/')&&!href.startsWith('//')?new URL(href,'https://songfood.invalid').pathname:''):href.pathname||'';
 const targetLanguage=koreanOnlyPath(pathname)?'ko':language;
 const destination=typeof href==='string'?localize(href):{...href,query:{...(typeof href.query==='string'?Object.fromEntries(new URLSearchParams(href.query)):href.query),lang:targetLanguage}};
 return <Link {...props} href={destination} onClick={event=>{
   onClick?.(event);
   // App Router preserves root layouts. Crossing into Korean-only routes needs fresh SSR.
   if(!event.defaultPrevented&&event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey&&props.target!=='_blank'&&targetLanguage!==language){
     event.preventDefault();window.location.assign(event.currentTarget.href);
   }
 }}/>;
}
