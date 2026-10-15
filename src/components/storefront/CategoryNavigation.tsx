'use client';
import {useId,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import Link from '@/components/layout/LocalizedLink';
import {useLanguage} from '@/lib/i18n/LanguageContext';
import type {ProductItem,MenuItem} from '@/lib/types';
import CmsLinks,{publicCmsLinks} from '@/components/layout/CmsLinks';
import {CATALOGUE_TAXONOMY,collectionLabel,categoryLabel} from '@/lib/catalogue-taxonomy';
import {catalogueHref,readCatalogueParams} from '@/lib/catalogue-navigation';
import {filterProducts,readFilters} from '@/lib/storefront';

export default function CategoryNavigation({products,params,menus=[],compact=false,desktopSidebar=false}:{products?:ProductItem[];params?:string;menus?:MenuItem[];compact?:boolean;desktopSidebar?:boolean}) {
 const current=useSearchParams(),{language,text}=useLanguage(),id=useId();
 const values=readCatalogueParams(params??current.toString());
 const [open,setOpen]=useState(false),button=useRef<HTMLButtonElement>(null);
 const countable=products?filterProducts(products,{...readFilters(values),collection:'',category:'',legacy:''}):undefined;
 const href=(collection:string,category='')=>catalogueHref(values,{collection,category,page:'1',cat:''});
 const staticHrefs=[href(''),...CATALOGUE_TAXONOMY.flatMap(group=>[href(group.collection),...group.categories.map(category=>href(group.collection,category))])];
 const shortcuts=publicCmsLinks(menus,'catalogue',staticHrefs);
 const panel=<nav aria-label={text('상품 카테고리','Product categories')} className="min-w-0">
  <Link href={href('')} onClick={()=>setOpen(false)} aria-current={!values.get('collection')&&!values.get('category')?'page':undefined} className="mb-2 flex min-h-11 items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-bold text-green-950 hover:bg-green-50 aria-[current=page]:bg-green-100">
   <span>{text('전체 상품','All products')}</span>{countable&&<span className="text-xs tabular-nums">{countable.length}</span>}
  </Link>
  <ul className={desktopSidebar||compact?'space-y-2':'grid gap-3 sm:grid-cols-2 lg:grid-cols-3'}>
   {CATALOGUE_TAXONOMY.map(group=><li key={group.collection} className="min-w-0 rounded-lg border border-stone-200 bg-white p-2">
    <Link href={href(group.collection)} onClick={()=>setOpen(false)} aria-current={values.get('collection')===group.collection&&!values.get('category')?'page':undefined} className="flex min-h-11 items-center justify-between gap-2 rounded px-2 py-2 text-sm font-bold text-green-950 hover:bg-green-50 aria-[current=page]:bg-green-100">
     <span>{collectionLabel(group.collection,language)}</span>{countable&&<span className="shrink-0 text-xs font-normal tabular-nums">{countable.filter(p=>p.collection===group.collection).length}</span>}
    </Link>
    <ul className="border-l-2 border-stone-200 pl-2">{group.categories.map(category=><li key={category}>
     <Link href={href(group.collection,category)} onClick={()=>setOpen(false)} aria-current={values.get('collection')===group.collection&&values.get('category')===category?'page':undefined} className="flex min-h-11 items-center justify-between gap-2 rounded px-2 py-2 text-sm text-stone-700 hover:bg-green-50 aria-[current=page]:bg-green-100 aria-[current=page]:font-bold">
      <span>{categoryLabel(category,language)}</span>{countable&&<span className="shrink-0 text-xs tabular-nums">{countable.filter(p=>p.collection===group.collection&&p.category===category).length}</span>}
     </Link>
    </li>)}</ul>
   </li>)}
  </ul>
  {language==='ko'&&!!shortcuts.length&&<div className="mt-4 border-t border-stone-200 pt-3"><h3 className="px-3 text-sm font-bold">상품 바로가기</h3><CmsLinks menus={shortcuts} section="catalogue" excludeHrefs={staticHrefs} onNavigate={()=>setOpen(false)}/></div>}
 </nav>;
 const close=()=>{setOpen(false);button.current?.focus();};
 if(!compact&&!desktopSidebar)return panel;
 return <div onKeyDown={e=>{if(e.key==='Escape'&&open){e.preventDefault();close();}}} className={desktopSidebar?'min-w-0':'relative shrink-0'}>
  {desktopSidebar&&<div className="hidden lg:block"><h2 className="mb-3 text-base font-bold">{text('카테고리','Categories')}</h2>{panel}</div>}
  <div className={desktopSidebar?'relative lg:hidden':'relative'}>
   <button ref={button} type="button" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(!open)} className="min-h-11 rounded-lg border border-green-900 bg-white px-3 text-sm font-bold text-green-950">{compact?text('카테고리','Categories'):text('카테고리 전체','All categories')} <span aria-hidden="true">{open?'−':'+'}</span></button>
   <div id={id} hidden={!open} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();close();}}} className={'absolute top-full z-50 mt-2 max-h-[65vh] w-[min(21rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-stone-300 bg-white p-3 shadow-xl '+(desktopSidebar?'left-0':'right-0')}>
    <div className="mb-2 flex items-center justify-between gap-2"><h2 className="font-bold">{text('상품 카테고리','Product categories')}</h2><button type="button" onClick={close} className="min-h-11 rounded border px-3 text-sm">{text('닫기','Close')}</button></div>{panel}
   </div>
  </div>
 </div>;
}
