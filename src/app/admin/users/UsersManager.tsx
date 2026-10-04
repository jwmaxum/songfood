'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import type {StaffRecord,StaffSnapshot} from '@/lib/staff-management';
import type {StaffRole} from '@/lib/admin-auth';
const labels:Record<StaffRole,string>={admin:'하위 관리자 · 전체 업무',product_staff:'상품·가격·콘텐츠 담당',inquiry_staff:'문의·견적 담당',order_staff:'국내 주문 담당'};
const roles=Object.entries(labels);
const field='mt-2 w-full rounded border border-stone-600 bg-stone-900 p-3 text-white';
function StaffCard({staff,protectedAccount,busy,save}:{staff:StaffRecord;protectedAccount:boolean;busy:boolean;save:(method:string,body:Record<string,unknown>)=>Promise<boolean>}){
 const [name,setName]=useState(staff.name),[role,setRole]=useState(staff.role),[status,setStatus]=useState(staff.status),[reason,setReason]=useState(''),[confirmed,setConfirmed]=useState(false);
 if(protectedAccount)return <article className="rounded-xl border border-amber-600 p-5"><h2 className="font-bold">{staff.name} · 최고관리자</h2><p className="mt-2 break-all">{staff.email}</p><p className="mt-3 text-sm text-stone-300">보호된 계정입니다. 권한 변경·정지·삭제를 할 수 없습니다.</p></article>;
 return <article className="rounded-xl border border-stone-700 p-5"><h2 className="break-all font-bold">{staff.email}</h2><p className="mt-2 text-sm text-stone-300">버전 {staff.revision} · {staff.verified&&staff.auth_active?'이메일 인증 완료':'계정 인증·접근 확인 필요'}</p>
 <form onSubmit={e=>{e.preventDefault();void save('PATCH',{id:staff.id,revision:staff.revision,name,role,status,reason});}} className="mt-4 space-y-4"><fieldset disabled={busy} className="space-y-4">
 <label className="block">직원 이름<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)} className={field}/></label>
 <label className="block">업무 권한<select aria-label="업무 권한" value={role} onChange={e=>setRole(e.target.value as StaffRole)} className={field}>{roles.map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
 <label className="block">직원 상태<select aria-label="직원 상태" value={status} onChange={e=>setStatus(e.target.value as StaffRecord['status'])} className={field}><option value="active">활성</option><option value="suspended">정지</option></select></label>
 <label className="block">수정·삭제 사유 *<textarea required minLength={3} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} className={field}/></label>
 <button className="min-h-11 rounded bg-amber-200 px-4 py-3 font-bold text-stone-950">직원 정보 저장</button>
 <div className="border-t border-stone-700 pt-4"><label className="flex min-h-11 items-start gap-3"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} className="mt-1"/>이 직원의 관리자 권한을 삭제합니다.</label>
 <p className="mt-2 text-sm leading-6 text-stone-300">직원 목록과 담당자 선택에서 제외하고 직원 세션을 종료합니다. 회원 계정과 과거 거래·감사 기록은 보존합니다.</p>
 <button type="button" disabled={!confirmed||reason.trim().length<3||busy} onClick={()=>void save('DELETE',{id:staff.id,revision:staff.revision,confirmed:true,reason})} className="mt-3 min-h-11 rounded border border-red-400 px-4 py-3 text-red-200 disabled:opacity-60">하위관리자 삭제</button></div>
 </fieldset></form></article>;
}
export default function UsersManager(){
 const [data,setData]=useState<StaffSnapshot|null>(null),[error,setError]=useState(''),[saved,setSaved]=useState(''),[busy,setBusy]=useState(false),[query,setQuery]=useState('');
 const [email,setEmail]=useState(''),[name,setName]=useState(''),[role,setRole]=useState<StaffRole>('product_staff'),[reason,setReason]=useState('');
 const alert=useRef<HTMLParagraphElement>(null);
 async function load(){const r=await fetch('/api/admin/users',{cache:'no-store'}),d=await r.json();if(!r.ok)throw new Error(d.error||'직원 목록을 불러오지 못했습니다.');setData(d);}
 useEffect(()=>{const c=new AbortController();fetch('/api/admin/users',{cache:'no-store',signal:c.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error();setData(d);}).catch(()=>{if(!c.signal.aborted)setError('직원 목록을 불러오지 못했습니다.');});return()=>c.abort();},[]);
 useEffect(()=>{if(error)alert.current?.focus();},[error]);
 async function save(method:string,body:Record<string,unknown>){if(busy)return false;setBusy(true);setError('');setSaved('');
 try{const r=await fetch('/api/admin/users',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),d=await r.json();if(!r.ok)throw new Error(d.error||'직원 정보를 저장하지 못했습니다.');
 setSaved(method==='DELETE'?'직원 권한을 삭제했습니다. 운영 담당자로 지정되어 있었다면 해당 지정도 해제했습니다.':'직원 정보를 저장했습니다. 변경된 직원은 다시 로그인해야 합니다.');await load();return true;}
 catch(e){setError(e instanceof Error?e.message:'직원 정보를 저장하지 못했습니다.');return false;}finally{setBusy(false);}}
 const visible=(data?.data||[]).filter(s=>(s.name+' '+s.email).toLowerCase().includes(query.toLowerCase()));
 return <main className="min-w-0 space-y-6 p-5 text-stone-100 sm:p-8"><h1 className="text-3xl font-bold">하위관리자·권한</h1>
 <p className="leading-7 text-stone-300">최고관리자 jwmaxum@gmail.com이 직원 등록·업무 권한·정지·삭제를 관리합니다. 하위 관리자는 전체 업무 권한이 있어도 직원 권한을 변경할 수 없습니다.</p>
 {error&&<p role="alert" tabIndex={-1} ref={alert} className="rounded border border-red-400 p-4 text-red-200">{error}</p>}{saved&&<p role="status" className="text-green-200">{saved}</p>}
 <section className="rounded-xl border border-stone-700 p-5"><h2 className="text-xl font-bold">하위관리자 등록</h2><p className="mt-3 text-sm leading-7 text-stone-300">등록할 직원은 <Link href="/account?lang=ko" className="underline">회원가입</Link> 후 이메일 인증을 완료해야 합니다. 인증한 이메일을 아래에 등록하면 관리자 로그인과 해당 업무 메뉴를 이용할 수 있습니다. 사업자번호·가입 승인은 필요하지 않습니다.</p>
 <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();void save('POST',{email,name,role,reason}).then(ok=>{if(ok){setEmail('');setName('');setReason('');}});}}>
 <label>등록 이메일 *<input required type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} className={field}/></label>
 <label>등록 이름 *<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)} className={field}/></label>
 <label>등록 업무 권한<select aria-label="등록 업무 권한" value={role} onChange={e=>setRole(e.target.value as StaffRole)} className={field}>{roles.map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
 <label>등록 사유 *<input required minLength={3} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} className={field}/></label>
 <button disabled={busy} className="min-h-11 rounded bg-amber-200 px-4 py-3 font-bold text-stone-950">직원 등록</button></form></section>
 <section><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">등록 직원 {data?.data.length??0}명</h2><Link href="/admin/launch" className="underline">운영 담당자 지정</Link></div>
 <label className="mt-4 block">직원 검색<input value={query} onChange={e=>setQuery(e.target.value)} className={field}/></label>
 <button disabled={busy} onClick={()=>{setError('');void load().catch(()=>setError('직원 목록을 불러오지 못했습니다.'));}} className="mt-3 min-h-11 rounded border border-stone-500 px-4">최신 목록 불러오기</button>
 <div className="mt-4 grid gap-4 xl:grid-cols-2">{visible.map(s=><StaffCard key={s.id+':'+s.revision} staff={s} protectedAccount={s.id===data?.super_admin_id} busy={busy} save={save}/>)}</div>{data&&!visible.length&&<p className="mt-4">검색 결과가 없습니다.</p>}{!data&&!error&&<p role="status" className="mt-4">직원 목록 확인 중…</p>}</section>
 <section className="rounded-xl border border-stone-700 p-5"><h2 className="text-xl font-bold">최근 권한 변경·삭제 이력</h2><ul className="mt-4 space-y-4">{data?.events.map(e=><li key={e.id} className="break-words border-b border-stone-700 pb-3 text-sm leading-6">{e.created_at} · {e.after_state.name as string} · {({register:'등록',update:'수정',remove:'삭제'} as Record<string,string>)[e.event]||e.event}<br/>{e.reason} · {String(e.before_state?.role||'미등록')} → {String(e.after_state.role)}</li>)}</ul>{data&&!data.events.length&&<p className="mt-3">기록된 변경 이력이 없습니다.</p>}</section></main>;
}
