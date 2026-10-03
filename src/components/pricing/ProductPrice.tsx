'use client';
import Feedback from '@/components/storefront/Feedback';

import {useLanguage} from '@/lib/i18n/LanguageContext';

import Link from '@/components/layout/LocalizedLink';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePricing, usePricePreview } from '@/context/PricingContext';
import { useCart } from '@/context/CartContext';
import type { ProductItem } from '@/lib/types';
import type { TradeUnit } from '@/lib/pricing/types';
import { validQuantity } from '@/lib/storefront';
import { formatMoney, UNIT_LABELS } from '@/lib/pricing/types';
export function ProductPrice({product}:{product:ProductItem}) {
 const {t:ui}=useLanguage();

  const {user}=useAuth(),{products,error,loading}=usePricing(),entry=products[product.id];
  const minimum=entry?.minimum_order||product.purchase_minimum;
  const offer=minimum?entry?.units[minimum.unit]:undefined;
  return <div className="space-y-1 text-xs leading-5">
    <p className="font-semibold">{ui("최소 구매: ")}{minimum?minimum.quantity+' '+ui(UNIT_LABELS[minimum.unit]):ui("확인 필요")}</p>
    {!user?<Link href="/account/login" className="underline">{ui("로그인 후 도매가 확인")}</Link>:loading?<p>{ui("가격 확인 중…")}</p>:offer?<p className="font-bold">{formatMoney(offer.line.unit_total_minor,'KRW')} / {minimum!.unit} <span className="font-normal">{offer.line.tax_code==='exempt'?ui("(면세)"):ui("(VAT 포함)")}</span></p>:<p>{ui(error || entry?.message || '검수 중 · 견적 문의')}</p>}
  </div>;
}
export function PurchasePanel({product}:{product:ProductItem}) {
 const {t:ui}=useLanguage();

  const {user}=useAuth(),{products}=usePricing(),entry=products[product.id],{addToCart}=useCart();
  const [choice,setChoice]=useState<TradeUnit|null>(null),[count,setCount]=useState<number|null>(null),[added,setAdded]=useState(false);
  const unit=choice || entry?.minimum_order?.unit || product.purchase_minimum?.unit || 'EA';
  const quantity=count ?? entry?.units[unit]?.quantity ?? (unit===product.purchase_minimum?.unit?product.purchase_minimum.quantity:1);
  const {preview,error,loading}=usePricePreview([{product_id:product.id,unit,quantity}]);
  return <section className="space-y-4 rounded-xl border border-current/20 p-5">
    <h2 className="text-lg font-bold">{ui("국내 도매·대용량 구매")}</h2><ProductPrice product={product}/>
    {entry&&<p className="text-xs opacity-80">{Object.entries(entry.units).map(([u,offer])=>u+ui(" 1개 = EA ")+offer.line.ea_per_unit+ui("개")).join(' · ')}</p>}
    <div className="grid grid-cols-2 gap-3"><label className="text-sm">{ui("구매 단위")}<select aria-label={ui("구매 단위")} value={unit} onChange={e=>{setChoice(e.target.value as TradeUnit);setCount(null);setAdded(false);}} className="mt-2 w-full rounded border border-stone-600 bg-stone-950 p-3 text-white">{Object.entries(UNIT_LABELS).map(([k,v])=><option key={k} value={k} disabled={!!entry && Object.keys(entry.units).length>0 && !entry.units[k as TradeUnit]}>{ui(v)}</option>)}</select></label>
    <label className="text-sm">{ui("수량")}<input aria-label={ui("구매 수량")} type="number" min={1} max={100000} step={1} value={quantity} onChange={e=>{setCount(Number(e.target.value));setAdded(false);}} className="mt-2 w-full rounded border border-stone-600 bg-stone-950 p-3 text-white"/></label></div>
    {loading?<Feedback  className="text-sm">{ui("서버 가격 확인 중…")}</Feedback>:preview?<div className="space-y-1 text-sm"><p>{ui("공급가액 ")}{formatMoney(preview.net_minor,'KRW')} · VAT {formatMoney(preview.tax_minor,'KRW')}</p><p className="text-lg font-bold">{ui("상품 합계 ")}{formatMoney(preview.total_minor,'KRW')}</p></div>:<Feedback  className="text-sm">{error}</Feedback>}
    <div className="flex flex-wrap gap-3"><button disabled={!preview || loading} onClick={()=>{addToCart(product,quantity,undefined,undefined,unit==='CTN'?'carton':unit==='BOX'?'box':'ea');setAdded(true);}} className="rounded bg-green-800 px-5 py-3 text-sm font-bold text-white disabled:opacity-40">{added?ui("국내 구매함에 담았습니다"):ui("국내 구매함 담기")}</button>
      <Link href="/wholesale" onClick={e=>{if(!validQuantity(quantity)){e.preventDefault();return;}addToCart(product,quantity,undefined,undefined,unit==='CTN'?'carton':unit==='BOX'?'box':'ea',undefined,undefined,false);}} className="rounded border border-current/30 px-5 py-3 text-sm">{ui("구매 문의")}</Link><Link href={'/rfq?product='+encodeURIComponent(product.id)} className="rounded border border-current/30 px-5 py-3 text-sm">{ui("해외 RFQ")}</Link></div>
    {!user&&<Link href="/account/login" className="block text-sm underline">{ui("개인·사업자 간편 가입")}</Link>}
    <p className="text-xs opacity-70">{ui("배송비와 주문·결제는 아직 확정되지 않았습니다. 미리보기 가격은 유효기간과 수량에 따라 다시 확인됩니다.")}</p>
  </section>;
}
