'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {CrmInquiry,QuoteDraft} from '@/lib/crm/types';
import {piState,type Issuer,type PiPanelData,type PiSnapshot} from '@/lib/pi/types';
import PiPreview from '@/components/pi/PiPreview';
const empty:Issuer={name:'',address:'',email:'',phone:'',payment_terms:'',bank_details:''};
const field='mt-1 w-full rounded border border-stone-600 bg-stone-950 p-2 text-sm text-white';
export default function PiPanel({inquiry,latest,changed}:{inquiry:CrmInquiry;latest?:QuoteDraft;changed:()=>void}){
 const [data,setData]=useState<PiPanelData|null>(null),[seller,setSeller]=useState<Issuer>(empty),[address,setAddress]=useState(''),[until,setUntil]=useState(''),[reason,setReason]=useState(''),[fob,setFob]=useState(false),[preview,setPreview]=useState<PiSnapshot|null>(null),[previewSource,setPreviewSource]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const retry=useRef<{payload:string;key:string}|null>(null),initialized=useRef(false);
 const url='/api/admin/crm/'+inquiry.id+'/pi';
 const load=useCallback(async()=>{const r=await fetch(url,{cache:'no-store'}),b=await r.json();if(!r.ok)throw new Error(b.error);setData(b);if(!initialized.current){initialized.current=true;if(b.settings)setSeller(b.settings.data);}},[url]);
 useEffect(()=>{let active=true;fetch(url,{cache:'no-store'}).then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.error);if(active){setData(b);if(!initialized.current){initialized.current=true;if(b.settings)setSeller(b.settings.data);}}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[url]);
 const head=data?.documents.find(d=>d.status==='issued'),pending=data?.documents.find(d=>d.status==='preparing');
 const source=JSON.stringify([inquiry.id,latest?.id,inquiry.revision,head?.id||null]);
 const reviewed=preview&&previewSource===source;
 function invalidate(){setPreview(null);setMessage('');}
 function issueBody(){return {quote_id:latest?.id,base_id:head?.id||null,revision:inquiry.revision,input:{seller,buyer_address:address,valid_until:until?new Date(until).toISOString():'',change_reason:reason,fob_confirmed:fob}};}
 async function send(action:string,extra:Record<string,unknown>={}){
  if(busy)return;
  if(action==='issue'&&!reviewed){setError('견적이 변경되었습니다. 최신 조건으로 미리보기를 다시 확인하세요.');return;}
  setBusy(true);setError('');setMessage('');
  try{
   const payload=JSON.stringify({action,...extra});if(retry.current?.payload!==payload)retry.current={payload,key:crypto.randomUUID()};
   const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...JSON.parse(payload),request_key:retry.current!.key})}),b=await r.json();
   if(!r.ok)throw new Error([b.error,...Object.values(b.fields||{})].join(' '));
   if(action==='preview'){setPreview(b.snapshot);setPreviewSource(source);return;}
   retry.current=null;setPreview(null);setMessage(action==='issue'||action==='resume'?'PI 발행을 완료했습니다. PDF를 확인하세요. 고객 이메일은 자동 발송되지 않습니다.':'변경을 저장했습니다.');
   try{await load();changed();}catch{setError('저장은 완료되었습니다. 새로고침이 필요합니다.');}
  }catch(e){setError(e instanceof Error?e.message:'처리 실패');try{await load();changed();}catch{}}
  finally{setBusy(false);}
 }
 return <section className="min-w-0 space-y-4 rounded-xl border border-green-800 p-4"><h3 className="text-xl font-bold">Proforma Invoice 발행·이력</h3>
 <p className="text-xs text-stone-400">관리자가 검토를 완료한 FOB 초안을 발행합니다. 문의 담당 직원은 문서·이력을 열람할 수 있습니다.</p>
 {error&&<p role="alert" className="text-sm text-red-300">{error}</p>}{message&&<p role="status" className="text-sm text-green-300">{message}</p>}
 <button disabled={busy} onClick={()=>void load().catch(e=>setError(e.message))} className="text-sm underline">PI 새로고침</button>
 {!data?<p className="text-sm">PI 정보를 불러오는 중…</p>:<>
 {data.is_admin&&<><details className="rounded border border-stone-700 p-4"><summary className="cursor-pointer font-bold">판매자·결제·송금 기본정보</summary><p className="mt-3 text-xs text-stone-400">실제 확정된 정보만 입력하세요. 변경해도 발행된 PI는 바뀌지 않습니다.</p><div className="mt-4 space-y-3">{Object.entries({name:'판매자 법인명',address:'판매자 주소',email:'판매자 이메일',phone:'판매자 연락처',payment_terms:'결제조건',bank_details:'은행·예금주·계좌·SWIFT 등 송금정보'}).map(([key,label])=><label key={key} className="block text-sm">{label}<textarea rows={key==='bank_details'?4:2} maxLength={key==='payment_terms'||key==='bank_details'?1200:key==='address'?600:key==='name'?200:key==='email'?254:80} value={seller[key as keyof Issuer]} onChange={e=>{setSeller({...seller,[key]:e.target.value});invalidate();}} className={field}/></label>)}</div><button disabled={busy} onClick={()=>void send('settings',{seller,settings_revision:data.settings?.revision||0})} className="mt-4 rounded border px-4 py-2 text-sm">기본정보 저장</button></details>
 {pending?<div className="space-y-3 rounded border border-amber-700 p-4"><p className="text-sm">{pending.number} · v{pending.version} 발행 준비가 남아 있습니다. 같은 문서의 PDF 저장을 재시도할 수 있습니다.</p><button disabled={busy} onClick={()=>void send('resume',{document_id:pending.id})} className="mr-3 rounded bg-amber-400 px-4 py-2 text-stone-950">발행 재시도</button><button disabled={busy} onClick={()=>void send('cancel',{document_id:pending.id})} className="rounded border px-4 py-2">미발행 준비 취소</button></div>:<form onSubmit={e=>{e.preventDefault();void send('preview',issueBody());}} className="space-y-4">
 {!latest&&<p className="text-sm text-amber-300">먼저 검토를 마친 견적 초안을 저장하세요.</p>}
 {!!latest?.snapshot.issues.length&&<p className="text-sm text-amber-300">최신 초안에 검토 미완료 항목이 있습니다. 가격·환율·공급 조건을 보완해야 발행할 수 있습니다.</p>}
 <label className="block text-sm">구매자 청구·거래 주소 *<textarea required maxLength={600} rows={3} value={address} onChange={e=>{setAddress(e.target.value);invalidate();}} className={field}/></label>
 <label className="block text-sm">PI 유효기간 (이 PC의 현지 시각) *<input type="datetime-local" required value={until} onChange={e=>{setUntil(e.target.value);invalidate();}} className={field}/></label>
 <p className="text-xs text-stone-400">가격·환율 만료 이전으로 지정하세요. 선택한 시간대는 PDF에 UTC로 고정됩니다.</p>
 <label className="block text-sm">발행·수정 사유 *<input required minLength={3} maxLength={1000} value={reason} onChange={e=>{setReason(e.target.value);invalidate();}} className={field}/></label>
 <label className="flex items-start gap-2 text-sm"><input type="checkbox" required checked={fob} onChange={e=>{setFob(e.target.checked);invalidate();}}/>국내 운송·수출통관·본선 적재 비용이 VAT 제외 도매가에 포함됨을 검토했습니다.</label>
 <button disabled={busy||!latest||!!latest.snapshot.issues.length} className="rounded border border-green-500 px-4 py-3 text-sm disabled:opacity-40">발행 전 고객용 미리보기</button>
 {reviewed&&<div className="space-y-4 rounded border border-green-700 p-4"><PiPreview snapshot={preview}/><p className="text-xs text-amber-300">미리보기 검토 후 발행하면 문서 번호와 PDF가 보존됩니다.</p><button type="button" disabled={busy} onClick={()=>void send('issue',{...issueBody(),confirmed:true})} className="rounded bg-green-700 px-4 py-3 font-bold">확인한 PI 발행</button></div>}
 </form>}</>}
 <ul className="space-y-3">{data.documents.map(d=><li key={d.id} className="rounded border border-stone-700 p-3"><details><summary className="cursor-pointer text-sm font-bold">{d.number} · v{d.version} · {piState(d)}</summary><div className="mt-4 space-y-4"><PiPreview snapshot={d.snapshot}/>{d.pdf_path&&<a href={'/api/admin/pi/'+d.id+'/pdf'} className="inline-block rounded border px-4 py-2 text-sm">보관 PDF 다운로드</a>}<p className="break-all text-xs text-stone-500">SHA-256: {d.pdf_sha256||'발행 준비 중'}</p>{d.accepted_at&&<p className="text-sm">고객 수락: {d.accepted_at}</p>}{d.change_requested_at&&<p className="text-sm">수정 요청: {d.change_requested_at}</p>}</div></details></li>)}</ul>
 {!!data.events.length&&<details><summary className="cursor-pointer text-sm">PI 발행·열람·수정·수락 이력</summary><ul className="mt-3 space-y-2">{data.events.map(e=><li key={e.id} className="rounded bg-stone-900 p-3 text-xs">{e.created_at} · {e.event}<p className="mt-2 whitespace-pre-wrap">{e.message}</p></li>)}</ul></details>}
 </>}
 </section>;
}
