'use client';
import {useRef,useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import type {MenuItem} from '@/lib/types';
import {safeMenuLinks} from '@/lib/storefront';
import {useCart} from '@/context/CartContext';
import {useRFQ} from '@/context/RFQContext';
import {useAuth} from '@/context/AuthContext';
export default function HeaderClient({menus}:{menus:MenuItem[]}) {
  const path=usePathname(),{cartItems}=useCart(),{items}=useRFQ(),{user}=useAuth();
  const [open,setOpen]=useState(false),button=useRef<HTMLButtonElement>(null);
  const links=[['/shop','국내 상품'],['/shop?mode=export','Export catalogue'],['/cart','구매함 '+cartItems.length],['/rfq','RFQ '+items.length],['/account',user?'마이페이지':'로그인·가입']];
  const more=safeMenuLinks(menus).filter(m=>!links.some(([url])=>url===m.url)).slice(0,10);
  function close(){setOpen(false);}
  return <header className="relative z-40 border-b border-stone-200 bg-white">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:p-3">본문 바로가기</a>
    <div className="bg-green-950 px-4 py-2 text-center text-xs text-emerald-100">국내 도매·개인 대용량 구매 <span className="mx-2 text-emerald-600">/</span> Overseas buyers · FOB RFQ</div>
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <Link href="/" onClick={close} className="flex shrink-0 items-center gap-3"><img src="/logo.png" alt="송영민푸드 홈" className="h-11 w-11 object-contain"/><span className="hidden text-sm font-bold leading-5 sm:block">SONGFOOD<span className="block text-xs font-normal text-stone-500">도매 · K-Food Export</span></span></Link>
      <nav aria-label="주요 메뉴" className="hidden items-center gap-1 lg:flex">{links.map(([href,title])=><Link key={href} href={href} aria-current={path===href?'page':undefined} className="rounded-lg px-4 py-3 text-sm font-semibold hover:bg-green-50">{title}</Link>)}</nav>
      <div className="flex items-center gap-2 lg:hidden"><Link href="/cart" className="rounded border px-3 py-2 text-xs">구매함 {cartItems.length}</Link><Link href="/rfq" className="rounded border border-amber-500 px-3 py-2 text-xs">RFQ {items.length}</Link><button ref={button} aria-controls="mobile-menu" aria-expanded={open} onClick={()=>setOpen(!open)} className="rounded border px-3 py-2 text-xs">{open?'닫기':'메뉴'}</button></div>
      <details className="relative hidden lg:block"><summary className="cursor-pointer px-3 py-2 text-sm">회사·자료</summary><nav aria-label="회사 및 자료 메뉴" className="absolute right-0 top-full z-50 w-64 rounded-xl border bg-white p-3 shadow-lg"><Link href="/about" className="block p-2 text-sm">회사 소개</Link><Link href="/catalogues" className="block p-2 text-sm">상품 자료실</Link>{more.map(m=><Link key={m.id} href={m.url} className="block p-2 text-sm">{m.title}</Link>)}</nav></details>
    </div>
    <nav id="mobile-menu" hidden={!open} aria-label="모바일 메뉴" onKeyDown={e=>{if(e.key==='Escape'){close();button.current?.focus();}}} className="border-t border-stone-200 px-4 py-3 lg:hidden">{links.map(([href,title])=><Link key={href} href={href} onClick={close} className="block rounded px-3 py-3 text-sm font-semibold hover:bg-green-50">{title}</Link>)}<Link href="/about" onClick={close} className="block px-3 py-3 text-sm">회사 소개</Link><Link href="/catalogues" onClick={close} className="block px-3 py-3 text-sm">상품 자료실</Link></nav>
  </header>;
}
