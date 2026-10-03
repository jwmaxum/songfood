'use client';
import {useEffect,useRef,useState} from 'react';
import {businessFields,businessGaps,type BusinessField,type BusinessSettings} from '@/lib/business-settings';
export default function BusinessSettingsEditor(){
 const [settings,setSettings]=useState<BusinessSettings|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(''),[reason,setReason]=useState('');
 const alert=useRef<HTMLParagraphElement>(null);
 async function load(){
  setBusy(true);setError('');setSaved('');
  try{const r=await fetch('/api/admin/business-settings',{cache:'no-store'}),d=await r.json();if(!r.ok)throw new Error(d.error);setSettings(d.settings);}
  catch(e){setError(e instanceof Error?e.message:'설정을 불러오지 못했습니다.');}finally{setBusy(false);}
 }
 useEffect(()=>{let live=true;fetch('/api/admin/business-settings',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);if(live)setSettings(d.settings);}).catch(()=>{if(live)setError('설정을 불러오지 못했습니다. 다시 시도해 주세요.');});return()=>{live=false;};},[]);
 useEffect(()=>{if(error)alert.current?.focus();},[error]);
 async function save(e:React.FormEvent){e.preventDefault();if(busy||!settings)return;setBusy(true);setError('');setSaved('');
  try{const r=await fetch('/api/admin/business-settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...settings,reason})}),d=await r.json();
   if(!r.ok)throw new Error(d.error);setSettings(d.settings);setReason('');setSaved('저장했습니다. 회사 소개·하단 연락처·이용 안내에 반영됩니다.');}
  catch(e){setError(e instanceof Error?e.message:'저장하지 못했습니다.');}finally{setBusy(false);}
 }
 return <section className="rounded-xl border bg-white p-5"><h2 className="text-xl font-bold">회사·사업자 공개 정보</h2><p className="mt-3 text-sm leading-7">저장 즉시 고객에게 공개됩니다. 사업자등록증 등 실제 근거를 확인해 입력하세요. 비밀번호·API 키·입금계좌는 입력하지 마세요. 이 설정은 기존 PI 판매자 스냅샷을 바꾸지 않습니다.</p>
 {error&&<p ref={alert} tabIndex={-1} role="alert" className="mt-4 rounded border border-red-400 p-3 text-red-800">{error}</p>}{saved&&<p role="status" className="mt-4 text-green-800">{saved}</p>}
 <button onClick={()=>void load()} disabled={busy} className="my-4 min-h-11 rounded border px-4">저장된 정보 다시 불러오기</button>
 {settings?<form onSubmit={save} className="space-y-5"><p className="text-sm">미등록 항목 {businessGaps(settings.profile).length}개 · 한영 배송·반품·개인정보 세부사항까지 확인해야 공개 운영 검수를 완료할 수 있습니다.</p><div className="grid gap-4 md:grid-cols-2">
 {(Object.keys(businessFields) as BusinessField[]).map(key=>{const [label,,max]=businessFields[key],props={id:'business-'+key,value:settings.profile[key],maxLength:max,required:['name','phone','email','export_phone'].includes(key),onChange:(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>setSettings({...settings,profile:{...settings.profile,[key]:e.target.value}}),className:'mt-2 w-full min-w-0 rounded border border-stone-400 p-3'};
 return <label key={key} htmlFor={props.id} className={max>1000?'md:col-span-2':''}>{label}{props.required?' *':''}{max>500?<textarea {...props} rows={5}/>:<input {...props} type={key==='email'?'email':'text'}/>}</label>;})}</div>
 <label className="block">변경 사유 *<input required minLength={3} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} className="mt-2 w-full rounded border p-3"/></label>
 <button disabled={busy} className="min-h-11 rounded bg-green-900 px-5 py-3 text-white">{busy?'저장 중…':'공개 정보 저장'}</button></form>:!error&&<p role="status">설정 확인 중…</p>}</section>;
}
