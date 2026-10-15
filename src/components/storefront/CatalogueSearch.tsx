'use client';
import {useSearchParams} from 'next/navigation';
import {useId} from 'react';
import {useLanguage} from '@/lib/i18n/LanguageContext';
import {catalogueHref} from '@/lib/catalogue-navigation';

export default function CatalogueSearch({params,id,compact=false}:{params?:string;id?:string;compact?:boolean}) {
 const current=useSearchParams(),{language,text}=useLanguage(),generated=useId();
 const values=new URLSearchParams(catalogueHref(params??current.toString(),{page:'1',lang:language}).split('?')[1]||'');
 const inputId=id||generated;
 return <form action="/shop" method="get" role="search" aria-label={text('상품 검색','Product search')} className="flex min-w-0 flex-1 gap-2">
  {[...values.entries()].filter(([key])=>key!=='q').map(([key,value])=><input key={key} type="hidden" name={key} value={value}/>)}
  <label htmlFor={inputId} className="sr-only">{text('상품명·브랜드·SKU로 검색','Search by product, brand or SKU')}</label>
  <input key={values.get('q')||''} id={inputId} type="search" name="q" defaultValue={values.get('q')||''} maxLength={200} placeholder={text('상품명 · 브랜드 · SKU 검색','Product, brand or SKU')} className={'min-h-11 min-w-0 flex-1 rounded-lg border border-stone-400 bg-white px-3 text-base text-stone-900 '+(compact?'':'sm:px-4')}/>
  <button type="submit" className="min-h-11 shrink-0 rounded-lg bg-green-900 px-4 text-sm font-bold text-white hover:bg-green-800">{text('검색','Search')}</button>
 </form>;
}
