'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import FieldError from '@/components/storefront/FieldError';
import {submissionKey,forgetSubmissionKey} from '@/lib/inquiry-client';
import {InquiryValidationError} from '@/lib/commercial-inquiry';
import {useRFQ} from '@/context/RFQContext';
import {useAuth} from '@/context/AuthContext';
import {usePricing,usePricePreview} from '@/context/PricingContext';
import {formatMoney,FOB_NOTICE} from '@/lib/pricing/types';
import type {ProductItem} from '@/lib/types';
const input='mt-2 w-full rounded-lg border border-stone-300 bg-white p-3 text-sm text-stone-900';
export default function RFQPage() {
  const rfq=useRFQ(),{user}=useAuth(),{products:prices}=usePricing();
  const [products,setProducts]=useState<ProductItem[]>([]),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState(''),[retry,setRetry]=useState(0);
  const [submitting,setSubmitting]=useState(false),[error,setError]=useState(''),[reference,setReference]=useState(''),[previewRequested,setPreviewRequested]=useState(false);
  const {buyerDraft:form,setBuyerDraft:setForm}=rfq;
  const completed=useRef<{payload:unknown;identity:string}|null>(null);
  async function newRequest(){if(completed.current)await forgetSubmissionKey(completed.current.payload,completed.current.identity);completed.current=null;setReference('');rfq.clear();}
  const [fieldErrors,setFieldErrors]=useState<Record<string,string>>({});
  useEffect(()=>{
    const c=new AbortController();
    fetch('/api/products',{cache:'no-store',signal:c.signal}).then(async r=>{
      if(!r.ok)throw new Error('상품을 불러오지 못했습니다. / Unable to load products.');
      const b=await r.json();setProducts(b.data);setLoadError('');setLoading(false);
    }).catch(e=>{if(!c.signal.aborted){setLoadError(e.message);setLoading(false);}});
    return()=>c.abort();
  },[retry]);
  const merge=rfq.mergeMissing,ready=rfq.ready,imported=useRef(false);
  useEffect(()=>{
    if(!ready||!products.length||imported.current)return;
    imported.current=true;
    const params=new URLSearchParams(window.location.search),ids=(params.get('products')||params.get('product')||'').split(',');
    merge(ids.filter(id=>products.some(p=>p.id===id)).map(product_id=>({product_id,quantity:Math.max(prices[product_id]?.export_moq_ctn||1,prices[product_id]?.units.CTN?.quantity||1)})));
  },[ready,products,prices,merge]);
  const missing=rfq.items.some(i=>!products.some(p=>p.id===i.product_id));
  const quote=usePricePreview(previewRequested&&form.incoterms==='FOB'?rfq.items.map(i=>({...i,unit:'CTN' as const})):[],'export');
  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();setError('');setFieldErrors({});
    if(!rfq.items.length||missing){setError('선택 상품을 확인해 주세요. / Review the selected products.');return;}
    setSubmitting(true);
    try {
      const items=rfq.items.map(i=>({product_id:i.product_id,product_name:products.find(p=>p.id===i.product_id)!.name_en||products.find(p=>p.id===i.product_id)!.name,quantity_cartons:i.quantity}));
      const payload={kind:'export_rfq',...form,items,required_documents:(form.required_documents||'').split(/\r?\n/).map(v=>v.trim()).filter(Boolean)};
      const key=await submissionKey(payload,user?.id||'guest');
      const r=await fetch('/api/commercial-inquiries',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(payload)});
      const b=await r.json();if(!r.ok||!b.success){setFieldErrors(b.fields||{});throw new Error(b.error||'RFQ submission failed.');}
      completed.current={payload,identity:user?.id||'guest'};setReference(b.id);
    } catch(e){if(e instanceof InquiryValidationError)setFieldErrors(e.fields);setError(e instanceof Error?e.message:'요청에 실패했습니다. / Request failed.');}
    finally{setSubmitting(false);}
  }
  return <main className="mx-auto max-w-6xl space-y-7 px-4 py-9 sm:px-6">
    <header><p className="text-xs font-bold tracking-widest text-amber-800">OVERSEAS BUYERS · CTN</p><h1 className="mt-2 text-3xl font-bold">해외 견적함 / Export RFQ</h1><p className="mt-3 text-sm text-stone-600">Review your cartons and destination. Our team will check supply, MOQ and shipping terms before issuing a quotation.</p><nav className="mt-5 flex flex-wrap gap-4 text-sm"><Link href="/shop?mode=export" className="font-bold text-green-900 underline">상품 추가 / Add products</Link><Link href="/cart" className="text-stone-600 underline">국내 구매함</Link><Link href="/account" className="text-stone-600 underline">My account</Link></nav></header>
    {reference?<section role="status" className="rounded-xl border border-green-300 bg-green-50 p-7"><h2 className="text-2xl font-bold">RFQ received / 접수 완료</h2><p className="mt-3 break-all">Reference: {reference}</p><p className="mt-3 text-sm">This is a request receipt, not a Proforma Invoice or an order confirmation.</p><p className="mt-3 text-sm">{user?'마이페이지에서 접수 내역을 확인할 수 있습니다.':'접수번호를 보관해 주세요. 비회원 접수는 계정에 자동 연결되지 않습니다.'}</p><Link href="/account" className="mt-5 inline-block underline">마이페이지 / My account</Link><button onClick={()=>void newRequest()} className="ml-5 mt-5 rounded border px-4 py-2">새 견적함 / New request</button></section>:
    <form onSubmit={submit} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"><div className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5"><h2 className="text-xl font-bold">1. 선택 상품 / Products ({rfq.items.length})</h2>
        {(loading||!ready)&&<p role="status">견적함을 불러오는 중입니다… / Loading…</p>}
        {loadError&&<div role="alert"><p>{loadError}</p><button type="button" onClick={()=>setRetry(n=>n+1)} className="mt-2 underline">다시 시도 / Retry</button></div>}
        {!loading&&ready&&!rfq.items.length&&<p className="rounded-lg bg-stone-50 p-5 text-sm">견적함이 비어 있습니다. <Link href="/shop?mode=export" className="text-green-900 underline">카탈로그에서 상품을 선택하세요. / Browse products</Link></p>}
        {rfq.items.map(i=>{const p=products.find(p=>p.id===i.product_id),minimum=prices[i.product_id]?.export_moq_ctn;return <article key={i.product_id} className="space-y-3 border-t border-stone-200 pt-4"><p className="break-all text-xs text-stone-500">{p?.sku||i.product_id}</p><h3 className="font-bold">{p?.name_en||p?.name||'상품 확인 필요 / Product unavailable'}</h3><p className="text-xs text-stone-600">Export MOQ: {minimum?minimum+' CTN':'To be confirmed'} · {prices[i.product_id]?.loading_port?'FOB '+prices[i.product_id].loading_port:'Loading port subject to review'}</p><div className="flex flex-wrap items-end gap-3"><label className="text-sm">Cartons (CTN)<input aria-label={(p?.sku||i.product_id)+' RFQ 수량'} type="number" required min={1} max={100000} step={1} value={i.quantity} onChange={e=>rfq.setQuantity(i.product_id,Number(e.target.value))} className="ml-3 w-24 rounded border border-stone-300 p-2"/></label><button type="button" onClick={()=>rfq.remove(i.product_id)} className="p-2 text-sm underline">삭제 / Remove</button></div>{minimum&&i.quantity<minimum?<p className="text-sm text-amber-800">Below reviewed MOQ. The request will need individual review.</p>:null}</article>;})}
        {missing&&!loading&&<p role="alert" className="text-sm text-red-800">Unavailable products must be removed before submission.</p>}
        {Object.entries(fieldErrors).filter(([key])=>key.startsWith('items')).map(([key,message])=><p key={key} role="alert" className="text-sm text-red-800">{message}</p>)}<p className="text-xs text-stone-500">상품·수량만 이 브라우저에 보관합니다. / Product selections persist in this browser.</p>
      </section>
      <section className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="text-xl font-bold">2. Destination & buyer details</h2><p className="mt-2 text-sm text-stone-600">* Required fields. Company details are optional. Buyer details stay in this page session until submitted.</p><div className="mt-5 grid gap-4 sm:grid-cols-2">
        {([['country','Destination country *'],['destination_port','Destination port / city'],['company','Company (optional)'],['contact_name','Contact name *'],['email','Email *'],['phone','Phone / WhatsApp']]as const).map(([k,label])=><label key={k} className="text-sm">{label}<input required={['country','contact_name','email'].includes(k)} type={k==='email'?'email':'text'} maxLength={k==='email'?254:100} aria-invalid={!!fieldErrors[k]} aria-describedby={fieldErrors[k]?'error-'+k:undefined} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} className={input}/><FieldError name={k} errors={fieldErrors}/></label>)}
        <label className="text-sm">Incoterms requested<select value={form.incoterms} onChange={e=>{setForm({...form,incoterms:e.target.value});setPreviewRequested(false);}} className={input}>{['FOB','CIF','CFR','EXW'].map(t=><option key={t}>{t}</option>)}</select></label>
        <label className="text-sm">Requested loading port<input maxLength={120} value={form.requested_loading_port||''} onChange={e=>setForm({...form,requested_loading_port:e.target.value})} className={input}/><FieldError name="requested_loading_port" errors={fieldErrors}/></label>
        <label className="text-sm">Preferred ship date<input type="date" value={form.desired_ship_date||''} onChange={e=>setForm({...form,desired_ship_date:e.target.value})} className={input}/><FieldError name="desired_ship_date" errors={fieldErrors}/></label>
        <label className="text-sm sm:col-span-2">Required documents (one per line)<textarea rows={3} maxLength={2420} value={form.required_documents||''} onChange={e=>setForm({...form,required_documents:e.target.value})} className={input}/><FieldError name="required_documents" errors={fieldErrors}/></label>
        <label className="text-sm">Business type<input value={form.business_type} maxLength={100} onChange={e=>setForm({...form,business_type:e.target.value})} className={input}/></label>
        <label className="text-sm sm:col-span-2">Specifications, documents & delivery requirements<textarea rows={4} maxLength={10000} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className={input}/><FieldError name="notes" errors={fieldErrors}/></label>
      </div></section>
    </div><aside className="space-y-5 rounded-2xl border border-amber-300 bg-amber-50 p-5"><h2 className="text-xl font-bold">FOB price preview</h2><p className="text-xs leading-6">{FOB_NOTICE}</p><p className="text-xs leading-6">Reviewed quotations are issued as Proforma Invoices, not final Commercial Invoices.</p>
      {!user&&<Link href="/account/login" className="block text-sm text-green-900 underline">가격 확인 로그인 / Sign in for pricing</Link>}
      {form.incoterms==='FOB'?<button type="button" disabled={!rfq.items.length||loading||missing} onClick={()=>setPreviewRequested(true)} className="rounded-lg border border-amber-700 px-4 py-3 text-sm font-bold disabled:opacity-40">FOB 가격 확인 / Check price</button>:<p className="text-sm">Non-FOB terms require a separate quotation.</p>}
      {quote.loading&&<p role="status" className="text-sm">가격 확인 중… / Checking price…</p>}
      {previewRequested&&quote.error&&<p role="status" className="text-sm text-amber-950">{quote.error} RFQ 문의는 계속 접수할 수 있습니다.</p>}
      {quote.preview&&<div className="space-y-3 text-sm">{quote.preview.lines.map(l=><p key={l.product_id}>{products.find(p=>p.id===l.product_id)?.sku} · {formatMoney(l.unit_total_minor,'USD')} / CTN × {l.quantity} · FOB {l.loading_port}</p>)}<p className="border-t border-amber-300 pt-3 text-xl font-bold">{formatMoney(quote.preview.total_minor,'USD')}</p></div>}
      {error&&<p role="alert" className="text-sm text-red-800">{error}</p>}<button type="submit" disabled={submitting||loading||!ready||!rfq.items.length||missing||!!loadError} className="w-full rounded-lg bg-green-950 px-5 py-4 font-bold text-white disabled:opacity-40">{submitting?'Submitting…':'견적 요청 제출 / Submit RFQ'}</button><p className="text-xs">접수 후 수량·납기·최종 거래 조건을 확인합니다. 결제가 진행되지 않습니다.</p>
    </aside></form>}
  </main>;
}
