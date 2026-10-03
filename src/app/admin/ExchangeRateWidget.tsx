'use client';
import { useEffect, useState } from 'react';
import type { ExchangeRate } from '@/lib/pricing/types';
export default function ExchangeRateWidget() {
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(id);},[]);
  const [rates,setRates]=useState<ExchangeRate[]>([]);
  const [allowed,setAllowed]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    fetch('/api/admin/pricing',{cache:'no-store',signal:controller.signal}).then(async r=>{
      const data=await r.json();if(!r.ok)throw new Error(data.error);setRates(data.rates);setAllowed(data.canApprove);
    }).catch(e=>{if(e.name!=='AbortError')setMessage('환율 정보를 확인하지 못했습니다.');});
    return ()=>controller.abort();
  },[]);
  async function save(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();setBusy(true);setMessage('');
    const form=Object.fromEntries(new FormData(e.currentTarget));
    try {
      const response=await fetch('/api/admin/pricing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        action:'rate',...form,observed_at:new Date(String(form.observed_at)).toISOString(),valid_until:new Date(String(form.valid_until)).toISOString()})});
      const result=await response.json();if(!response.ok)throw new Error(result.error);
      setRates(old=>[result.data,...old].slice(0,30));setMessage('환율 승인과 이력을 저장했습니다.');
    } catch(error) {setMessage(error instanceof Error?error.message:'환율을 저장하지 못했습니다.');}
    finally {setBusy(false);}
  }
  const latest=rates[0],active=latest && Date.parse(latest.observed_at)<=now && Date.parse(latest.valid_until)>now;
  return <section className="rounded-xl border border-stone-700 bg-stone-900 p-5">
    <h2 className="text-xl font-bold text-white">USD 환율 관리</h2>
    <p className="mt-3 text-sm text-stone-300">{active?'1 USD = '+latest.krw_per_usd+' KRW · '+latest.source:'승인된 유효 환율이 없습니다. 해외 자동 가격 계산이 중지됩니다.'}</p>
    {latest && <p className="mt-2 text-xs text-stone-400">유효 종료: {new Date(latest.valid_until).toLocaleString('ko-KR')}</p>}
    {allowed && <form onSubmit={save} className="mt-5 grid gap-3 sm:grid-cols-2">
      <label className="text-sm">KRW / 1 USD<input name="krw_per_usd" type="number" min="0.000001" step="0.000001" required className="mt-1 w-full rounded border border-stone-600 bg-stone-950 p-2" /></label>
      <label className="text-sm">출처<input name="source" required minLength={3} maxLength={1000} placeholder="실제 환율 출처와 기준" className="mt-1 w-full rounded border border-stone-600 bg-stone-950 p-2" /></label>
      <label className="text-sm">기준시각<input name="observed_at" type="datetime-local" required className="mt-1 w-full rounded border border-stone-600 bg-stone-950 p-2" /></label>
      <label className="text-sm">유효 종료 (기준시각부터 최대 7일)<input name="valid_until" type="datetime-local" required className="mt-1 w-full rounded border border-stone-600 bg-stone-950 p-2" /></label>
      <label className="text-sm sm:col-span-2">승인 사유<input name="reason" required minLength={3} maxLength={1000} className="mt-1 w-full rounded border border-stone-600 bg-stone-950 p-2" /></label>
      <button disabled={busy} className="rounded bg-amber-300 p-3 font-bold text-black disabled:opacity-50">{busy?'저장 중…':'환율 승인·적용'}</button>
    </form>}
    {message && <p role="status" className="mt-3 text-sm text-amber-200">{message}</p>}
    <details className="mt-4"><summary className="cursor-pointer text-sm">최근 환율 이력 ({rates.length})</summary><ul className="mt-2 space-y-2 text-xs text-stone-400">{rates.map(r=><li key={r.id}>{r.krw_per_usd} KRW/USD · {r.source} · 기준 {new Date(r.observed_at).toLocaleString('ko-KR')}</li>)}</ul></details>
  </section>;
}
