'use client';
import {useEffect,useRef,useState} from 'react';
import {piState,type PublicPi} from '@/lib/pi/types';
import {useAuth} from '@/context/AuthContext';
import PiPreview from './PiPreview';
export default function CustomerPi(){const {user}=useAuth();return user?<CustomerPiContent key={user.id}/>:null;}
function CustomerPiContent(){
 const [documents,setDocuments]=useState<PublicPi[]>([]),[selected,setSelected]=useState<PublicPi|null>(null),[error,setError]=useState(''),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[confirmed,setConfirmed]=useState(false),[note,setNote]=useState(''),[message,setMessage]=useState('');
 const retry=useRef<{payload:string;key:string}|null>(null);
 async function load(){const r=await fetch('/api/account/pi',{cache:'no-store'}),b=await r.json();if(!r.ok)throw new Error(b.error);setDocuments(b.documents);setLoaded(true);}
 useEffect(()=>{let active=true;fetch('/api/account/pi',{cache:'no-store'}).then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.error);if(active){setDocuments(b.documents);setLoaded(true);}}).catch(e=>{if(active){setError(e.message);setLoaded(true);}});return()=>{active=false;};},[]);
 async function open(d:PublicPi){setBusy(true);setError('');setMessage('');setConfirmed(false);setNote('');try{const r=await fetch('/api/account/pi/'+d.id,{cache:'no-store'}),b=await r.json();if(!r.ok)throw new Error(b.error);setSelected(b.document);}catch(e){setError(e instanceof Error?e.message:'조회 실패');}finally{setBusy(false);}}
 async function act(action:string){if(!selected||busy)return;setBusy(true);setError('');setMessage('');
 const payload=JSON.stringify({id:selected.id,action,message:action==='request_changes'?note:'',confirmed});
 if(retry.current?.payload!==payload)retry.current={payload,key:crypto.randomUUID()};
 try{const r=await fetch('/api/account/pi/'+selected.id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...JSON.parse(payload),request_key:retry.current!.key})}),b=await r.json();if(!r.ok)throw new Error(b.error);setSelected(b.document);retry.current=null;setNote('');setConfirmed(false);setMessage(action==='accept'?'PI 조건 수락을 기록했습니다. / Acceptance recorded.':'수정 요청을 기록했습니다. / Revision requested.');try{await load();}catch{setError('저장은 완료되었습니다. 목록 새로고침이 필요합니다.');}}catch(e){setError(e instanceof Error?e.message:'저장 실패');}finally{setBusy(false);}}
 const state=selected?piState(selected):'',isLatest=selected&&!documents.some(d=>d.inquiry_id===selected.inquiry_id&&d.status==='issued'&&d.version>selected.version);
 return <section id="proforma" className="min-w-0 space-y-4 rounded-xl border border-stone-200 bg-white p-5"><h2 className="text-xl font-bold">Proforma Invoice / 견적송장</h2>
 <p className="text-sm text-stone-600">발행된 문서의 조건·유효기간을 확인하고 PDF 다운로드, 수정 요청 또는 수락을 진행하세요. / Review issued terms before acceptance.</p>
 {error&&<p role="alert" className="text-sm text-red-800">{error}</p>}{message&&<p role="status" className="text-sm text-green-800">{message}</p>}
 <button onClick={()=>{setError('');void load().catch(e=>setError(e.message));}} className="text-sm underline">목록 새로고침 / Refresh</button>
 {!loaded?<p>불러오는 중… / Loading…</p>:!documents.length?<p className="text-sm">발행된 PI가 없습니다. RFQ 접수번호는 PI가 아닙니다. / No issued PI yet.</p>:<ul className="space-y-2">{documents.map(d=><li key={d.id}><button disabled={busy} onClick={()=>void open(d)} className="w-full rounded border p-3 text-left text-sm">{d.number} · v{d.version} · {piState(d)}</button></li>)}</ul>}
 {selected&&<div className="min-w-0 space-y-5 border-t pt-5"><h3 className="font-bold">{selected.number} · v{selected.version} · {state}</h3><PiPreview snapshot={selected.snapshot}/>
 <a href={'/api/account/pi/'+selected.id+'/pdf'} className="inline-block rounded bg-green-900 px-4 py-3 text-sm font-bold text-white">PDF 다운로드 / Download PDF</a>
 <p className="break-all text-xs text-stone-500">SHA-256: {selected.pdf_sha256}</p>
 {isLatest&&state==='issued'&&<div className="space-y-3 rounded border border-green-200 p-4"><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>금액·FOB·납기·결제조건을 확인하고 이 PI 조건을 수락합니다. / I accept these PI terms.</label><button disabled={busy||!confirmed} onClick={()=>void act('accept')} className="rounded bg-green-900 px-4 py-2 text-white disabled:opacity-40">조건 수락 / Accept terms</button></div>}
 {isLatest&&selected.status==='issued'&&<form onSubmit={e=>{e.preventDefault();void act('request_changes');}} className="space-y-3"><label className="block text-sm">수정 요청 / Request changes<textarea required minLength={10} maxLength={2000} rows={3} value={note} onChange={e=>setNote(e.target.value)} className="mt-2 w-full rounded border p-3"/></label><button disabled={busy} className="rounded border px-4 py-2 text-sm">수정 요청 제출 / Submit revision request</button><p className="text-xs text-stone-500">이미 수락한 조건은 이 요청만으로 취소되지 않습니다. / A revision request does not cancel accepted terms.</p></form>}
 {(!isLatest||['expired','superseded','changes_requested'].includes(state))&&<p className="text-sm text-amber-900">현재 문서는 수락할 수 없습니다. 최신 수정 PI를 확인해 주세요. / Review the current valid revision.</p>}
 </div>}</section>;
}
