'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import type {OpsData} from '@/lib/operations/types';
import {QUALITY_LABELS} from '@/lib/operations/types';
export default function QualitySummary(){
 const [data,setData]=useState<OpsData|null>(null),[error,setError]=useState('');
 useEffect(()=>{const c=new AbortController();fetch('/api/admin/operations/quality',{cache:'no-store',signal:c.signal}).then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.error);setData(b);}).catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();},[]);
 return <section className="rounded-xl border bg-white p-5"><h2 className="font-bold">상품·가격 운영 점검</h2>{error?<p role="alert" className="mt-3 text-red-800">조회 불가: {error} · <Link className="underline" href="/admin/quality">다시 확인</Link></p>:!data?<p className="mt-3">가격 자료 조회 중…</p>:<><div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-5">{Object.entries(QUALITY_LABELS).map(([key,label])=><Link key={key} href={'/admin/quality?category='+key} className="rounded bg-stone-50 p-3 text-sm">{label}<strong className="mt-1 block text-xl">{data.counts?.[key]||0}</strong></Link>)}</div>{data.rate_alert&&<Link className="mt-4 block text-sm text-amber-900 underline" href="/admin/pricing">{data.rate_alert} → 환율 관리</Link>}<p className="mt-3 text-xs text-stone-500">상품·가격표 조합별 건수입니다. 업무 검색 조건과 별도로 집계합니다.</p></>}</section>;
}
