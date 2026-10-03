'use client';
import Feedback from '@/components/storefront/Feedback';

import {useLanguage} from '@/lib/i18n/LanguageContext';
import Link from '@/components/layout/LocalizedLink';
import { useCart,cartKey,cartUnit } from '@/context/CartContext';
import { ProductPrice } from '@/components/pricing/ProductPrice';
import { formatMoney,UNIT_LABELS } from '@/lib/pricing/types';
export default function CartContents() {
 const {t:ui}=useLanguage();

  const {cartItems,removeFromCart,updateQuantity,preview,error,loading,setIsCartOpen}=useCart();
  if(!cartItems.length)return <div className="py-10"><p>{ui("국내 구매함이 비어 있습니다.")}</p><Link onClick={()=>setIsCartOpen(false)} href="/shop" className="mt-5 inline-block underline">{ui("상품 둘러보기")}</Link></div>;
  return <div className="space-y-6"><div className="space-y-4">{cartItems.map(item=>{
    const key=cartKey(item),unit=cartUnit(item),line=preview?.lines.find(p=>p.product_id===item.product.id && p.unit===unit);
    return <article key={key} className="rounded-xl border border-stone-300 p-4">
      <Link href={'/products/'+encodeURIComponent(item.product.id)} onClick={()=>setIsCartOpen(false)} className="font-bold">{item.product.name}</Link>
      <div className="mt-2"><ProductPrice product={item.product}/></div><p className="mt-2 text-sm">{ui("선택: ")}{UNIT_LABELS[unit]}</p>
      {line&&<p className="mt-2 text-xs">{ui("선택 단가: ")}{formatMoney(line.unit_total_minor,'KRW')} / {unit} · {line.ea_per_unit} EA</p>}<div className="mt-3 flex flex-wrap items-center gap-3"><label className="text-sm">{ui("수량 ")}<input aria-label={item.product.name+' '+unit+ui(" 수량")} type="number" min={1} max={100000} step={1} value={item.quantity} onChange={e=>updateQuantity(key,Number(e.target.value))} className="w-24 rounded border border-stone-300 bg-white p-2 text-stone-900"/></label><button onClick={()=>removeFromCart(key)} className="text-sm underline">{ui("삭제")}</button><span className="ml-auto text-sm font-semibold">{line?formatMoney(line.total_minor,'KRW'):ui("가격 확인 필요")}</span></div>
    </article>;
  })}</div>
    {loading&&<Feedback >{ui("현재 조건으로 가격을 다시 확인하고 있습니다…")}</Feedback>}
    {error&&<Feedback  className="rounded bg-amber-50 p-4 text-sm text-amber-950">{error}</Feedback>}
    {preview&&<section className="rounded-xl bg-stone-100 p-5 text-stone-900"><p>{ui("공급가액 ")}{formatMoney(preview.net_minor,'KRW')}</p><p className="mt-2">VAT {formatMoney(preview.tax_minor,'KRW')}</p><p className="mt-3 text-lg font-bold">{ui("상품 합계 ")}{formatMoney(preview.total_minor,'KRW')}</p><p className="mt-3 text-xs">{ui("서버에서 확인한 상품 금액입니다. 배송비는 주문 접수 후 확인하며, 최종 금액 확인 전에는 입금하지 않습니다.")}</p></section>}
    <div className="flex flex-wrap gap-3"><Link onClick={()=>setIsCartOpen(false)} href="/checkout" className="rounded bg-green-900 px-5 py-3 text-white">{ui("국내 주문 접수")}</Link><Link onClick={()=>setIsCartOpen(false)} href='/shop?mode=export' className="rounded border px-5 py-3">{ui("해외 상품·RFQ 선택")}</Link></div>
  </div>;
}
