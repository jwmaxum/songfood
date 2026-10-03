'use client';
import Link from 'next/link';
import {useCallback,useEffect,useState} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import {LABELS,TITLES,DOCUMENT_LABELS,STATUS_LABELS,ROLE_LABELS,kst,rowLink,type Mode,type OpsData,type WorkRow} from '@/lib/operations/types';
import WorkPlan from './WorkPlan';
import QualitySummary from './QualitySummary';
const field='mt-1 block w-full rounded border border-stone-300 bg-white p-2';
export default function OperationsBoard({mode,query}:{mode:Mode;query:string}){
 const router=useRouter(),pathname=usePathname(),[data,setData]=useState<OpsData|null>(null),[error,setError]=useState(''),[revision,setRevision]=useState(0),[edit,setEdit]=useState('');
 const params=new URLSearchParams(query),page=Number(params.get('page')||1),category=params.get('category')||'';
 useEffect(()=>{const c=new AbortController();fetch('/api/admin/operations/'+mode+'?'+query,{cache:'no-store',signal:c.signal}).then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.error||'조회 실패');setData(b);setError('');}).catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();},[mode,query,revision]);
 const refresh=useCallback(async()=>{const r=await fetch('/api/admin/operations/'+mode+'?'+query,{cache:'no-store'}),b=await r.json();if(!r.ok)throw new Error(b.error);setData(b);setError('');setEdit('');},[mode,query]);
 function navigate(change:Record<string,string>){const next=new URLSearchParams(query);for(const[k,v]of Object.entries(change))if(v)next.set(k,v);else next.delete(k);router.push(pathname+'?'+next.toString());}
 const labels:Record<string,string>=LABELS[mode];
 const available=Object.entries(labels).filter(([key])=>mode!=='work'||data?.role==='admin'||(data?.role==='order_staff'?['order_review','customer_confirm','unpaid','shipping','refund','claim'].includes(key):data?.role==='inquiry_staff'?!['order_review','customer_confirm','unpaid','shipping','refund','claim'].includes(key):false));
 return <main className="min-h-screen space-y-6 bg-stone-50 p-4 text-stone-900 sm:p-8">
 <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs tracking-widest text-green-800">SONGFOOD · OPERATIONS</p><h1 className="mt-2 text-3xl font-bold">{TITLES[mode]}</h1></div><button onClick={()=>setRevision(n=>n+1)} className="rounded border bg-white px-4 py-2">새로고침</button></header>
 <p className="text-sm text-stone-600">{mode==='work'?'담당 업무를 검색하고 기한·다음 행동을 기록하세요. 숫자를 선택하면 해당 업무 목록으로 연결됩니다. 분류가 겹칠 수 있어 숫자의 합은 전체 건수와 다릅니다.':mode==='documents'?'PI는 최종 Commercial Invoice가 아닙니다. 상세에서 접근 권한을 재확인하고 PDF를 조회합니다. 준비 미완료 문서는 관리자만 발행 재시도할 수 있습니다.':mode==='quality'?'현재 적용 중인 최신 승인 가격을 검사합니다. 만료된 가격을 과거 가격으로 되돌리지 않습니다. 상품·가격표 조합별 건수이며 7일 이내 만료를 안내합니다.':mode==='contacts'?'이메일 인증 후 자동 활성화됩니다. 개인 가입과 구매가 가능하고 사업자번호는 선택입니다. 회사 연결 여부와 회사·담당자 상태를 함께 확인하세요.':'회원·가격·문의·PI·주문에 기록된 실제 감사 이력입니다. 은행 증빙과 문서 본문은 각 업무 상세에서 확인합니다.'}</p>
 <nav className="flex flex-wrap gap-4 text-sm text-green-900" aria-label="운영 바로가기"><Link className="underline" href="/admin/guide">운영 매뉴얼</Link>{data&&['admin','product_staff'].includes(data.role)&&<Link className="underline" href="/admin/quality">상품·가격 점검</Link>}{data&&['admin','inquiry_staff'].includes(data.role)&&<Link className="underline" href="/admin/documents">PI 문서</Link>}{data?.role==='admin'&&<><Link className="underline" href="/admin/contacts">거래처</Link><Link className="underline" href="/admin/audit">감사 이력</Link></>}</nav>
 {error?<div role="alert" className="rounded border border-red-300 bg-red-50 p-5"><strong>조회 불가</strong><p className="mt-2">{error}</p><p className="mt-2 text-sm">조회 실패를 0건으로 표시하지 않습니다. 새로고침으로 다시 확인해 주세요.</p></div>:!data?<p role="status">현재 업무를 불러오고 있습니다…</p>:<>
 <p className="text-xs text-stone-600">조회 기준: {kst(data.as_of)} KST · 권한: {ROLE_LABELS[data.role]}</p>
 {mode==='work'&&data.role==='admin'&&<QualitySummary key={revision}/>}
 {data.rate_alert&&<p role="status" className="rounded border border-amber-300 bg-amber-50 p-4">{data.rate_alert} · <Link href="/admin/pricing" className="underline">환율 검토·승인</Link></p>}
 {data.counts&&<section aria-label="업무 현황" className="grid grid-cols-2 gap-3 lg:grid-cols-4">{available.map(([key,label])=><button key={key} aria-pressed={key===category} onClick={()=>navigate({category:key,page:'1'})} className={'rounded-lg border p-4 text-left '+(category===key?'border-green-800 bg-green-50':'bg-white')}><span className="text-xs text-stone-600">{label}</span><strong className="mt-2 block text-2xl">{data.counts?.[key]||0}</strong></button>)}</section>}
 </>}
 <form key={query+':'+(data?.role||'loading')} onSubmit={e=>{e.preventDefault();const p=new URLSearchParams();for(const[k,v]of new FormData(e.currentTarget))if(v)p.set(k,String(v));p.set('page','1');router.push(pathname+'?'+p.toString());}} className="flex flex-wrap gap-3 rounded-xl border bg-white p-4 text-sm">
 <label className="min-w-48 flex-1">검색<input name="q" maxLength={120} defaultValue={params.get('q')||''} className={field} placeholder="이름 · 번호 · 이메일 · SKU"/></label>
 <label>분류<select name="category" defaultValue={category} className={field}><option value="">전체</option>{available.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
 {mode==='work'&&<><label>종류<select name="kind" defaultValue={params.get('kind')||''} className={field}><option value="">전체</option><option value="inquiry">문의·견적·PI</option><option value="order">국내 주문</option></select></label>
 <label>담당<select name="assigned" defaultValue={params.get('assigned')||''} className={field}><option value="">전체</option><option value="mine">내 담당</option><option value="unassigned">미배정</option>{data?.staff?.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
 <label>기한<select name="due" defaultValue={params.get('due')||''} className={field}><option value="">전체</option><option value="overdue">기한 경과 · 진행 업무</option><option value="soon">3일 이내 · 진행 업무</option><option value="unset">미지정</option></select></label></>}
 <button className="self-end rounded bg-green-900 px-5 py-2 text-white">검색·필터</button><button type="button" onClick={()=>router.push(pathname)} className="self-end rounded border px-4 py-2">초기화</button>
 </form>
 {!error&&data&&<section aria-label="업무 목록"><p className="mb-4 text-sm">전체 {data.total}건 · {page} / {Math.max(1,Math.ceil(data.total/30))}페이지</p>
 {!data.items.length&&<p className="rounded border bg-white p-6">{data.total?'이 페이지에 항목이 없습니다. 첫 페이지로 이동해 주세요.':'선택한 조건에 해당하는 자료가 없습니다.'}</p>}
 <div className="space-y-3">{data.items.map(row=>{const href=rowLink(row,mode);return <article key={(row.source||'')+row.id} className="rounded-xl border bg-white p-5">
 <div className="flex flex-wrap justify-between gap-3"><div className="min-w-0"><h2 className="break-words font-bold">{row.title}</h2><p className="mt-2 whitespace-pre-wrap break-words text-sm">{row.subtitle}</p></div>{href&&<Link href={href} className="self-start rounded border px-4 py-2 text-sm text-green-900">업무 상세 →</Link>}</div>
 <p className="mt-2 break-all text-xs text-stone-500">{row.id}{row.created_at?' · '+kst(row.created_at)+' KST':''}</p>
 {row.tags&&<p className="mt-3 text-sm text-amber-900">{row.tags.map(t=>labels[t]||t).join(' · ')||'대기 분류 없음'}{row.status?' · '+(STATUS_LABELS[row.status]||row.status):''}</p>}
 {mode==='documents'&&<p className="mt-3 text-sm">{DOCUMENT_LABELS[row.status as keyof typeof DOCUMENT_LABELS]||row.status} · 유효 종료 {row.valid_until?kst(row.valid_until):'미지정'} KST</p>}
 {mode==='contacts'&&<p className="mt-3 text-sm">회원 {STATUS_LABELS[row.status||'']||row.status} · {row.company_name?row.company_name+' / 회사 '+(STATUS_LABELS[row.company_status||'']||row.company_status)+' / 담당자 '+(STATUS_LABELS[row.membership_status||'']||row.membership_status):'개인 회원'} · {row.price_list?'등록 계약표: '+row.price_list+' (회사 승인·소속 활성 시 적용)':'공통·회원 유형별 가격표 적용'}</p>}
 {mode==='audit'&&<p className="mt-3 text-sm">분류 {LABELS.audit[row.source as keyof typeof LABELS.audit]||row.source} · 처리자 {row.actor_name||row.assigned_name||'고객/이전 계정'} · 대상 {row.target_id||'설정'}</p>}
 {row.issues&&<p className="mt-3 text-sm text-red-800">{row.issues.join(' · ')}</p>}
 {mode==='work'&&<><p className="mt-3 text-sm">담당: {row.assigned_name||'미배정'} · 마감: {row.due_at?kst(row.due_at)+' KST':'미지정'}</p><div className="mt-3 flex gap-4 text-sm"><button className="underline" onClick={()=>setEdit(edit===row.id?'':row.id)}>담당자·기한·인수인계</button><Link className="underline" href={'/admin/history/'+row.kind+'/'+row.id}>전체 업무 이력</Link></div>{edit===row.id&&<WorkPlan key={row.id+':'+row.revision} row={row as WorkRow} staff={data.staff||[]} changed={refresh}/>}</>}
 </article>;})}</div>
 <nav aria-label="목록 페이지" className="mt-5 flex items-center justify-center gap-4"><button disabled={page<=1} onClick={()=>navigate({page:String(page-1)})} className="rounded border px-4 py-2 disabled:opacity-30">이전</button>{page>1&&<button onClick={()=>navigate({page:'1'})} className="underline">첫 페이지</button>}<span>{page}</span><button disabled={page*30>=data.total} onClick={()=>navigate({page:String(page+1)})} className="rounded border px-4 py-2 disabled:opacity-30">다음</button></nav>
 </section>}
 {mode==='work'&&<p className="text-xs text-stone-600">PI 발행 검토는 최신 견적에 대한 관리자 검토 대기입니다. 별도 승인이 완료됐다는 의미는 아닙니다. 내부 테스트 전달 대기/실패는 고객 이메일 발송 상태가 아닙니다.</p>}
 </main>;
}
