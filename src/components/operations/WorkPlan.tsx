'use client';
import {useRef,useState} from 'react';
import type {OpsData,WorkRow} from '@/lib/operations/types';
import {kst} from '@/lib/operations/types';
export default function WorkPlan({row,staff,changed}:{row:WorkRow;staff:NonNullable<OpsData['staff']>;changed:()=>Promise<void>}){
 const [assigned,setAssigned]=useState(row.assigned_to||''),[due,setDue]=useState(row.due_at?new Date(Date.parse(row.due_at)+9*3600000).toISOString().slice(0,16):''),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const retry=useRef<{payload:string;key:string}|null>(null);
 async function submit(e:React.FormEvent){e.preventDefault();if(busy)return;setBusy(true);setMessage('');
 const payload={kind:row.kind,id:row.id,assigned_to:assigned||null,due_at:due?new Date(due+':00+09:00').toISOString():null,message:note};
 const signature=JSON.stringify(payload);if(retry.current?.payload!==signature)retry.current={payload:signature,key:crypto.randomUUID()};
 try{const r=await fetch('/api/admin/operations/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,revision:row.revision,request_key:retry.current!.key})}),b=await r.json();if(!r.ok)throw new Error(b.error);
 retry.current=null;setMessage('저장했습니다.');await changed();
 }catch(e){setMessage(e instanceof Error?e.message:'저장 실패');}finally{setBusy(false);}}
 const allowed=staff.filter(s=>s.role==='admin'||s.role===(row.kind==='order'?'order_staff':'inquiry_staff'));
 return <form onSubmit={submit} className="mt-3 space-y-3 rounded border bg-stone-50 p-4 text-sm text-stone-900">
 <p>내부 담당자·마감일 · 버전 {row.revision}</p><div className="grid gap-3 sm:grid-cols-2">
 <label>담당자<select value={assigned} onChange={e=>setAssigned(e.target.value)} className="mt-1 block w-full rounded border bg-white p-2"><option value="">미배정</option>{assigned&&!allowed.some(s=>s.id===assigned)&&<option value={assigned}>기존 담당자 (현재 배정 불가)</option>}{allowed.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
 <label>마감일시 (한국 시간)<input type="datetime-local" value={due} onChange={e=>setDue(e.target.value)} className="mt-1 block w-full rounded border bg-white p-2"/></label></div>
 <label className="block">인수인계 · 다음 행동<textarea required minLength={3} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} rows={2} className="mt-1 block w-full rounded border bg-white p-2" placeholder="예: 포장 입수를 공급사에 확인한 뒤 최신 견적 작성"/></label>
 <p className="text-xs text-stone-600">미지정은 빈칸으로 저장합니다. 고객에게 공개되지 않으며 변경 이력은 보존됩니다.{row.due_at?' 현재 기한: '+kst(row.due_at)+' KST':''}</p>
 <button disabled={busy} className="rounded bg-green-900 px-4 py-2 text-white disabled:opacity-40">담당자·기한 저장</button>{message&&<p role="status">{message}</p>}
 </form>;
}
