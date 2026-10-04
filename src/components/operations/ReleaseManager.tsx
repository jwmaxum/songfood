'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import type {ReleaseStatus,ReleaseRow} from '@/lib/launch/releases';
export default function ReleaseManager(){
 const [data,setData]=useState<ReleaseStatus|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[query,setQuery]=useState(''),[selected,setSelected]=useState<ReleaseRow|null>(null),[reason,setReason]=useState(''),[domestic,setDomestic]=useState(false),[exported,setExported]=useState(false),[policyReason,setPolicyReason]=useState('');
 useEffect(()=>{let active=true;fetch('/api/admin/releases',{cache:'no-store'}).then(async r=>{const b=await r.json();if(!r.ok)throw Error(b.error);if(active)setData(b);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
 async function save(body:Record<string,unknown>){setBusy(true);setError('');try{const r=await fetch('/api/admin/releases',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),b=await r.json();if(!r.ok)throw Error(b.error);
 const latest=await fetch('/api/admin/releases',{cache:'no-store'}),s=await latest.json();if(!latest.ok)throw Error(s.error);setData(s);setSelected(null);
 }catch(e){setError(e instanceof Error?e.message:'검수 저장 실패');}finally{setBusy(false);}}
 return <div className="mt-6 space-y-5">
 <p>국내·해외 출시 상품을 실제 자료와 승인 가격으로 검수합니다. 정보 또는 적용 가격 버전이 바뀌면 재검수가 필요합니다. RFQ와 상품 안내는 계속 이용할 수 있습니다.</p>
 {error&&<p role="alert" className="rounded bg-red-100 p-3">{error}</p>}
 {data&&<><p role="status">승인 상품 거래 제한: {data.policy.enabled?'활성 · 검수한 상품만 신규 주문·PI 가능':'비활성 · 기존 가격 승인 규칙 적용, 제한 출시 준비 중'}</p>
 {data.role==='admin'&&<form onSubmit={e=>{e.preventDefault();void save({action:'policy',revision:data.policy.revision,enabled:!data.policy.enabled,reason:policyReason});}} className="space-y-3 rounded border p-4">
 <label className="block">출시 제한 변경 사유<input required minLength={10} maxLength={1000} value={policyReason} onChange={e=>setPolicyReason(e.target.value)} className="mt-1 w-full rounded border p-2"/></label>
 <button disabled={busy} className="rounded bg-stone-900 px-4 py-2 text-white">승인 상품 거래 제한 {data.policy.enabled?'해제':'활성화'}</button></form>}
 <label className="block">상품 이름·SKU 검색<input value={query} onChange={e=>setQuery(e.target.value)} className="mt-1 w-full rounded border p-2"/></label>
 <ul className="grid gap-3 lg:grid-cols-2">{data.products.filter(p=>(p.name+' '+p.sku).toLowerCase().includes(query.toLowerCase())).map(p=>{
 const current=p.review?.fingerprint===p.fingerprint,dom=current&&p.review?.domestic&&p.domestic_issues.length===0,exp=current&&p.review?.export&&p.export_issues.length===0;
 return <li key={p.product_id} className="space-y-2 rounded border p-4"><h2 className="font-semibold">{p.name} · {p.sku}</h2>
 <p>국내 {dom?'출시 검수 완료':'검수 대기'} / 해외 {exp?'출시 검수 완료':'검수 대기'} {p.review&&!current&&'· 변경되어 재검수 필요'}</p>
 <p className="text-sm">국내: {p.domestic_issues.join(', ')||'자동 검사 통과 · 실제 근거 확인 필요'}</p><p className="text-sm">해외: {p.export_issues.join(', ')||'자동 검사 통과 · 국가별 서류·콜드체인 실제 확인 필요'}</p>
 <div className="flex flex-wrap gap-3"><Link className="underline" href="/admin/products">상품 정보 관리</Link><Link className="underline" href="/admin/pricing">가격·MOQ 관리</Link>{data.role==='admin'&&<button disabled={busy} onClick={()=>{setSelected(p);setDomestic(!!p.review?.domestic&&p.domestic_issues.length===0);setExported(!!p.review?.export&&p.export_issues.length===0);setReason('');}} className="rounded border px-3 py-2">출시 검수·철회</button>}</div></li>;
 })}</ul>
 {selected&&<form onSubmit={e=>{e.preventDefault();void save({product_id:selected.product_id,revision:selected.review?.revision||0,hash:selected.fingerprint,domestic,export:exported,reason});}} className="space-y-4 rounded border-2 border-stone-700 p-4"><h2 className="text-xl font-bold">{selected.name} 출시 검수</h2>
 <label className="flex gap-2"><input type="checkbox" checked={domestic} disabled={selected.domestic_issues.length>0} onChange={e=>setDomestic(e.target.checked)}/>국내 출시 승인 · 가격·세금·포장 입수·MOQ·표시사항 검수</label>
 <label className="flex gap-2"><input type="checkbox" checked={exported} disabled={selected.export_issues.length>0} onChange={e=>setExported(e.target.checked)}/>해외 출시 승인 · 국가·콜드체인·서류·FOB 검수</label>
 <label className="block">실제 검수 근거 또는 철회 사유<textarea required minLength={10} maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)} className="mt-1 w-full rounded border p-2"/></label><p>양쪽 승인 해제는 신규 거래 대상에서 철회합니다. 기존 주문·발행 PI는 계속 조회됩니다.</p>
 <button disabled={busy} className="rounded bg-stone-900 px-4 py-2 text-white">검수 기록 저장</button> <button type="button" onClick={()=>setSelected(null)} className="rounded border px-4 py-2">닫기</button></form>}
 <h2 className="text-xl font-semibold">최근 검수·정책 감사 이력</h2><ul className="space-y-2">{data.events.map((e,i)=><li key={i} className="break-words rounded border p-3">{e.product_id||'거래 제한 정책'} · {e.reason} · {new Date(e.created_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} KST</li>)}</ul>
 </>}
 </div>;
}
