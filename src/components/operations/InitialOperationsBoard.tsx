'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {INITIAL_ROUTINE,initialWorkLinks,type InitialOperations} from '@/lib/operations/initial';
import {QUALITY_LABELS,ROLE_LABELS,kst} from '@/lib/operations/types';
export default function InitialOperationsBoard(){
 const [data,setData]=useState<InitialOperations|null>(null),[error,setError]=useState(''),[revision,setRevision]=useState(0),[loading,setLoading]=useState(true);
 useEffect(()=>{const controller=new AbortController();fetch('/api/admin/operations/initial',{cache:'no-store',signal:controller.signal}).then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.error||'조회 실패');setData(b);setError('');}).catch(e=>{if(!controller.signal.aborted){setError(e instanceof Error?e.message:'조회 실패');setData(null);}}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[revision]);
 const priorities=data?[
  {key:'overdue',title:'기한 경과',href:'/admin?due=overdue'},
  {key:'reassignment',title:'재배정 필요',href:'/admin?assigned=reassign'},
  {key:'unassigned',title:'미배정 진행 업무',href:'/admin?assigned=unassigned&due=active'},
  {key:'mine',title:'내 담당 진행 업무',href:'/admin?assigned=mine&due=active'},
  {key:'soon',title:'3일 이내',href:'/admin?due=soon'},
 ] as const:[];
 return <main className="min-h-screen space-y-6 bg-stone-50 p-4 text-stone-900 sm:p-8">
 <header className="flex flex-wrap justify-between gap-4"><div><p className="text-xs text-green-800">SONGFOOD · OPERATIONS</p><h1 className="mt-2 text-3xl font-bold">초기 운영 점검</h1></div><button disabled={loading} onClick={()=>{setLoading(true);setRevision(n=>n+1);}} className="rounded border bg-white px-4 py-2 disabled:opacity-50">최신 운영 상태 불러오기</button></header>
 <p className="text-sm">진행 업무와 남은 후속 조치를 역할별로 확인합니다. 업무 숫자는 분류가 겹칠 수 있으며, 각 상세 화면에서 실제 근거와 최신 상태를 확인해 처리합니다.</p>
 <nav aria-label="초기 운영 바로가기" className="flex flex-wrap gap-4 text-sm text-green-900"><Link className="underline" href="/admin">업무 대시보드</Link><Link className="underline" href="/admin/handover">업무 인수·출시 검수</Link><Link className="underline" href="/admin/guide">운영 매뉴얼</Link>{data?.role==='admin'&&<><Link className="underline" href="/admin/launch">담당자·신규 접수 중지/재개</Link><Link className="underline" href="/admin/mail">고객 이메일 운영</Link></>}</nav>
 {loading?<p role="status">최신 운영 자료를 불러오고 있습니다…</p>:error?<div role="alert" className="rounded border border-red-300 bg-red-50 p-5"><strong>조회 불가</strong><p>{error}</p><p className="mt-2 text-sm">조회 실패를 0건으로 표시하지 않습니다. 연결 복구 후 새로고침하세요.</p></div>:data&&<>
 <p className="text-xs text-stone-600">업무 조회 기준: {kst(data.as_of)} KST · {ROLE_LABELS[data.role]}</p>
 <section aria-label="운영 담당·접수 상태" className="rounded border bg-white p-5"><h2 className="font-bold">운영 담당·접수 상태</h2><p className="mt-2 break-words">{data.service.owner?data.service.owner+' · '+(data.service.response_minutes??'미정')+'분 내 대응 목표':'운영 담당자·대응 목표 지정 필요'}</p><p className="mt-2 text-sm">신규 문의 {data.service.inquiries_paused?'중지':'접수 가능'} · 국내 주문 {data.service.orders_paused?'중지':'접수 가능'} · PI 발행 {data.service.pi_paused?'중지':'진행 가능'}</p><p className="mt-2 text-xs text-stone-600">접수 상태만으로 상업 출시 인수가 완료된 것은 아닙니다.</p></section>
 {data.assessment&&<section aria-label="제한 출시 인수 현황" className="grid gap-4 lg:grid-cols-2">{(['domestic','export'] as const).map(channel=><article key={channel} className="rounded border bg-white p-5"><h2 className="font-bold">{channel==='domestic'?'국내':'해외'} 제한 출시</h2><p className="mt-2 font-semibold">{data.assessment![channel].ready?'현재 인수 조건 충족':'보류 · 운영 자료·실제 인수 확인 필요'}</p><ul className="mt-3 list-inside list-disc space-y-2 text-sm">{data.assessment![channel].gaps.map(g=><li key={g}>{g}</li>)}</ul><Link className="mt-3 block text-sm text-green-900 underline" href="/admin/handover">현재 근거와 보류 조건 확인</Link></article>)}</section>}
 {data.role!=='product_staff'&&<><section aria-label="우선 처리 업무" className="grid grid-cols-2 gap-3 lg:grid-cols-5">{priorities.map(p=><Link key={p.key} href={p.href} className="rounded border bg-white p-4"><span className="text-xs">{p.title}</span><strong className="mt-2 block text-2xl">{data.metrics[p.key]}</strong></Link>)}</section><p className="text-xs text-stone-600">진행 업무 {data.metrics.active}건. 재배정 필요는 현재 해당 업무 권한이 없거나 정지·삭제·인증 해제된 기존 담당자에게 배정된 업무입니다. 기존 배정·이력은 보존하고 담당자가 직접 변경합니다. 미해결 후속 조치가 있는 완료·취소 업무도 확인합니다.</p><section aria-label="거래·문서 후속 조치" className="grid grid-cols-2 gap-3 lg:grid-cols-4">{initialWorkLinks(data.role,data.counts).map(p=><Link key={p.key} href={p.href} className="rounded border bg-white p-4"><span className="text-xs">{p.label}</span><strong className="mt-2 block text-2xl">{p.count}</strong></Link>)}</section></>}
 {data.quality&&<section aria-label="상품·가격 운영 점검" className="space-y-3 rounded border bg-white p-5"><h2 className="font-bold">상품·가격 운영 점검</h2><p className="text-xs">조회 기준: {kst(data.quality.as_of)} KST</p><div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{Object.entries(QUALITY_LABELS).map(([key,title])=><Link key={key} className="rounded border p-3 text-sm" href={'/admin/quality?category='+key}>{title}<strong className="mt-2 block text-xl">{data.quality!.counts[key]||0}</strong></Link>)}</div>{data.quality.rate_alert&&<p className="text-sm text-amber-900">{data.quality.rate_alert} · <Link className="underline" href="/admin/pricing">환율 확인</Link></p>}</section>}
 </>}
 <section aria-label="초기 운영 절차" className="space-y-4 rounded border bg-white p-5"><h2 className="text-lg font-bold">업무 시작·처리·교대 절차</h2>{INITIAL_ROUTINE.map(s=><article key={s.title}><h3 className="font-semibold">{s.title}</h3><p className="mt-1 text-sm">{s.detail}</p></article>)}<p className="text-xs text-stone-600">메일 결과 불명은 자동 재발송하지 않습니다. 필요한 업무만 권한 있는 담당자가 전용 화면에서 처리하고 사유를 기록합니다.</p></section>
 </main>;
}
