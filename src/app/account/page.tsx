'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AccountActivity from '@/components/storefront/AccountActivity';
import { COMPANY_STATUS_LABELS } from '@/lib/b2b-types';
type Member = { user_id: string; role?: string; status?: string; customer_accounts: { name: string; email: string } };
const input = 'mt-2 w-full rounded border border-stone-300 bg-white p-3';
export default function AccountPage() {
  const { user, company, membership, loading, error, logout, refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<Member[]>([]);
  const [join, setJoin] = useState(false);
  const [showCompany, setShowCompany] = useState(false);
  async function send(url: string, body: object) {
    setBusy(true); setMessage('');
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '저장에 실패했습니다.');
      setMessage(result.message || '저장되었습니다.');
      await refresh();
      return true;
    } catch (e) { setMessage(e instanceof Error ? e.message : '요청에 실패했습니다.'); return false; }
    finally { setBusy(false); }
  }
  async function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget).entries());
    await send('/api/account/company', { ...fields, action: join ? 'join' : 'apply' });
  }
  async function loadMembers() {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/account/members', { cache:'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMembers(result.members); setRequests(result.requests);
    } catch(e) { setMessage(e instanceof Error ? e.message : '담당자를 확인하지 못했습니다.'); }
    finally { setBusy(false); }
  }
  if (loading) return <main className="mx-auto max-w-4xl px-6 py-20" role="status">계정을 확인하고 있습니다…</main>;
  if (!user) return <main className="mx-auto max-w-3xl px-6 py-20"><h1 className="text-3xl font-bold">회원 로그인</h1>
    <p className="mt-5 text-stone-600">로그인이 필요하거나 세션이 만료되었습니다. 개인과 사업자 모두 이메일 인증으로 간편하게 가입할 수 있습니다.</p>
    {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
    <Link href="/account/login" className="mt-8 inline-block rounded bg-green-900 px-6 py-3 text-white">로그인 / 회원가입</Link></main>;
  return <main className="mx-auto max-w-4xl px-6 py-14">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-green-800">MY ACCOUNT</p><h1 className="mt-2 text-3xl font-bold">{user.name}님의 계정</h1><p className="mt-2 break-all text-stone-500">{user.email}</p></div>
      <button disabled={busy} onClick={async () => { setBusy(true); const result = await logout(); setMessage(result.message); setBusy(false); }} className="rounded border px-4 py-2">로그아웃</button></div>
    {(message || error) && <p role="status" className="mt-6 rounded border bg-amber-50 p-4">{message || error}</p>}
    <section className="mt-8 rounded-xl border border-green-200 bg-green-50 p-6"><h2 className="text-xl font-bold">이메일 인증 완료 · 바로 이용 가능</h2><p className="mt-3 text-stone-600">별도 가입 승인이나 사업자번호가 필요하지 않습니다. 개인도 상품을 둘러보고 대용량 식료품을 주문할 수 있습니다.</p><Link href="/shop" className="mt-4 inline-block rounded bg-green-900 px-5 py-3 text-white">대용량 상품 둘러보기</Link></section>
    <AccountActivity key={user.id+String(company?.id)+String(membership?.status)+String(company?.status)}/>
    {company ? <section className="mt-8 rounded-xl border bg-stone-50 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">{company.name}</h2><span className="rounded bg-white px-3 py-1 text-sm font-semibold">{COMPANY_STATUS_LABELS[company.status]}</span></div>
      <p className="mt-3">{company.kind === 'domestic' ? '국내 도매' : '해외 바이어'} · {company.country}</p>
      <p className="mt-2 text-sm text-stone-600">담당자: {membership?.role === 'owner' ? '대표 담당자' : '일반 담당자'} / {membership?.status === 'active' ? '활성' : '이용 중지'}</p>
      <p className="mt-4 text-sm text-stone-600">{company.status === 'approved' && membership?.status === 'active' ? '등록된 회사 정보입니다. 사업자 인증을 의미하지 않으며, 견적·주문 조건은 별도로 확정됩니다.' : '현재 거래 자료에 접근할 수 없습니다. 회사 또는 소속 상태를 담당자에게 확인해 주세요.'}</p>
      {membership?.role === 'owner' && company.status === 'approved' && membership.status === 'active' && <div className="mt-6 border-t pt-5">
        <h3 className="font-bold">회사 담당자 관리</h3><p className="mt-2 break-all text-sm">회사 코드: <code>{company.id}</code></p>
        <p className="mt-2 text-sm text-stone-600">동료에게 회사 코드를 전달해 주세요. 동료가 이메일 인증·로그인 후 소속 요청을 보내면 아래에서 승인할 수 있습니다. 담당자 중지는 관리자에게 요청해 주세요.</p>
        <button disabled={busy} className="mt-4 rounded border bg-white px-4 py-2" onClick={() => void loadMembers()}>담당자·소속 요청 확인</button>
        {members.map(member => <p key={member.user_id} className="mt-3 text-sm">{member.customer_accounts.name} · {member.customer_accounts.email} · {member.status}</p>)}
        {requests.map(member => <div key={member.user_id} className="mt-3 flex flex-wrap items-center gap-3 rounded border bg-white p-3"><span>{member.customer_accounts.name} · {member.customer_accounts.email}</span>
          <button disabled={busy} className="rounded bg-green-900 px-3 py-2 text-white" onClick={async () => { if (await send('/api/account/members', {email:member.customer_accounts.email})) await loadMembers(); }}>소속 승인</button></div>)}
      </div>}
    </section> : <section className="mt-8 rounded-xl border p-6">
      <h2 className="text-xl font-bold">{join ? '기존 회사에 소속 요청' : '회사 정보 추가 (선택)'}</h2>
      <p className="mt-3 text-sm text-stone-600">회사 정보 없이도 개인회원으로 이용할 수 있습니다. 새 회사는 등록 즉시 이용 가능하며, 기존 회사의 자료 공유는 대표 담당자가 소속을 확인합니다.</p>
      <button type="button" onClick={() => setShowCompany(!showCompany)} className="mt-4 text-green-800 underline">{showCompany ? '나중에 등록하기' : '회사 정보 추가하기'}</button>
      {showCompany && <form onSubmit={apply} className="mt-6 space-y-4">
        {join ? <label className="block">회사 코드<input name="companyId" required maxLength={36} className={input} /></label> : <>
          <label className="block">회사명<input name="name" required maxLength={200} className={input} /></label>
          <label className="block">거래 유형<select name="kind" className={input}><option value="domestic">국내 도매고객</option><option value="overseas">Overseas buyer / 해외 바이어</option></select></label>
          <label className="block">국가<input name="country" required minLength={2} maxLength={100} placeholder="대한민국 / Republic of Korea" className={input} /></label>
          <label className="block">사업자·법인 등록번호 (선택)<input name="registrationNo" maxLength={100} className={input} /></label>
        </>}
        <button disabled={busy} className="rounded bg-green-900 px-6 py-3 text-white disabled:opacity-50">{busy ? '저장 중…' : join ? '소속 요청 보내기' : '회사 정보 저장'}</button>
        <button disabled={busy} type="button" onClick={() => setJoin(!join)} className="block py-2 text-sm text-green-800 underline">{join ? '새 회사 등록하기' : '기존 회사에 소속 요청하기'}</button>
      </form>}
    </section>}
    <section className="mt-8 rounded-xl border p-6"><h2 className="text-xl font-bold">견적·주문 안내</h2>
      <p className="mt-3 text-stone-600">국내 주문은 공급·배송비 확인과 고객의 최종 금액 확인 후 계좌입금 방식으로 진행됩니다. 주문·입금·출고 내역을 아래에서 확인할 수 있습니다.</p>
      <div className="mt-5 flex flex-wrap gap-4"><Link href="/account/orders" className="font-semibold text-green-800 underline">내 주문·입금·배송 조회</Link><Link href="/wholesale" className="text-green-800 underline">개인·국내 도매 구매 문의</Link><Link href="/rfq" className="text-green-800 underline">해외 RFQ 요청</Link></div>
      <p className="mt-5 text-sm text-stone-500">해외 기본 조건은 FOB이며 국내 운송·수출통관·본선 적재 비용은 VAT 제외 도매가에 포함합니다. 조건에 따라 금액이 조정될 수 있으며, 변경 조건은 사전 안내 후 합의합니다. 추후 발행 견적 문서는 Proforma Invoice로, 최종 Invoice가 아닙니다.</p>
    </section>
  </main>;
}
