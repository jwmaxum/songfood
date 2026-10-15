'use client';
import {useRef,useState} from 'react';
import Link from './LocalizedLink';
import Image from 'next/image';
import {usePathname,useSearchParams} from 'next/navigation';
import type {MenuItem} from '@/lib/types';
import {useCart} from '@/context/CartContext';
import {useRFQ} from '@/context/RFQContext';
import {useAuth} from '@/context/AuthContext';
import {useLanguage} from '@/lib/i18n/LanguageContext';
import {catalogueHref,safeCatalogueReturn} from '@/lib/catalogue-navigation';
import CategoryNavigation from '@/components/storefront/CategoryNavigation';
import CatalogueSearch from '@/components/storefront/CatalogueSearch';
import CmsLinks from './CmsLinks';
import LanguageSelector from './LanguageSelector';

export default function HeaderClient({menus}:{menus:MenuItem[]}) {
 const path=usePathname(),params=useSearchParams(),{cartItems}=useCart(),{items}=useRFQ(),{user}=useAuth(),{text}=useLanguage();
 const [open,setOpen]=useState(false),button=useRef<HTMLButtonElement>(null),company=useRef<HTMLDetailsElement>(null);
 const isCatalogue=path==='/shop'||path==='/collections',isDetail=path.startsWith('/products/');
 const source=isDetail?new URL(safeCatalogueReturn(params.get('returnTo'))||'/shop','https://songfood.invalid').searchParams.toString():params.toString();
 const exportMode=params.get('mode')==='export'||(isDetail&&params.get('mode')!=='domestic'&&new URLSearchParams(source).get('mode')==='export');
 const context=catalogueHref(source,{mode:exportMode?'export':''});
 const contextParams=new URL(context,'https://songfood.invalid').searchParams.toString();
 const domesticHref=catalogueHref(contextParams,{mode:'',market:'',page:'1'}),exportHref=catalogueHref(contextParams,{mode:'export',page:'1'});
 const links=[
  {href:domesticHref,title:text('국내 상품','Domestic'),current:isCatalogue&&!exportMode},
  {href:exportHref,title:text('해외 상품','Export catalogue'),current:isCatalogue&&exportMode},
  {href:'/cart',title:text('구매함 ','Cart ')+cartItems.length,current:path==='/cart'},
  {href:'/rfq',title:'RFQ '+items.length,current:path==='/rfq'},
  {href:'/account',title:user?text('마이페이지','My account'):text('로그인·가입','Sign in / Join'),current:path==='/account'},
 ];
 function close(){setOpen(false);}
 return <header className="relative z-40 border-b border-stone-200 bg-white">
  <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:p-3">{text('본문 바로가기','Skip to content')}</a>
  <div className="bg-green-950 px-4 py-1.5 text-center text-xs text-emerald-100">{text('개인·사업자 대용량 구매 · 해외 FOB 견적','Bulk food for individuals & businesses · FOB export RFQ')}</div>
  <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
   <Link href={exportMode?'/?mode=export':'/'} onClick={close} className="flex shrink-0 items-center gap-3">
    <Image src="/logo.png" width={44} height={44} alt={text('송영민푸드 홈','Songfood home')}/>
    <span className="hidden text-sm font-bold leading-5 sm:block">SONGFOOD<span className="block text-xs font-normal text-stone-600">{text('도매 · K-Food Export','Bulk food · K-Food Export')}</span></span>
   </Link>
   <nav aria-label={text('주요 메뉴','Main navigation')} className="hidden items-center lg:flex">{links.map(({href,title,current})=><Link key={title} href={href} aria-current={current?'page':undefined} className="rounded-lg px-3 py-3 text-sm font-semibold hover:bg-green-50 aria-[current=page]:bg-green-100">{title}</Link>)}</nav>
   <div className="flex items-center gap-2"><LanguageSelector/>
    <button ref={button} aria-controls="mobile-menu" aria-expanded={open} onClick={()=>setOpen(!open)} className="min-h-11 rounded-lg border px-3 text-sm lg:hidden">{open?text('닫기','Close'):text('메뉴','Menu')}</button>
    <details ref={company} onKeyDown={e=>{if(e.key==='Escape'&&company.current){company.current.open=false;company.current.querySelector('summary')?.focus();}}} className="relative hidden lg:block">
     <summary className="min-h-11 cursor-pointer px-3 py-3 text-sm">{text('회사·자료','Company')}</summary>
     <nav aria-label={text('회사 및 자료 메뉴','Company links')} className="absolute right-0 top-full z-50 w-60 rounded-xl border bg-white p-3 shadow-lg">
      <Link href="/about" className="block p-3 text-sm">{text('회사 소개','About us')}</Link><Link href="/catalogues" className="block p-3 text-sm">{text('상품 자료실','Product resources')}</Link><CmsLinks menus={menus} section="company"/>
     </nav>
    </details>
   </div>
  </div>
  <div className="mx-auto flex max-w-7xl items-start gap-2 px-4 pb-2 sm:px-6"><CatalogueSearch compact id="header-product-search" params={contextParams}/><CategoryNavigation compact params={contextParams} menus={menus}/></div>
  <nav id="mobile-menu" hidden={!open} aria-label={text('모바일 메뉴','Mobile navigation')} onKeyDown={e=>{if(e.key==='Escape'){close();button.current?.focus();}}} className="border-t border-stone-200 px-4 py-3 lg:hidden">
   {links.map(({href,title,current})=><Link key={title} href={href} onClick={close} aria-current={current?'page':undefined} className="block rounded px-3 py-3 text-sm font-semibold hover:bg-green-50 aria-[current=page]:bg-green-100">{title}</Link>)}
   <Link href="/about" onClick={close} className="block px-3 py-3 text-sm">{text('회사 소개','About us')}</Link><Link href="/catalogues" onClick={close} className="block px-3 py-3 text-sm">{text('상품 자료실','Product resources')}</Link><CmsLinks menus={menus} section="company" onNavigate={close}/>
  </nav>
 </header>;
}
