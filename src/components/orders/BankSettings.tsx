'use client';
import {useEffect,useState} from 'react';
import {orderGet} from '@/lib/orders/client';
import type {BankSettings as Bank} from '@/lib/orders/types';
import {field} from './OrderActions';
export default function BankSettings(){
 const [settings,setSettings]=useState<{revision:number;data:Bank}|null>(null),[admin,setAdmin]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{let live=true;orderGet('/api/admin/orders/settings').then(d=>{if(live){setSettings(d.settings);setAdmin(d.is_admin);}}).catch(e=>{if(live)setMessage(e.message);});return()=>{live=false;};},[]);
 return <details className="my-6 rounded-xl border bg-white p-5"><summary className="cursor-pointer font-semibold">국내 계좌입금 설정 {settings?'':'· 등록 필요'}</summary>
 <p className="mt-4 text-sm">설정한 계좌는 새로 제시하는 주문 조건에 저장됩니다. 기존 주문의 확정 계좌는 바뀌지 않습니다.</p>
 {admin?<form key={settings?.revision||0} className="mt-4" onSubmit={async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));setBusy(true);setMessage('');try{
 const r=await fetch('/api/admin/orders/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:settings?.revision||0,data})}),d=await r.json();if(!r.ok)throw new Error(d.error);setSettings(d.settings);setMessage('입금 계좌를 저장했습니다.');
 }catch(e){setMessage(e instanceof Error?e.message:'저장 실패');}finally{setBusy(false);}}}>
 <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">{([['bank','은행명'],['account','계좌번호'],['holder','예금주'],['notice','입금 안내']] as const).map(([k,label])=><label key={k}>{label}<input name={k} required={k!=='notice'} maxLength={k==='notice'?1000:100} defaultValue={settings?.data[k]||''} className={field}/></label>)}<button className="rounded bg-green-900 px-4 py-3 text-white">계좌 저장</button></fieldset></form>
 :<p className="mt-4">계좌 변경은 관리자 권한이 필요합니다. {settings?.data.bank} {settings?.data.account} {settings?.data.holder}</p>}
 {message&&<p role="status" className="mt-4">{message}</p>}</details>;
}
