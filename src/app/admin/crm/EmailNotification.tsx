'use client';
import {useRef,useState} from 'react';
import type {MailPreview} from '@/lib/notifications/types';
import {EMAIL_STATES} from '@/lib/notifications/types';
export default function EmailNotification({id}:{id:string}){
 const [preview,setPreview]=useState<MailPreview|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[confirmed,setConfirmed]=useState(false),[reason,setReason]=useState('');
 const key=useRef<string|null>(null),url='/api/admin/crm/notifications/'+id+'/email';
 async function load(){const r=await fetch(url,{cache:'no-store'}),b=await r.json();if(!r.ok)throw Error(b.error);setPreview(b);setConfirmed(false);}
 async function act(action:'preview'|'send'|'reset'){
  if(busy)return;setBusy(true);setError('');
  try{if(action==='preview'){await load();return;}
   key.current??=crypto.randomUUID();
   const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,confirmed,reason,hash:preview?.hash,request_key:key.current})}),b=await r.json();if(!r.ok)throw Error(b.error);
   if(action==='reset')key.current=null;await load();
  }catch(e){setError(e instanceof Error?e.message:'메일 처리 상태를 확인해 주세요.');}finally{setBusy(false);}
 }
 return <section className="mt-3 space-y-3 rounded border border-stone-700 p-3"><p className="font-semibold">실제 고객 이메일 · 내부 테스트와 별도</p>
 <button disabled={busy} onClick={()=>void act('preview')} className="rounded border px-3 py-2">수신자·메일 미리보기 / 결과 조회</button>
 {error&&<p role="alert" className="text-red-200">{error}</p>}
 {preview&&<><p>{EMAIL_STATES[preview.delivery.state]} · {preview.delivery.attempt}회</p><p className="break-all">수신자: {preview.recipient}</p><p>{preview.subject}</p><p className="whitespace-pre-wrap break-words">{preview.text}</p>
 <label className="block">발송 또는 결과 확인 사유<input maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} className="mt-1 w-full rounded border bg-stone-950 p-2"/></label>
 <label className="flex items-start gap-2"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>수신자·내용을 확인했습니다. 결과 불명의 재시도는 Gmail 보낸 편지함과 고객 수신을 확인했습니다.</label>
 {preview.delivery.state==='queued'&&<button disabled={busy||!confirmed||reason.trim().length<3} onClick={()=>void act('send')} className="rounded border border-green-500 px-3 py-2 disabled:opacity-40">실제 이메일 발송</button>}
 {['failed','uncertain'].includes(preview.delivery.state)&&<button disabled={busy||!confirmed||reason.trim().length<10} onClick={()=>void act('reset')} className="rounded border border-amber-400 px-3 py-2 disabled:opacity-40">관리자 확인 후 발송 대기로 복구</button>}
 </>}
 </section>;
}
