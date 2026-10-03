'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {INQUIRY_STATUSES,INQUIRY_STATUS_LABELS} from '@/lib/commercial-inquiry';
import type {CrmInquiry} from '@/lib/crm/types';
import CrmWorkspace from './CrmWorkspace';
type List={inquiries:CrmInquiry[];staff:{id:string;name:string;role:string}[];total:number;page:number;page_size:number};
const input='rounded border border-stone-700 bg-stone-900 p-2 text-sm text-white';
export default function AdminCRMPage({initialId}:{initialId?:string}) {
  const [params,setParams]=useState('page=1'),[revision,setRevision]=useState(0),[data,setData]=useState<List|null>(null),[error,setError]=useState(''),[selected,setSelected]=useState<string|null>(initialId||null);
  useEffect(()=>{const c=new AbortController();fetch('/api/admin/crm?'+params,{cache:'no-store',signal:c.signal}).then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.error);setData(b);setError('');}).catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();},[params,revision]);
  const query=new URLSearchParams(params),page=Number(query.get('page'))||1;
  function changePage(n:number){const next=new URLSearchParams(params);next.set('page',String(n));setParams(next.toString());}
  return <main className="min-h-screen min-w-0 bg-[#0a0a0c] px-3 py-6 text-stone-100 sm:p-8"><div className="mx-auto max-w-[1500px] space-y-6">
    <header><p className="text-xs tracking-widest text-amber-400">SONGFOOD · INQUIRY CRM</p><h1 className="mt-2 text-3xl font-bold">RFQ·구매 문의 관리</h1><p className="mt-3 text-sm text-stone-400">접수 → 담당자 검토 → 견적 초안. 내부 메모와 고객 공개 회신을 구분해 기록합니다.</p></header>
    <Link href="/admin?kind=inquiry" className="inline-block underline">담당자·기한·견적 대기 통합 검색</Link>
    <form key={params} onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget),p=new URLSearchParams();for(const[k,v]of f.entries())if(String(v))p.set(k,String(v));p.set('page','1');setParams(p.toString());}} className="flex flex-wrap gap-3 rounded-xl border border-stone-800 p-4">
      <label className="min-w-0 flex-1 text-xs">상호·고객 담당자·이메일·국가·접수번호<input name="q" defaultValue={query.get('q')||''} maxLength={120} className={input+' mt-1 w-full min-w-0'}/></label>
      <label className="text-xs">종류<select name="kind" defaultValue={query.get('kind')||''} className={input+' mt-1 block'}><option value="">전체</option><option value="export_rfq">해외 RFQ</option><option value="domestic_wholesale">국내 구매</option></select></label>
      <label className="text-xs">상태<select name="status" defaultValue={query.get('status')||''} className={input+' mt-1 block'}><option value="">전체</option>{INQUIRY_STATUSES.map(s=><option key={s} value={s}>{INQUIRY_STATUS_LABELS[s]}</option>)}</select></label>
      <label className="text-xs">배정<select name="assigned_to" defaultValue={query.get('assigned_to')||''} className={input+' mt-1 block'}><option value="">전체 담당자</option><option value="unassigned">미배정</option>{data?.staff.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <button className="self-end rounded bg-amber-400 px-4 py-2 text-sm font-bold text-stone-950">검색·필터</button><button type="button" onClick={()=>setRevision(n=>n+1)} className="self-end rounded border px-4 py-2 text-sm">목록 새로고침</button>
    </form>
    {error&&<p role="alert" className="rounded bg-red-950 p-4 text-sm">{error}</p>}
    <div className={'grid items-start gap-5 '+(selected?'xl:grid-cols-[340px_minmax(0,1fr)]':'')}>
      <section aria-label="문의 목록" className="min-w-0 space-y-3">{!data?<p>문의 목록을 불러오는 중…</p>:<><p className="text-sm text-stone-400">전체 {data.total}건 · {page}페이지</p>{!data.inquiries.length?<p className="rounded border border-stone-800 p-6">조건에 맞는 문의가 없습니다.</p>:data.inquiries.map(i=><button key={i.id} aria-pressed={selected===i.id} onClick={()=>setSelected(i.id)} className={'block w-full rounded-xl border p-4 text-left '+(selected===i.id?'border-amber-500 bg-stone-900':'border-stone-800 hover:bg-stone-900')}><span className="text-xs text-amber-300">{i.kind==='export_rfq'?'해외 RFQ':'국내 구매'} · {INQUIRY_STATUS_LABELS[i.status]}</span><span className="mt-2 block font-bold">{i.company}</span><span className="mt-2 block text-xs text-stone-400">{i.contact_name} · {i.country||'국내'} · {data.staff.find(s=>s.id===i.assigned_to)?.name||'미배정'}</span><span className="mt-2 block break-all text-xs text-stone-500">{i.id}</span></button>)}
      <nav aria-label="문의 페이지" className="flex items-center justify-center gap-4 py-3"><button disabled={page<=1} onClick={()=>changePage(page-1)} className="rounded border px-3 py-2 text-sm disabled:opacity-30">이전</button><span className="text-xs">{page} / {Math.max(1,Math.ceil(data.total/30))}</span><button disabled={page*30>=data.total} onClick={()=>changePage(page+1)} className="rounded border px-3 py-2 text-sm disabled:opacity-30">다음</button></nav></>}</section>
      {selected&&<CrmWorkspace key={selected} id={selected} staff={data?.staff||[]} changed={()=>setRevision(n=>n+1)}/>}
    </div>
  </div></main>;
}
