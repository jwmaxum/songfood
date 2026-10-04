'use client';
import {useEffect,useRef,useState} from 'react';
import type {Issuer} from '@/lib/pi/types';
import type {PiSettings} from '@/lib/pi/settings';
const empty:Issuer={name:'',address:'',email:'',phone:'',payment_terms:'',bank_details:''};
const fields:{key:keyof Issuer;label:string;max:number}[]=[
 {key:'name',label:'PI 판매자 법적 명칭',max:200},{key:'address',label:'PI 판매자 주소',max:600},
 {key:'email',label:'PI 판매자 이메일',max:254},{key:'phone',label:'PI 판매자 연락처',max:80},
 {key:'payment_terms',label:'PI 결제 조건',max:1200},{key:'bank_details',label:'PI 은행·예금주·계좌·SWIFT 등 송금정보',max:1200},
];
export default function PiSettingsEditor(){
 const [settings,setSettings]=useState<PiSettings|null>(null),[seller,setSeller]=useState<Issuer>(empty),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[conflict,setConflict]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const alert=useRef<HTMLParagraphElement>(null);
 function apply(s:PiSettings|null){setSettings(s);setSeller(s?.data||{...empty});setLoaded(true);setConflict(false);}
 useEffect(()=>{const c=new AbortController();fetch('/api/admin/pi/settings',{cache:'no-store',signal:c.signal}).then(async r=>{const b=await r.json();if(!r.ok)throw Error(b.error);if(!c.signal.aborted)apply(b.settings);}).catch(e=>{if(!c.signal.aborted)setError(e instanceof Error?e.message:'판매자 설정 조회 실패');});return()=>c.abort();},[]);
 useEffect(()=>{if(error)alert.current?.focus();},[error]);
 async function reload(){setBusy(true);setError('');setMessage('');try{const r=await fetch('/api/admin/pi/settings',{cache:'no-store'}),b=await r.json();if(!r.ok)throw Error(b.error);apply(b.settings);}catch{setLoaded(false);setError('판매자 설정을 불러오지 못했습니다. 다시 불러온 뒤 저장해 주세요.');}finally{setBusy(false);}}
 async function save(e:React.FormEvent){e.preventDefault();if(!loaded||busy||conflict)return;setBusy(true);setError('');setMessage('');
 try{const r=await fetch('/api/admin/pi/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:settings?.revision||0,seller})}),b=await r.json();
 if(!r.ok){if(r.status===409)setConflict(true);throw Error([b.error,...Object.values(b.fields||{})].join(' '));}
 apply(b.settings);setMessage('PI 판매자 기본정보를 저장했습니다. 이미 발행된 문서는 바뀌지 않습니다.');
 }catch(e){setError(e instanceof Error?e.message:'판매자 설정 저장 실패');}finally{setBusy(false);}}
 return <section id="pi-issuer" className="scroll-mt-5 rounded-xl border bg-white p-5"><h2 className="text-xl font-bold">PI 판매자·결제 기본정보</h2>
 <p className="mt-3 text-sm leading-7">RFQ 접수 전에 등록할 수 있습니다. 실제 확정된 영문 판매자·결제·송금 정보를 입력하세요. 회사 공개 정보와 국내 입금 계좌는 각 설정에서 관리합니다. 새 PI의 기본값으로 사용하며 발행된 PI는 변경하지 않습니다.</p>
 {error&&<p ref={alert} role="alert" tabIndex={-1} className="mt-4 rounded border border-red-500 p-3 text-red-800">{error}{conflict&&' 입력은 보존했습니다. 저장된 정보를 다시 불러와 변경 내용을 확인해 주세요.'}</p>}
 {message&&<p role="status" className="mt-4 text-green-900">{message}</p>}
 <button disabled={busy} onClick={()=>void reload()} className="my-4 min-h-11 rounded border px-4">저장된 PI 정보 다시 불러오기</button>
 {loaded?<form onSubmit={save} className="space-y-5"><p className="text-sm">저장 버전 {settings?.revision||0} · {settings?'등록됨':'미등록'}</p><fieldset disabled={busy} className="grid gap-4 md:grid-cols-2">{fields.map(({key,label,max})=><label key={key} htmlFor={'issuer-'+key} className={max>500?'md:col-span-2':''}>{label} *{max>500?<textarea id={'issuer-'+key} required rows={4} maxLength={max} value={seller[key]} onChange={e=>setSeller({...seller,[key]:e.target.value})} className="mt-2 w-full min-w-0 rounded border border-stone-400 p-3"/>:<input id={'issuer-'+key} type={key==='email'?'email':'text'} required maxLength={max} value={seller[key]} onChange={e=>setSeller({...seller,[key]:e.target.value})} className="mt-2 w-full min-w-0 rounded border border-stone-400 p-3"/>}</label>)}</fieldset>
 <button disabled={busy||conflict} className="min-h-11 rounded bg-green-900 px-5 py-3 text-white disabled:opacity-50">{busy?'저장 중…':'PI 기본정보 저장'}</button></form>:!error&&<p role="status">판매자 설정 확인 중…</p>}
 </section>;
}
