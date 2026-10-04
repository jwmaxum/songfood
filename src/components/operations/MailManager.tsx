'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
type Status={transport:{verified_at:string|null;last_checked_at:string|null;last_code:string};daily_cap:number;events:{id:string;event:string;attempt:number;code:string;created_at:string;notification_id:string}[];pending:{notification_id:string;state:string;last_code:string;lease_until:string|null}[]};
export default function MailManager(){
 const [data,setData]=useState<Status|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function load(){const r=await fetch('/api/admin/mail',{cache:'no-store'}),b=await r.json();if(!r.ok)throw Error(b.error);setData(b);}
 useEffect(()=>{let active=true;fetch('/api/admin/mail',{cache:'no-store'}).then(async r=>{const b=await r.json();if(!r.ok)throw Error(b.error);if(active)setData(b);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
 async function verify(){setBusy(true);setError('');try{const r=await fetch('/api/admin/mail',{method:'POST'}),b=await r.json();if(!r.ok)throw Error(b.error);await load();}catch(e){setError(e instanceof Error?e.message:'연결 점검 실패');}finally{setBusy(false);}}
 return <div className="mt-6 space-y-5 text-stone-900"><p>Gmail SMTP · Supabase Edge Function · 직원 확인 후 수동 발송. 하루 최대 50회이며 회원인증 메일과 Gmail 한도를 공유합니다.</p><p>SMTP 접수는 고객 수신 확인이 아닙니다. 네트워크 단절·결과 불명은 자동 재발송하지 않고 Gmail 보낸 편지함과 고객 수신을 확인합니다.</p>
 {error&&<p role="alert" className="rounded bg-red-100 p-3">{error}</p>}
 <button disabled={busy} onClick={()=>void verify()} className="rounded bg-stone-900 px-4 py-3 text-white disabled:opacity-40">SMTP 연결·인증 점검 · 메일 발송 없음</button>
 {data&&<><p role="status">점검 결과: {data.transport.last_code} · 최근 성공 {data.transport.verified_at?new Date(data.transport.verified_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'없음'} KST</p>
 <Link href="/admin/crm" className="underline">CRM 상세에서 수신자 확인·메일 발송</Link>
 <h2 className="text-xl font-semibold">실패·결과 불명·처리 중 ({data.pending.length})</h2>
 <ul className="space-y-2">{data.pending.map(n=><li key={n.notification_id} className="break-all rounded border p-3">{n.state} · {n.last_code||'진행 중'} · {n.notification_id}{n.state==='sending'&&<p>기한 경과 후 CRM에서 결과를 조회하면 결과 불명으로 격리합니다.</p>}</li>)}</ul>
 <h2 className="text-xl font-semibold">최근 발송 감사 이력</h2><ul className="space-y-2">{data.events.map(e=><li key={e.id} className="break-words rounded border p-3">{e.event} · 시도 {e.attempt} · {e.code} · {new Date(e.created_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} KST</li>)}</ul></>}
 </div>;
}
