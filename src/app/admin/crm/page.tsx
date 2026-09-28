'use client';

import { useCallback, useEffect, useState } from 'react';
import { INQUIRY_STATUSES, type InquiryKind, type InquiryStatus } from '@/lib/commercial-inquiry';

type Inquiry = {
  id: string; kind: InquiryKind; status: InquiryStatus; company: string; contact_name: string;
  email: string; phone: string | null; business_type: string | null; business_registration_no: string | null;
  country: string | null; destination_port: string | null; incoterms: string | null;
  estimated_monthly_volume: string | null; items: { product_id: string; product_name: string; quantity_cartons: number }[];
  notes: string | null; created_at: string;
};

const labels: Record<InquiryStatus, string> = { new: '신규', reviewing: '검토 중', responded: '회신 완료', closed: '종결' };

async function readInquiries(): Promise<Inquiry[]> {
  const response = await fetch('/api/commercial-inquiries', { cache: 'no-store' });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.error || '문의 목록 조회에 실패했습니다.');
  return result.inquiries;
}

export default function AdminCRMPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [kind, setKind] = useState<'all' | InquiryKind>('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setInquiries(await readInquiries());
      setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '문의 목록 조회에 실패했습니다.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    readInquiries().then((items) => { if (active) { setInquiries(items); setError(''); } })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : '문의 목록 조회에 실패했습니다.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function changeStatus(id: string, status: InquiryStatus) {
    setUpdating(id);
    try {
      const response = await fetch('/api/commercial-inquiries', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || '상태 변경에 실패했습니다.');
      setInquiries((current) => current.map((item) => item.id === id ? { ...item, status } : item));
      setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '상태 변경에 실패했습니다.'); }
    finally { setUpdating(null); }
  }

  const visible = inquiries.filter((item) => (kind === 'all' || item.kind === kind) &&
    `${item.company} ${item.contact_name} ${item.email} ${item.country || ''} ${item.id}`.toLowerCase().includes(query.toLowerCase()));
  return <main className="min-h-screen bg-[#0a0a0c] p-6 text-stone-100 sm:p-8">
    <div className="mx-auto max-w-6xl space-y-6">
      <header><h1 className="text-3xl font-bold">상업 문의 관리</h1><p className="mt-2 text-sm text-stone-400">해외 RFQ와 국내 도매 문의를 실제 접수 순서대로 표시합니다. 견적은 담당자가 별도로 확인해 발행합니다.</p></header>
      <div className="flex flex-wrap gap-3"><select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)} className="rounded border border-stone-700 bg-stone-900 p-2 text-sm"><option value="all">전체 문의</option><option value="export_rfq">해외 RFQ</option><option value="domestic_wholesale">국내 도매</option></select><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="상호, 담당자, 이메일, 접수번호 검색" className="min-w-64 rounded border border-stone-700 bg-stone-900 p-2 text-sm" /><button onClick={() => void load()} className="rounded border border-stone-700 px-4 text-sm">새로고침</button></div>
      {error && <p role="alert" className="rounded border border-red-700 bg-red-950 p-3 text-sm">{error}</p>}
      {loading ? <p>문의 목록을 불러오는 중…</p> : visible.length === 0 ? <p className="rounded border border-stone-800 p-8 text-stone-400">해당하는 문의가 없습니다.</p> :
      <div className="space-y-4">{visible.map((item) => <article key={item.id} className="rounded-xl border border-stone-800 bg-stone-900 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs text-amber-400">{item.kind === 'export_rfq' ? '해외 RFQ' : '국내 도매'} · {new Date(item.created_at).toLocaleString('ko-KR')}</p><h2 className="mt-1 text-lg font-semibold">{item.company}</h2><p className="text-xs text-stone-500">{item.id}</p></div><label className="text-xs">처리 상태<select value={item.status} disabled={updating === item.id} onChange={(event) => void changeStatus(item.id, event.target.value as InquiryStatus)} className="ml-2 rounded border border-stone-700 bg-stone-950 p-2 text-sm">{INQUIRY_STATUSES.map((status) => <option key={status} value={status}>{labels[status]}</option>)}</select></label></div>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><div>담당자: {item.contact_name}</div><div>이메일: <a className="text-amber-300 underline" href={`mailto:${item.email}`}>{item.email}</a></div><div>전화: {item.phone || '미입력'}</div><div>업태: {item.business_type || '미입력'}</div>{item.kind === 'export_rfq' ? <><div>목적지: {item.country}{item.destination_port ? ` / ${item.destination_port}` : ''}</div><div>요청 조건: {item.incoterms}</div></> : <><div>월 예상 규모: {item.estimated_monthly_volume || '미입력'}</div><div>사업자등록번호: {item.business_registration_no || '미입력'}</div></>}</dl>
        {item.items?.length > 0 && <div className="mt-4"><h3 className="text-sm font-semibold">관심 상품</h3><ul className="mt-2 list-inside list-disc text-sm text-stone-300">{item.items.map((product) => <li key={product.product_id}>{product.product_name} · {product.quantity_cartons} cartons</li>)}</ul></div>}
        {item.notes && <p className="mt-4 whitespace-pre-wrap rounded bg-stone-950 p-3 text-sm text-stone-300">{item.notes}</p>}
      </article>)}</div>}
    </div>
  </main>;
}
