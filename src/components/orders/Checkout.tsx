'use client';
import Feedback from '@/components/storefront/Feedback';

import Link from 'next/link';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {useAuth} from '@/context/AuthContext';
import {useCart,cartUnit} from '@/context/CartContext';
import {orderPost} from '@/lib/orders/client';
import {TEMPERATURES} from '@/lib/orders/types';
import {formatMoney} from '@/lib/pricing/types';
const input='mt-1 w-full rounded border border-stone-300 bg-white p-3 text-stone-900';
export default function Checkout(){
 const auth=useAuth(),cart=useCart(),router=useRouter(),[busy,setBusy]=useState(false),[error,setError]=useState(''),[evidence,setEvidence]=useState('none');
 if(auth.loading)return <Feedback >회원 정보를 확인하고 있습니다…</Feedback>;
 if(!auth.user)return <section><h1 className="text-3xl font-bold">국내 주문</h1><p className="my-6">이메일 인증 후 개인·사업자 모두 주문할 수 있습니다. 사업자번호는 선택입니다.</p><Link href="/account/login" className="underline">로그인 / 회원가입</Link></section>;
 if(!cart.cartItems.length)return <section><h1 className="text-3xl font-bold">구매함이 비어 있습니다</h1><Link href="/shop" className="mt-6 block underline">상품 선택하기</Link><Link href="/account/orders" className="mt-4 block underline">접수한 주문 보기</Link></section>;
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!cart.preview||busy)return;const f=Object.fromEntries(new FormData(e.currentTarget));setBusy(true);setError('');
  try{
   const result=await orderPost('/api/orders',{
    items:cart.cartItems.map(i=>({product_id:i.product.id,unit:cartUnit(i),quantity:i.quantity})),
    expected_prices:cart.preview.lines.map(l=>({product_id:l.product_id,unit:l.unit,quantity:l.quantity,price_version_id:l.price_version_id,unit_total_minor:l.unit_total_minor,total_minor:l.total_minor})),
    delivery:{recipient:f.recipient,phone:f.phone,postal_code:f.postal_code,address:f.address,address_detail:f.address_detail,desired_date:f.desired_date,temperature:f.temperature,note:f.note},
    evidence_request:{kind:evidence,company:f.company||'',registration_no:f.registration_no||'',email:f.email||'',note:f.evidence_note||''}
   });
   cart.clearCart();router.push('/account/orders/'+result.id);
  }catch(e){setError(e instanceof Error?e.message:'주문 접수 실패');}finally{setBusy(false);}
 }
 return <><p className="text-sm text-green-800">DOMESTIC ORDER</p><h1 className="mt-2 text-3xl font-bold">국내 주문 접수</h1>
 <p className="mt-4 leading-7 text-stone-600">접수 → 공급·배송비 확인 → 최종 금액 확인 → 계좌입금 → 출고 순서로 진행합니다. 지금은 입금하지 마세요. 개인회원도 같은 방식으로 주문할 수 있습니다.</p>
 <section className="my-8 rounded-xl bg-stone-100 p-5"><h2 className="text-xl font-bold">주문 상품</h2>{cart.cartItems.map(i=><p key={i.product.id+cartUnit(i)} className="mt-3">{i.product.name} · {i.quantity} {cartUnit(i)}</p>)}
 {cart.preview&&<div className="mt-5 border-t pt-4"><p>공급가액 {formatMoney(cart.preview.net_minor,'KRW')} + VAT {formatMoney(cart.preview.tax_minor,'KRW')}</p><p className="mt-2 font-bold">상품 합계 {formatMoney(cart.preview.total_minor,'KRW')}</p></div>}<p className="mt-3 text-sm">배송비 미확정 · 과세/면세와 포장 입수는 상품별 검수 가격을 적용합니다.</p>
 {(cart.loading||cart.error)&&<Feedback  className="mt-3 text-amber-800">{cart.error||'현재 가격을 확인하고 있습니다…'}</Feedback>}<Link href="/cart" className="mt-4 inline-block underline">수량·가격 다시 확인</Link></section>
 <form onSubmit={submit} className="space-y-6"><fieldset disabled={busy} className="grid gap-5 sm:grid-cols-2"><legend className="mb-4 text-xl font-bold">배송 정보</legend>
 <label>수령인<input name="recipient" required maxLength={100} defaultValue={auth.user.name} autoComplete="shipping name" className={input}/></label>
 <label>연락처<input name="phone" type="tel" required maxLength={30} autoComplete="shipping tel" className={input}/></label>
 <label>우편번호<input name="postal_code" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} required autoComplete="shipping postal-code" className={input}/></label>
 <label>희망 배송일 (선택)<input type="date" name="desired_date" className={input}/></label>
 <label className="sm:col-span-2">주소<input name="address" required maxLength={300} autoComplete="shipping address-line1" className={input}/></label>
 <label className="sm:col-span-2">상세주소<input name="address_detail" maxLength={200} autoComplete="shipping address-line2" className={input}/></label>
 <label>보관·배송 온도<select name="temperature" className={input}>{Object.entries(TEMPERATURES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
 <label className="sm:col-span-2">배송 요청 (선택)<textarea name="note" maxLength={1000} className={input}/></label></fieldset>
 <fieldset disabled={busy} className="space-y-4"><legend className="mb-4 text-xl font-bold">거래 증빙 (선택)</legend>
 <label className="block">증빙 요청<select value={evidence} onChange={e=>setEvidence(e.target.value)} className={input}><option value="none">나중에 협의 / 별도 요청 없음</option><option value="cash_receipt">현금영수증 발행 요청</option><option value="tax_invoice">사업자 세금계산서 발행 요청</option></select></label>
 {evidence==='tax_invoice'&&<div className="grid gap-4 sm:grid-cols-2"><label>회사명<input name="company" required maxLength={200} className={input}/></label><label>사업자번호<input name="registration_no" required maxLength={20} className={input}/></label><label className="sm:col-span-2">증빙 수신 이메일<input name="email" type="email" required maxLength={254} defaultValue={auth.user.email} className={input}/></label></div>}
 {evidence!=='none'&&<><p className="text-sm text-stone-600">발행 요청을 담당자에게 전달합니다. 자동 발행되지 않습니다. 현금영수증 식별정보는 담당자와 별도로 확인하며 주민등록번호는 입력하지 마세요.</p><label className="block">증빙 요청사항<textarea name="evidence_note" maxLength={500} className={input}/></label></>}</fieldset>
 <label className="flex gap-3 rounded border p-4"><input type="checkbox" required className="mt-1 h-4 w-4"/><span>공급 가능 여부와 배송비 확인이 필요한 주문 접수임을 확인했습니다. 최종 조건을 확인한 뒤 입금하겠습니다.</span></label>
 {error&&<Feedback error className="rounded bg-red-50 p-4 text-red-800">{error}</Feedback>}
 <button disabled={busy||cart.loading||!cart.preview||Boolean(cart.error)} className="rounded bg-green-900 px-8 py-4 font-semibold text-white disabled:opacity-40">{busy?'접수 중…':'주문 접수하기'}</button></form></>;
}
