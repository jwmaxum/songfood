'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {CrmDetail} from '@/lib/crm/types';
import {INQUIRY_STATUSES,INQUIRY_STATUS_LABELS} from '@/lib/commercial-inquiry';
import PiPanel from './PiPanel';
import EmailNotification from './EmailNotification';
import QuoteEditor from './QuoteEditor';
import QuoteHistory from './QuoteHistory';
type Staff={id:string;name:string};
const field='mt-1 w-full rounded border border-stone-600 bg-stone-950 p-2 text-sm text-white';
export default function CrmWorkspace({id,staff,changed}:{id:string;staff:Staff[];changed:()=>void}) {
  const [data,setData]=useState<CrmDetail|null>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[note,setNote]=useState(''),[visibility,setVisibility]=useState('note');
  const retry=useRef<{payload:string;key:string}|null>(null);
  const load=useCallback(async()=>{const r=await fetch('/api/admin/crm/'+id,{cache:'no-store'}),b=await r.json();if(!r.ok)throw new Error(b.error);setData(b);},[id]);
  useEffect(()=>{let active=true;fetch('/api/admin/crm/'+id,{cache:'no-store'}).then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.error);if(active)setData(b);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[id]);
  async function save(body:Record<string,unknown>) {
    if(!data||busy)return false;setBusy(true);setError('');setMessage('');
    const payload=JSON.stringify(body);
    if(retry.current?.payload!==payload)retry.current={payload,key:crypto.randomUUID()};
    try{const r=await fetch('/api/admin/crm/'+id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,revision:data.inquiry.revision,request_key:retry.current!.key})}),b=await r.json();
      if(!r.ok)throw new Error([b.error,...Object.values(b.fields||{})].join(' '));
      retry.current=null;setMessage(body.action==='quote'?'견적 초안 버전을 저장했습니다. PI는 발행되지 않았습니다.':'기록을 저장했습니다.');
      try{await load();}catch{setError('저장은 완료되었습니다. 최신 화면 조회에 실패하여 상세 새로고침이 필요합니다.');}changed();return true;
    }catch(e){setError(e instanceof Error?e.message:'저장하지 못했습니다.');return false;}finally{setBusy(false);}
  }
  async function deliver(notificationId:string,fail:boolean) {
    setBusy(true);setError('');try{const r=await fetch('/api/admin/crm/notifications/'+notificationId,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({simulate_failure:fail})}),b=await r.json();if(!r.ok)throw new Error(b.error);await load();setMessage(fail?'테스트 실패를 기록했습니다. 재시도할 수 있습니다.':'내부 테스트 수신함에 전달했습니다.');}catch(e){setError(e instanceof Error?e.message:'전달 실패');}finally{setBusy(false);}
  }
  return <section className="min-w-0 space-y-6 rounded-2xl border border-stone-800 bg-stone-950 p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">문의 상세·검토</h2><button disabled={busy} onClick={()=>{setError('');void load().catch(e=>setError(e.message));}} className="rounded border border-stone-700 px-3 py-2 text-xs">상세 새로고침</button></div>
    {error&&<p role="alert" className="rounded border border-red-800 bg-red-950 p-3 text-sm">{error}</p>}{message&&<p role="status" className="rounded bg-green-950 p-3 text-sm text-green-100">{message}</p>}
    {!data?<p>상세 내역을 불러오는 중…</p>:<>
      <header><p className="text-xs text-amber-300">{data.inquiry.kind==='export_rfq'?'해외 RFQ':'국내 구매 문의'} · {INQUIRY_STATUS_LABELS[data.inquiry.status]}</p><h3 className="mt-2 text-lg font-bold">{data.inquiry.company}</h3><p className="mt-1 break-all text-xs text-stone-400">{id} · 수정 {data.inquiry.revision}</p></header>
      <dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-stone-400">고객 담당자</dt><dd>{data.inquiry.contact_name}</dd></div><div><dt className="text-stone-400">연락처</dt><dd className="break-all">{data.inquiry.email}<br/>{data.inquiry.phone||'미입력'}</dd></div><div><dt className="text-stone-400">목적지 / 요청 조건</dt><dd>{data.inquiry.country||'국내'} / {data.inquiry.destination_port||'미입력'} / {data.inquiry.incoterms||'—'}</dd></div><div><dt className="text-stone-400">희망 선적항 / 출하일</dt><dd>{data.inquiry.requested_loading_port||'검토 요청'} / {data.inquiry.desired_ship_date||'미입력'}</dd></div></dl>
      <p className="text-sm">요구 서류: {(data.inquiry.required_documents||[]).join(', ')||'미입력'}</p>
      {!!data.inquiry.items.length&&<ul className="space-y-2 rounded border border-stone-800 p-3 text-sm">{data.inquiry.items.map(i=><li key={i.product_id}>{i.product_name} · {i.quantity_cartons} CTN</li>)}</ul>}
      {data.inquiry.notes&&<p className="whitespace-pre-wrap rounded bg-stone-900 p-4 text-sm">{data.inquiry.notes}</p>}
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">진행 상태<select disabled={busy} value={data.inquiry.status} onChange={e=>void save({action:'status',status:e.target.value})} className={field}>{INQUIRY_STATUSES.map(s=><option key={s} value={s}>{INQUIRY_STATUS_LABELS[s]}</option>)}</select></label><div className="text-sm"><p>담당: {staff.find(s=>s.id===data.inquiry.assigned_to)?.name||'미배정'}</p><p>마감: {data.inquiry.due_at?new Date(data.inquiry.due_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'미지정'}</p><Link className="mt-2 inline-block underline" href={'/admin?kind=inquiry&q='+id}>담당자·기한·인수인계 관리</Link></div></div>
      <form onSubmit={e=>{e.preventDefault();void save({action:visibility,message:note}).then(ok=>{if(ok)setNote('');});}} className="space-y-3 rounded-xl border border-stone-800 p-4"><label className="block text-sm">기록 공개 범위<select value={visibility} onChange={e=>setVisibility(e.target.value)} className={field}><option value="note">내부 메모 · 직원만</option><option value="reply">고객 공개 회신 · 마이페이지</option></select></label><label className="block text-sm">검토·회신 내용<textarea required maxLength={5000} rows={4} value={note} onChange={e=>setNote(e.target.value)} className={field}/></label><p className="text-xs text-stone-400">공개 회신은 로그인 접수 고객의 마이페이지에 표시됩니다. 비회원은 담당자가 별도 연락 후 기록해 주세요.</p><button disabled={busy} className="rounded border border-green-600 bg-green-900 px-4 py-2 text-sm disabled:opacity-40">기록 저장</button></form>
      {data.inquiry.kind==='export_rfq'&&<><QuoteEditor key={data.quotes[0]?.id||'first'} inquiry={data.inquiry} latest={data.quotes[0]} busy={busy} save={save}/><QuoteHistory quotes={data.quotes}/><PiPanel inquiry={data.inquiry} latest={data.quotes[0]} changed={()=>{void load().catch(e=>setError(e.message));changed();}}/></>}
      <section><h3 className="text-lg font-bold">활동 이력</h3><Link className="mt-2 inline-block text-sm underline" href={'/admin/history/inquiry/'+id}>전체 문의·PI 이력</Link><ul className="mt-4 space-y-3">{data.activities.map(a=><li key={a.id} className="rounded border border-stone-800 p-3 text-sm"><p className="text-xs text-stone-400">{a.visibility==='internal'?'직원 전용':'고객 공개'} · {a.event} · {new Date(a.created_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} KST</p><p className="mt-2 whitespace-pre-wrap">{a.message}</p>{a.event==='assign'&&<p className="mt-2 text-xs text-stone-400">담당자: {staff.find(s=>s.id===a.details.from)?.name||'미배정/이전 직원'} → {staff.find(s=>s.id===a.details.to)?.name||'미배정/이전 직원'}</p>}</li>)}</ul><p className="mt-3 text-xs text-stone-400">최근 활동 최대 200건을 표시합니다.</p></section>
      <details className="rounded-xl border border-stone-800 p-4"><summary className="cursor-pointer text-sm font-bold">고객 이메일·내부 테스트 알림 ({data.notifications.length})</summary><p className="mt-3 text-xs text-stone-400">상태·공개 회신의 알림 대기/실패/전달을 기록합니다. 내부 테스트와 실제 고객 이메일을 구분합니다. 실제 발송은 수신자 미리보기와 확인이 필요합니다.</p><ul className="mt-4 space-y-3">{data.notifications.map(n=><li key={n.id} className="rounded bg-stone-900 p-3 text-xs"><p className="break-all">{n.id}</p><p className="mt-2">{n.status} · 시도 {n.attempts}회 {n.last_error}</p><EmailNotification id={n.id}/><div className="mt-3 flex flex-wrap gap-2"><button disabled={busy||n.status==='delivered'} onClick={()=>void deliver(n.id,false)} className="rounded border px-3 py-2 disabled:opacity-40">{n.status==='failed'?'테스트 전달 재시도':'테스트 전달'}</button><button disabled={busy||n.status==='delivered'} onClick={()=>void deliver(n.id,true)} className="rounded border px-3 py-2 disabled:opacity-40">실패 상황 점검</button></div>{data.attempts.filter(a=>a.notification_id===n.id).map(a=><p key={a.id} className="mt-2 text-stone-400">{a.attempt}회 · {a.result} · {a.message}</p>)}</li>)}</ul></details>
    </>}
  </section>;
}
