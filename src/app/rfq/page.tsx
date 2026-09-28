'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import type { ProductItem } from '@/lib/types';

type Selection = Record<string, number>;

export default function RFQPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selected, setSelected] = useState<Selection>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
  const [form, setForm] = useState({ company: '', contact_name: '', email: '', phone: '', business_type: '', country: '', destination_port: '', incoterms: 'FOB Busan', notes: '' });

  useEffect(() => {
    let active = true;
    fetch('/api/products', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) throw new Error('상품을 불러오지 못했습니다.');
      const payload = await response.json();
      if (active) {
        const list = payload.data as ProductItem[];
        setProducts(list);
        const params = new URLSearchParams(window.location.search);
        const ids = (params.get('products') || params.get('product') || '').split(',');
        setSelected(Object.fromEntries(ids.filter((id) => list.some((product) => product.id === id)).map((id) => [id, 1])));
      }
    }).catch((cause) => { if (active) setError(cause.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const items = products.filter((product) => selected[product.id]).map((product) => ({ product_id: product.id, product_name: product.name_en || product.name, quantity_cartons: selected[product.id] }));
    if (!items.length) { setError('문의할 상품을 한 개 이상 선택해 주세요.'); return; }
    setSubmitting(true);
    try {
      const response = await fetch('/api/commercial-inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'export_rfq', ...form, items }) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || '문의 접수에 실패했습니다.');
      setReference(payload.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '문의 접수에 실패했습니다.');
    } finally { setSubmitting(false); }
  }

  const inputClass = 'w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-3 text-sm text-white';
  return <main className="min-h-screen bg-[#0a0a0c] px-4 py-12 text-stone-100">
    <div className="mx-auto max-w-5xl space-y-8">
      <div><Link href="/shop" className="text-sm text-amber-400">← 상품 목록</Link><h1 className="mt-3 text-3xl font-bold">Export RFQ</h1><p className="mt-2 text-sm text-stone-400">Select products and quantities. Our team will confirm availability, specifications, price and shipping terms before issuing a quotation.</p></div>
      {reference ? <section className="rounded-xl border border-emerald-700 bg-emerald-950 p-8"><h2 className="text-xl font-bold">RFQ received</h2><p className="mt-2 text-sm">Reference: {reference}</p><p className="mt-2 text-sm text-stone-300">A sales representative will review your request and contact you at {form.email}.</p></section> :
      <form onSubmit={submit} className="space-y-8">
        <section className="rounded-xl border border-stone-800 bg-stone-900 p-6"><h2 className="mb-4 text-xl font-semibold">1. Products</h2>
          {loading ? <p>Loading products…</p> : <div className="grid max-h-96 gap-3 overflow-y-auto sm:grid-cols-2">{products.map((product) => <div key={product.id} className="rounded-lg border border-stone-700 p-3"><label className="flex gap-3 text-sm"><input type="checkbox" checked={selected[product.id] !== undefined} onChange={(event) => setSelected((current) => { const next = { ...current }; if (event.target.checked) next[product.id] = 1; else delete next[product.id]; return next; })} /><span>{product.name_en || product.name}<span className="block text-xs text-stone-400">{product.format}</span></span></label>{selected[product.id] !== undefined && <label className="mt-3 block text-xs text-stone-300">Cartons requested<input type="number" min="1" max="100000" required value={selected[product.id]} onChange={(event) => setSelected((current) => ({ ...current, [product.id]: Number(event.target.value) }))} className={`${inputClass} mt-1`} /></label>}</div>)}</div>}
        </section>
        <section className="rounded-xl border border-stone-800 bg-stone-900 p-6"><h2 className="mb-4 text-xl font-semibold">2. Destination and terms requested</h2><div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">Destination country *<input required maxLength={100} value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} className={`${inputClass} mt-1`} /></label>
          <label className="text-sm">Destination port / city<input maxLength={120} value={form.destination_port} onChange={(event) => setForm({ ...form, destination_port: event.target.value })} className={`${inputClass} mt-1`} /></label>
          <label className="text-sm">Incoterms requested<select value={form.incoterms} onChange={(event) => setForm({ ...form, incoterms: event.target.value })} className={`${inputClass} mt-1`}>{['FOB Busan', 'CIF', 'CFR', 'EXW'].map((term) => <option key={term}>{term}</option>)}</select></label>
        </div></section>
        <section className="rounded-xl border border-stone-800 bg-stone-900 p-6"><h2 className="mb-4 text-xl font-semibold">3. Buyer details</h2><div className="grid gap-4 sm:grid-cols-2">
          {([['company', 'Company *'], ['contact_name', 'Contact name *'], ['email', 'Business email *'], ['phone', 'Phone / WhatsApp'], ['business_type', 'Business type']] as const).map(([key, label]) => <label key={key} className="text-sm">{label}<input required={['company', 'contact_name', 'email'].includes(key)} type={key === 'email' ? 'email' : 'text'} maxLength={key === 'email' ? 254 : 200} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className={`${inputClass} mt-1`} /></label>)}
          <label className="text-sm sm:col-span-2">Product, labeling, certification or OEM requirements<textarea rows={4} maxLength={10000} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={`${inputClass} mt-1`} /></label>
        </div></section>
        {error && <p role="alert" className="rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-200">{error}</p>}
        <button type="submit" disabled={submitting || loading} className="rounded-lg bg-amber-500 px-8 py-3 font-bold text-black disabled:opacity-50">{submitting ? 'Submitting…' : 'Submit RFQ'}</button>
      </form>}
    </div>
  </main>;
}
