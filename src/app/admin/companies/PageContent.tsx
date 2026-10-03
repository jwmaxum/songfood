'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { COMPANY_STATUS_LABELS, type Company } from '@/lib/b2b-types';
type ReviewCompany = Company & { review_reason: string | null; company_members: { user_id: string; role: string; status: string; customer_accounts: {name:string;email:string} }[] };
export default function CompaniesPage({companyId}:{companyId?:string}) {
  const url='/api/admin/companies'+(companyId?'?company='+companyId:'');
  const [companies,setCompanies] = useState<ReviewCompany[]>([]);
  const [reasons,setReasons] = useState<Record<string,string>>({});
  const [message,setMessage] = useState('');
  const [busy,setBusy] = useState(false);
  async function refresh() {
    const response = await fetch(url,{cache:'no-store'});
    const result = await response.json();
    if(!response.ok) throw new Error(result.error || '회사 목록을 확인하지 못했습니다.');
    setCompanies(result.companies);
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch(url,{cache:'no-store',signal:controller.signal}).then(async response => {
      const result = await response.json();
      if(!response.ok) throw new Error(result.error || '회사 목록을 확인하지 못했습니다.');
      setCompanies(result.companies);
    }).catch(e => { if(e.name !== 'AbortError') setMessage('회사 목록을 확인하지 못했습니다.'); });
    return () => controller.abort();
  },[url]);
  async function review(companyId:string,status:string,memberId?:string) {
    setBusy(true); setMessage('');
    try {
      const response = await fetch(url,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({companyId,status,memberId,reason:reasons[companyId] || ''})});
      const result = await response.json();
      if(!response.ok) throw new Error(result.error || '변경하지 못했습니다.');
      await refresh(); setMessage('상태 변경과 감사 이력을 저장했습니다.');
    } catch(e) { setMessage(e instanceof Error ? e.message : '서버 연결에 실패했습니다.'); }
    finally { setBusy(false); }
  }
  return <main className="max-w-6xl p-6 md:p-8"><h1 className="text-2xl font-bold">회사·담당자 관리</h1>
    <p className="mt-3 text-stone-400">신규 회원과 회사는 별도 심사 없이 이용합니다. 사업자번호는 선택이며 등록만으로 사업자 인증을 의미하지 않습니다. 거래 중지·복구와 소속 변경 사유를 기록합니다. 전체 회원 검색은 거래처 화면을 이용하세요. 이 화면은 선택 회사 또는 최근 등록 200개를 표시합니다.</p>
    <Link href="/admin/contacts" className="mt-4 inline-block underline">전체 거래처 검색</Link>
    {message && <p role="status" className="mt-5 rounded border border-stone-700 p-4">{message}</p>}
    <div className="mt-7 space-y-6">{companies.map(company => <section key={company.id} className="rounded-xl border border-stone-800 p-5">
      <div className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-bold">{company.name}</h2><span>{COMPANY_STATUS_LABELS[company.status]}</span></div>
      <p className="mt-3 text-sm text-stone-400">{company.kind} · {company.country} · 등록번호 {company.registration_no || '미입력 (선택)'}</p>
      <p className="mt-2 break-all text-xs text-stone-500">{company.id}</p><Link className="mt-3 inline-block text-sm underline" href="/admin/pricing">회사 코드로 계약 가격표 배정</Link>
      {company.review_reason && <p className="mt-3 text-sm">최근 검토: {company.review_reason}</p>}
      <label className="mt-4 block text-sm">상태 변경 사유 (3자 이상)<input maxLength={1000} value={reasons[company.id] || ''} onChange={e => setReasons({...reasons,[company.id]:e.target.value})} className="mt-2 w-full rounded border border-stone-700 bg-stone-950 p-3" /></label>
      <div className="mt-4 flex flex-wrap gap-3">{(['approved','rejected','suspended'] as const).map(status => <button key={status} disabled={busy || (reasons[company.id] || '').trim().length < 3} onClick={() => void review(company.id,status)} className="rounded border border-stone-600 px-4 py-2 disabled:opacity-40">{COMPANY_STATUS_LABELS[status]}</button>)}</div>
      <h3 className="mt-6 font-semibold">담당자 소속</h3>
      {company.company_members.map(member => <div key={member.user_id} className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-stone-800 pt-3 text-sm">
        <span>{member.customer_accounts.name} · {member.customer_accounts.email} · {member.role} · {member.status}</span>
        <button disabled={busy || (reasons[company.id] || '').trim().length < 3} onClick={() => void review(company.id,member.status === 'active' ? 'suspended' : 'active',member.user_id)} className="rounded border border-stone-600 px-3 py-2 disabled:opacity-40">{member.status === 'active' ? '담당자 중지' : '담당자 활성화'}</button>
      </div>)}
    </section>)}</div>
    {!companies.length && !message && <p className="mt-8 text-stone-400">회사 신청을 불러오는 중이거나 등록된 신청이 없습니다.</p>}
  </main>;
}
