'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {kst} from '@/lib/operations/types';
type Data={total:number;items:{id:string;title:string;subtitle:string;created_at:string;actor_name:string;visibility:string;details:{from?:string;to?:string;due_from?:string;due_to?:string}}[]};
export default function History({kind,id}:{kind:string;id:string}){
 const[page,setPage]=useState(1),[data,setData]=useState<Data|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{const c=new AbortController();fetch('/api/admin/operations/history/'+kind+'/'+id+'?page='+page,{cache:'no-store',signal:c.signal}).then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.error);setData(b);setError('');}).catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();},[kind,id,page,retry]);
 return <main className="min-h-screen space-y-5 bg-stone-50 p-5 text-stone-900 sm:p-8"><h1 className="text-2xl font-bold">전체 업무 이력</h1><Link className="inline-block underline" href={kind==='inquiry'?'/admin/crm?inquiry='+id:'/admin/orders?order='+id}>업무 상세로 돌아가기</Link><p className="break-all text-sm">{id}</p><button className="rounded border px-4 py-2" onClick={()=>setRetry(n=>n+1)}>새로고침</button>
 {error?<p role="alert">{error}</p>:!data?<p>이력을 불러오고 있습니다…</p>:<><p>전체 {data.total}건</p><ol className="space-y-3">{data.items.map(e=><li key={e.id} className="rounded border bg-white p-4"><p className="text-xs">{kst(e.created_at)} KST · {e.actor_name||'고객/이전 계정'} · {e.visibility==='internal'?'직원 전용':'고객 공개'}</p><p className="mt-2 font-bold">{e.title}</p><p className="mt-2 whitespace-pre-wrap">{e.subtitle}</p>{e.title==='work_plan'&&<p className="mt-2 break-all text-sm">담당 {e.details.from||'미배정'} → {e.details.to||'미배정'} · 기한 {e.details.due_from?kst(e.details.due_from):'미지정'} → {e.details.due_to?kst(e.details.due_to):'미지정'}</p>}</li>)}</ol><div className="flex gap-4"><button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="rounded border px-4 py-2 disabled:opacity-30">이전</button><span>{page} / {Math.max(1,Math.ceil(data.total/30))}</span><button disabled={page*30>=data.total} onClick={()=>setPage(p=>p+1)} className="rounded border px-4 py-2 disabled:opacity-30">다음</button></div></>}
 </main>;
}
