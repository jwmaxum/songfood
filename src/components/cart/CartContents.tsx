'use client';
import Link from 'next/link';
import { useCart,cartKey,cartUnit } from '@/context/CartContext';
import { ProductPrice } from '@/components/pricing/ProductPrice';
import { formatMoney,UNIT_LABELS } from '@/lib/pricing/types';
export default function CartContents() {
  const {cartItems,removeFromCart,updateQuantity,preview,error,loading,setIsCartOpen}=useCart();
  if(!cartItems.length)return <div className="py-10"><p>국내 구매함이 비어 있습니다.</p><Link onClick={()=>setIsCartOpen(false)} href="/shop" className="mt-5 inline-block underline">상품 둘러보기</Link></div>;
  return <div className="space-y-6"><div className="space-y-4">{cartItems.map(item=>{
    const key=cartKey(item),unit=cartUnit(item),line=preview?.lines.find(p=>p.product_id===item.product.id && p.unit===unit);
    return <article key={key} className="rounded-xl border border-stone-300 p-4">
      <Link href={'/products/'+encodeURIComponent(item.product.id)} onClick={()=>setIsCartOpen(false)} className="font-bold">{item.product.name}</Link>
      <div className="mt-2"><ProductPrice product={item.product}/></div><p className="mt-2 text-sm">선택: {UNIT_LABELS[unit]}</p>
      {line&&<p className="mt-2 text-xs">선택 단가: {formatMoney(line.unit_total_minor,'KRW')} / {unit} · {line.ea_per_unit} EA</p>}<div className="mt-3 flex flex-wrap items-center gap-3"><label className="text-sm">수량 <input aria-label={item.product.name+' '+unit+' 수량'} type="number" min={1} max={100000} step={1} value={item.quantity} onChange={e=>updateQuantity(key,Number(e.target.value))} className="w-24 rounded border border-stone-300 bg-white p-2 text-stone-900"/></label><button onClick={()=>removeFromCart(key)} className="text-sm underline">삭제</button><span className="ml-auto text-sm font-semibold">{line?formatMoney(line.total_minor,'KRW'):'가격 확인 필요'}</span></div>
    </article>;
  })}</div>
    {loading&&<p role="status">현재 조건으로 가격을 다시 확인하고 있습니다…</p>}
    {error&&<p role="status" className="rounded bg-amber-50 p-4 text-sm text-amber-950">{error}</p>}
    {preview&&<section className="rounded-xl bg-stone-100 p-5 text-stone-900"><p>공급가액 {formatMoney(preview.net_minor,'KRW')}</p><p className="mt-2">VAT {formatMoney(preview.tax_minor,'KRW')}</p><p className="mt-3 text-lg font-bold">상품 합계 {formatMoney(preview.total_minor,'KRW')}</p><p className="mt-3 text-xs">서버에서 확인한 상품 금액입니다. 배송비는 별도 협의하며 주문·결제는 아직 확정되지 않았습니다.</p></section>}
    <div className="flex flex-wrap gap-3"><Link onClick={()=>setIsCartOpen(false)} href="/wholesale" className="rounded bg-green-900 px-5 py-3 text-white">개인·도매 구매 문의</Link><Link onClick={()=>setIsCartOpen(false)} href='/shop?mode=export' className="rounded border px-5 py-3">해외 상품·RFQ 선택</Link></div>
  </div>;
}
