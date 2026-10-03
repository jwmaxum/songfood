'use client';
import Feedback from '@/components/storefront/Feedback';

import {displayDate} from '@/lib/i18n/locale';
import {useLanguage} from '@/lib/i18n/LanguageContext';

import {useEffect,useState} from 'react';
import Link from '@/components/layout/LocalizedLink';
import CustomerPi from '@/components/pi/CustomerPi';
import TradeLinks from './TradeLinks';
import {useWishlist} from '@/context/WishlistContext';
type Inquiry={activities?:{id:string;event:string;message:string;created_at:string}[];id:string;kind:string;status:string;created_at:string;items:{product_id:string;product_name:string;quantity_cartons:number}[]};
const statuses:Record<string,string>={new:'접수됨',reviewing:'검토 중',responded:'회신 완료',closed:'종결'};
export default function AccountActivity() {
 const {t:ui,language}=useLanguage();

  const [data,setData]=useState<Inquiry[]>([]),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0),[filter,setFilter]=useState('all');
  const {wishlist,removeFromWishlist}=useWishlist();
  useEffect(()=>{
    const c=new AbortController();
    fetch('/api/account/inquiries',{cache:'no-store',signal:c.signal}).then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.error||ui("문의 내역을 읽지 못했습니다."));setData(b.inquiries);setError('');setLoaded(true);})
      .catch(e=>{if(!c.signal.aborted){setData([]);setError(e.message);setLoaded(true);}});
    return()=>c.abort();
  },[retry,ui]);
  const shown=data.filter(i=>filter==='all'||i.kind===filter);
  return <div className="mt-8 space-y-7">
    <section aria-label={ui("구매와 견적 바로가기")} className="rounded-xl border border-stone-200 bg-white p-5"><h2 className="mb-4 text-xl font-bold">{ui("구매·견적 이어가기")}</h2><TradeLinks/><p className="mt-3 text-xs text-stone-500">{ui("구매함은 이 브라우저의 선택 상품입니다. 아래 접수 내역은 본인 또는 활성 소속 회사의 실제 문의입니다.")}</p></section>
    <section id="inquiries" className="rounded-xl border border-stone-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">{ui("국내 문의·해외 RFQ 내역")}</h2><label className="text-sm">{ui("구분")}<select aria-label={ui("문의 내역 구분")} value={filter} onChange={e=>setFilter(e.target.value)} className="ml-3 rounded border border-stone-300 p-2"><option value="all">{ui("전체")}</option><option value="domestic_wholesale">{ui("국내 구매 문의")}</option><option value="export_rfq">{ui("해외 RFQ")}</option></select></label></div>
      {!loaded&&<Feedback  className="mt-5">{ui("접수 내역을 확인하고 있습니다…")}</Feedback>}{error&&<div role="alert" className="mt-5 rounded bg-amber-50 p-4"><p className="text-sm">{ui(error)}</p><button onClick={()=>setRetry(n=>n+1)} className="mt-2 text-sm underline">{ui("다시 시도")}</button></div>}
      {loaded&&!error&&!shown.length&&<p className="mt-5 rounded-lg bg-stone-50 p-5 text-sm text-stone-600">{ui("표시할 접수 내역이 없습니다. 로그인 상태로 제출한 문의부터 연결됩니다. 과거 비회원 접수는 자동 연결되지 않습니다.")}</p>}
      <ul className="mt-4 divide-y divide-stone-200">{shown.map(i=><li key={i.id} className="py-4"><div className="flex flex-wrap items-center justify-between gap-3"><span className="font-semibold">{i.kind==='export_rfq'?ui("해외 RFQ"):ui("국내 구매 문의")}</span><span className="rounded-full bg-green-50 px-3 py-1 text-xs text-green-900">{ui(statuses[i.status]||"상태 확인 필요")}</span></div><p className="mt-2 text-xs text-stone-500">{displayDate(i.created_at,language)} (KST)</p><p className="mt-2 break-all text-xs">{ui("접수번호: ")}{i.id}</p>{i.items?.length>0&&<details className="mt-3 text-sm"><summary className="cursor-pointer">{ui("요청 상품 ")}{i.items.length}{ui("개")}</summary><ul className="mt-2 space-y-2">{i.items.map((item,n)=><li key={item.product_id+n}>{item.product_name} · {item.quantity_cartons} CTN</li>)}</ul></details>}{!!i.activities?.length&&<details className="mt-3 text-sm"><summary className="cursor-pointer">{ui("진행·회신 내역")}</summary><ul className="mt-3 space-y-3">{i.activities.map(a=><li key={a.id} className="rounded bg-stone-50 p-3"><p className="text-xs text-stone-500">{displayDate(a.created_at,language)}</p><p className="mt-2 whitespace-pre-wrap">{a.message}</p></li>)}</ul></details>}</li>)}</ul>
      {!!data.length&&<p className="mt-3 text-xs text-stone-500">{ui("최근 접수 최대 100건을 표시합니다. 접수 상태는 주문·입금·출고 상태와 다릅니다.")}</p>}
    </section>
    <CustomerPi/><div className="grid gap-4 sm:grid-cols-2"><section className="rounded-xl border p-5"><h2 className="font-bold">{ui("국내 주문·배송")}</h2><p className="mt-3 text-sm text-stone-600">{ui("주문·입금·출고 내역에서 실제 처리 상태를 확인할 수 있습니다. 공급·배송 조건 확인 후 최종 금액을 수락해 주세요.")}</p><Link href="/account/orders" className="mt-4 inline-block text-sm text-green-800 underline">{ui("내 주문·입금·배송 조회")}</Link></section><section className="rounded-xl border p-5"><h2 className="font-bold">{ui("Proforma Invoice·거래서류")}</h2><p className="mt-3 text-sm text-stone-600">{ui("발행된 PI는 위 견적송장 영역에서 열람·다운로드·수정 요청·수락할 수 있습니다. RFQ 접수번호는 PI가 아니며 최종 Commercial Invoice와 구분됩니다.")}</p><Link href="/rfq" className="mt-4 inline-block text-sm text-green-800 underline">{ui("서류 요구사항을 RFQ에 남기기")}</Link></section></div>
    <section id="wishlist" className="rounded-xl border p-5"><h2 className="font-bold">{ui("관심상품 (")}{wishlist.length})</h2>{!wishlist.length?<p className="mt-3 text-sm text-stone-500">{ui("상품 상세에서 관심상품을 저장할 수 있습니다.")}</p>:<ul className="mt-3 space-y-3">{wishlist.map(p=><li key={p.id} className="flex items-start justify-between gap-3 text-sm"><Link href={'/products/'+encodeURIComponent(p.id)} className="text-green-800 underline">{p.name}</Link><button onClick={()=>removeFromWishlist(p.id)} className="shrink-0 underline">{ui("삭제")}</button></li>)}</ul>}</section>
  </div>;
}
