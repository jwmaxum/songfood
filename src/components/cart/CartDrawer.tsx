'use client';
import {useLanguage} from '@/lib/i18n/LanguageContext';

import {useEffect,useRef} from 'react';
import Link from '@/components/layout/LocalizedLink';
import {useCart} from '@/context/CartContext';
import CartContents from './CartContents';
export default function CartDrawer() {
 const {t:ui}=useLanguage();

  const {isCartOpen,setIsCartOpen}=useCart(),dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const d=dialog.current;if(isCartOpen&&!d?.open)d?.showModal();else if(!isCartOpen&&d?.open)d.close();},[isCartOpen]);
  return <dialog ref={dialog} onCancel={()=>setIsCartOpen(false)} onClose={()=>setIsCartOpen(false)} onClick={e=>{if(e.target===e.currentTarget)setIsCartOpen(false);}} aria-labelledby="cart-dialog-title" className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full max-w-lg border-0 bg-white p-0 text-stone-900 backdrop:bg-black/50"><section className="min-h-full p-5"><div className="mb-5 flex items-center justify-between gap-4"><h2 id="cart-dialog-title" className="text-2xl font-bold">{ui("국내 구매함")}</h2><button autoFocus onClick={()=>setIsCartOpen(false)} className="rounded border px-4 py-2">{ui("닫기")}</button></div>{isCartOpen&&<CartContents/>}<Link href="/cart" onClick={()=>setIsCartOpen(false)} className="mt-6 inline-block underline">{ui("국내 구매함 전체 보기")}</Link></section></dialog>;
}
