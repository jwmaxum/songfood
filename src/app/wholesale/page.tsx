'use client';
import Feedback from '@/components/storefront/Feedback';

import {useLanguage} from '@/lib/i18n/LanguageContext';

import {useRef,useState,type FormEvent} from 'react';
import Link from '@/components/layout/LocalizedLink';
import FieldError from '@/components/storefront/FieldError';
import {submissionKey,forgetSubmissionKey} from '@/lib/inquiry-client';
import {InquiryValidationError} from '@/lib/commercial-inquiry';
import {useAuth} from '@/context/AuthContext';
import {useCart,cartKey,cartUnit} from '@/context/CartContext';
import {formatMoney} from '@/lib/pricing/types';
const input='mt-2 w-full rounded-lg border border-stone-300 bg-white p-3';
export default function WholesalePage() {
 const {t:ui}=useLanguage();

  const {user}=useAuth(),{cartItems,preview,error:priceError}=useCart();
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[reference,setReference]=useState('');
  const completed=useRef<{payload:unknown;identity:string}|null>(null);
  async function newRequest(){if(completed.current)await forgetSubmissionKey(completed.current.payload,completed.current.identity);completed.current=null;setReference('');}
  const [fieldErrors,setFieldErrors]=useState<Record<string,string>>({});
  const [form,setForm]=useState({company:'',contact_name:'',email:'',phone:'',business_registration_no:'',business_type:ui("개인 구매"),estimated_monthly_volume:'',notes:''});
  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();setError('');setFieldErrors({});
    const selections=cartItems.map(i=>[i.product.sku||i.product.id,i.product.name,i.quantity+' '+cartUnit(i)].join(' · ')).join('\n');
    const notes=[selections?ui("선택 상품 (공급 조건 확인 요청):\n")+selections:'',form.notes].filter(Boolean).join('\n\n');
    if(notes.length>10000){setError(ui("선택 상품과 문의 내용이 너무 깁니다. 품목을 나누어 문의해 주세요."));return;}
    setBusy(true);
    try {
      const payload={kind:'domestic_wholesale',...form,notes};
      const key=await submissionKey(payload,user?.id||'guest');
      const r=await fetch('/api/commercial-inquiries',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(payload)});
      const b=await r.json();if(!r.ok||!b.success){setFieldErrors(b.fields||{});throw new Error(b.error||ui("문의 접수에 실패했습니다."));}completed.current={payload,identity:user?.id||'guest'};setReference(b.id);
    }catch(e){if(e instanceof InquiryValidationError)setFieldErrors(e.fields);setError(e instanceof Error?e.message:ui("연결에 실패했습니다. 입력 내용은 유지됩니다."));}finally{setBusy(false);}
  }
  return <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6"><p className="text-xs font-bold tracking-widest text-green-800">DOMESTIC WHOLESALE</p><h1 className="mt-2 text-3xl font-bold">{ui("개인·국내 도매 구매 문의")}</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">{ui("필요한 수량과 공급 일정을 알려주세요. 회사·사업자번호 없이 개인도 문의할 수 있습니다. 상품 수량과 배송비를 검토한 뒤 거래 조건을 안내합니다.")}</p>
    {reference?<section role="status" className="mt-8 rounded-xl border border-green-300 bg-green-50 p-7"><h2 className="text-xl font-bold">{ui("구매 문의가 접수되었습니다.")}</h2><p className="mt-3 break-all">{ui("접수번호: ")}{reference}</p><p className="mt-3 text-sm">{ui("아직 주문·결제가 확정되지 않았습니다. ")}{user?ui("마이페이지에서 접수 내역을 확인할 수 있습니다."):ui("비회원 접수번호를 보관해 주세요.")}</p><Link href="/account" className="mt-5 inline-block underline">{ui("마이페이지")}</Link><button onClick={()=>void newRequest()} className="ml-5 mt-5 rounded border px-4 py-2">{ui("새 구매 문의")}</button></section>:
    <div className="mt-8 grid items-start gap-7 lg:grid-cols-[1fr_380px]"><form onSubmit={submit} className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5"><h2 className="text-xl font-bold">{ui("연락처·요청사항")}</h2><div className="grid gap-4 sm:grid-cols-2">
      {([['contact_name',ui("담당자·성함 *")],['email',ui("이메일 *")],['phone',ui("연락처 *")],['company',ui("회사명 (선택)")],['business_registration_no',ui("사업자번호 (선택)")],['estimated_monthly_volume',ui("예상 구매 규모 (선택)")]]as const).map(([key,label])=><label key={key} className="text-sm">{label}<input type={key==='email'?'email':'text'} required={['contact_name','email','phone'].includes(key)} maxLength={key==='email'?254:key==='phone'?50:100} aria-invalid={!!fieldErrors[key]} aria-describedby={fieldErrors[key]?'error-'+key:undefined} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} className={input}/><FieldError name={key} errors={fieldErrors}/></label>)}
      <label className="text-sm sm:col-span-2">{ui("구매 유형")}<select value={form.business_type} onChange={e=>setForm({...form,business_type:e.target.value})} className={input}>{[ui("개인 구매"),ui("식당 / 외식업체"),ui("마트 / 유통업체"),ui("급식업체"),ui("식자재 도매상"),ui("기타")].map(v=><option key={v}>{v}</option>)}</select></label>
      <label className="text-sm sm:col-span-2">{ui("추가 품목·희망 공급일·배송지역")}<textarea value={form.notes} rows={5} maxLength={5000} onChange={e=>setForm({...form,notes:e.target.value})} className={input}/><FieldError name="notes" errors={fieldErrors}/></label>
    </div>{error&&<Feedback error className="text-sm text-red-800">{error}</Feedback>}<button disabled={busy} className="w-full rounded-lg bg-green-900 p-4 font-bold text-white disabled:opacity-50">{busy?ui("접수 중…"):ui("구매 문의 제출")}</button>{!user&&<p className="text-xs text-stone-600"><Link href="/account/login" className="underline">{ui("로그인 후 제출")}</Link>{ui("하면 내 계정에서 접수 내역을 확인할 수 있습니다.")}</p>}</form>
    <aside className="space-y-4 rounded-2xl border border-green-200 bg-green-50 p-5"><div className="flex justify-between gap-3"><h2 className="text-xl font-bold">{ui("선택 상품 ")}{cartItems.length}{ui("개")}</h2><Link href="/cart" className="text-sm underline">{ui("수량 수정")}</Link></div>{!cartItems.length?<p className="text-sm">{ui("선택한 상품이 없어도 원하는 품목을 적어 문의할 수 있습니다. ")}<Link href="/shop" className="underline">{ui("상품 찾기")}</Link></p>:<ul className="divide-y divide-green-200">{cartItems.map(i=><li key={cartKey(i)} className="py-3 text-sm"><p className="font-semibold">{i.product.name}</p><p>{i.product.sku} · {i.quantity} {cartUnit(i)}</p></li>)}</ul>}
      {preview&&<div className="border-t border-green-200 pt-4 text-sm"><p>{ui("공급가액 ")}{formatMoney(preview.net_minor,'KRW')}</p><p>VAT {formatMoney(preview.tax_minor,'KRW')}</p><p className="mt-2 font-bold">{ui("상품 미리보기 ")}{formatMoney(preview.total_minor,'KRW')}</p></div>}
      {cartItems.length>0&&priceError&&<p className="text-sm text-amber-900">{priceError}</p>}<p className="text-xs leading-6">{ui("선택 상품·수량은 문의 내용에 전달됩니다. 표시 금액은 확정 견적이 아니며 배송비·출하일은 담당자와 확인합니다.")}</p>
    </aside></div>}
  </main>;
}
