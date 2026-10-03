'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ProductItem } from '@/lib/types';
import { PRODUCT_TAXONOMY, categoriesForCollection, isValidProductCategory } from '@/lib/product-taxonomy';

const PLACEHOLDER = '/images/products/coming-soon.png';
const inputClass = 'w-full rounded border border-stone-700 bg-stone-950 px-3 py-2 text-white outline-none focus:border-amber-400';
const labelClass = 'block space-y-1 text-xs font-medium text-stone-300';

function blankProduct(): ProductItem {
  return {
    id: `prod-${crypto.randomUUID()}`,
    sku: '', name: '', name_en: '',
    collection: PRODUCT_TAXONOMY[0].collection,
    category: PRODUCT_TAXONOMY[0].categories[0],
    price: 0, original_price: null, stock: 0, rating: null, reviews_count: 0,
    format: '', finish: '', color: '', look: '',
    image_url: PLACEHOLDER, description: '', origin: '',
    brand: '', manufacturer: '', country_of_origin: '', net_weight: '',
    shelf_life: '', storage: '', ingredients: '', allergens: '', certifications: [],
    is_featured: false, is_todays_deal: false, is_best_seller: false,
    carton_qty: 0, wholesale_discount_rate: 0,
    wholesale_price_krw: null, export_price_usd: null,
    carton_size: null, gross_weight: null, cbm: null, moq_cartons: null,
    hs_code: null, production_lead_time: null, export_packaging: null,
    loading_port: null, target_markets: [],
  } as unknown as ProductItem;
}

export default function ProductManagerV2() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [draft, setDraft] = useState<ProductItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState('연결 확인 중');

  useEffect(() => {
    let active = true;
    fetch('/api/products?mode=admin', { cache: 'no-store' }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '상품을 조회하지 못했습니다.');
      if (active) { setProducts(result.data); setSource('서버 상품 목록'); }
    }).catch(() => { if (active) { setMessage('상품 목록 연결에 실패했습니다.'); setSource('연결 실패'); } });
    return () => { active = false; };
  }, []);

  const visible = useMemo(() => products.filter((p) =>
    `${p.name} ${p.name_en || ''} ${p.sku || ''} ${p.collection} ${p.category || ''}`.toLowerCase().includes(search.toLowerCase())
  ), [products, search]);

  function update<K extends keyof ProductItem>(key: K, value: ProductItem[K]) {
    setDraft((old) => old ? { ...old, [key]: value } : old);
  }

  async function authHeader(): Promise<Record<string,string>> { return {}; }

  async function save() {
    if (!draft) return;
    setMessage('');
    if (!isValidProductCategory(draft.collection, draft.category || '')) return setMessage('컬렉션과 제품 종류를 다시 선택하세요.');
    const required: Array<keyof ProductItem> = ['sku', 'name', 'name_en', 'format', 'description', 'manufacturer', 'country_of_origin', 'net_weight', 'shelf_life', 'storage', 'ingredients', 'allergens'];
    const missing = required.filter((key) => !String(draft[key] ?? '').trim());
    if (missing.length) return setMessage(`필수 항목을 입력하세요: ${missing.join(', ')}`);
    if (!Number.isFinite(draft.price) || (draft.price || 0) <= 0 || !Number.isInteger(draft.stock) || (draft.stock || 0) < 0) return setMessage('판매가와 재고 수량을 확인하세요.');
    if (products.some((p) => p.id !== draft.id && p.sku === draft.sku)) return setMessage('같은 SKU가 이미 있습니다. 기존 중복 SKU는 별도 확인이 필요합니다.');
    setBusy(true);
    try {
      const headers = await authHeader();
      const response = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(draft) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'DB 저장 실패');
      setProducts((old) => creating ? [result.data, ...old] : old.map((p) => p.id === draft.id ? result.data : p));
      setDraft(null);
      setMessage('Supabase에 저장되었습니다. 저장소 사본은 다음 배포 때 동기화됩니다.');
    } catch (error) {
      setMessage(`저장하지 못했습니다: ${error instanceof Error ? error.message : '서버 연결 오류'}`);
    } finally { setBusy(false); }
  }

  async function remove(product: ProductItem) {
    if (!window.confirm(`${product.name} 상품을 삭제하시겠습니까?`)) return;
    setBusy(true);
    setMessage('');
    try {
      const headers = await authHeader();
      const response = await fetch(`/api/products?id=${encodeURIComponent(product.id)}`, { method: 'DELETE', headers });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'DB 삭제 실패');
      setProducts((old) => old.filter((p) => p.id !== product.id));
      setMessage('상품이 삭제되었습니다.');
    } catch (error) {
      setMessage(`삭제하지 못했습니다: ${error instanceof Error ? error.message : '서버 연결 오류'}`);
    } finally { setBusy(false); }
  }

  const textField = (key: keyof ProductItem, title: string, required = false) => draft && (
    <label className={labelClass} key={key}>{title}{required && ' *'}
      <input className={inputClass} value={String(draft[key] ?? '')} onChange={(e) => update(key, e.target.value as never)} />
    </label>
  );
  const numberField = (key: keyof ProductItem, title: string, required = false) => draft && (
    <label className={labelClass} key={key}>{title}{required && ' *'}
      <input className={inputClass} type="number" min="0" step={key === 'export_price_usd' || key === 'gross_weight' || key === 'cbm' ? 'any' : '1'} value={draft[key] == null ? '' : String(draft[key])} onChange={(e) => update(key, (e.target.value === '' ? null : Number(e.target.value)) as never)} />
    </label>
  );

  return <main className="min-h-screen bg-[#0a0a0c] p-6 text-stone-100 md:p-10">
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><Link href="/admin" className="text-xs text-amber-300">← 관리자 홈</Link><h1 className="mt-2 text-3xl font-bold">제품 등록 · 수정</h1><p className="mt-2 text-sm text-stone-400">{source} 기준 {products.length}개 · 컬렉션과 종류를 함께 관리합니다.</p></div>
        <button className="rounded bg-amber-300 px-5 py-2 font-bold text-stone-950" onClick={() => { setCreating(true); setDraft(blankProduct()); setMessage(''); }}>+ 제품 등록</button>
      </div>
      <p className="rounded border border-amber-900/50 bg-amber-950/30 p-3 text-xs text-amber-100">표시 정보는 제조사 원본 라벨과 시험·인증 서류로 확인한 뒤 공개하세요. 인증과 수출 단가는 기본값을 자동 생성하지 않습니다. 이미지가 없으면 Coming Soon을 사용합니다.</p>
      {message && <p role="status" className="rounded border border-stone-700 p-3 text-sm">{message}</p>}
      <input className={inputClass} placeholder="상품명, SKU, 컬렉션, 종류 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="overflow-x-auto rounded border border-stone-800"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-stone-900 text-stone-300"><tr><th className="p-3">제품</th><th className="p-3">컬렉션</th><th className="p-3">제품 종류</th><th className="p-3">SKU</th><th className="p-3">관리</th></tr></thead><tbody>{visible.map((p) => <tr key={p.id} className="border-t border-stone-800"><td className="p-3">{p.name}</td><td className="p-3">{p.collection}</td><td className="p-3">{p.category}</td><td className="p-3 font-mono text-xs">{p.sku}</td><td className="whitespace-nowrap p-3"><button className="mr-3 text-amber-300" onClick={() => { setCreating(false); setDraft({ ...p }); setMessage(''); }}>수정</button><Link className="mr-3 text-emerald-300" href={'/admin/pricing?sku='+encodeURIComponent(p.sku||'')}>가격·최소구매</Link><button className="text-red-300" disabled={busy} onClick={() => remove(p)}>삭제</button></td></tr>)}</tbody></table></div>
    </div>
    {draft && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 p-4"><div className="mx-auto my-6 max-w-4xl rounded-xl border border-stone-700 bg-stone-900 p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold">{creating ? '신규 제품 등록' : '제품 정보 수정'}</h2><button onClick={() => setDraft(null)}>닫기 ✕</button></div>
      {message && <p role="alert" className="mb-4 rounded bg-red-950 p-3 text-sm text-red-200">{message}</p>}
      <div className="space-y-6">
        <section><h3 className="mb-3 border-b border-stone-700 pb-2 font-semibold">1. 분류 · 식별</h3><div className="grid gap-3 md:grid-cols-2">
          <label className={labelClass}>컬렉션 *<select className={inputClass} value={draft.collection} onChange={(e) => { const value = e.target.value; setDraft({ ...draft, collection: value, category: categoriesForCollection(value)[0] }); }}>{PRODUCT_TAXONOMY.map((entry) => <option key={entry.collection}>{entry.collection}</option>)}</select></label>
          <label className={labelClass}>제품 종류 *<select className={inputClass} value={draft.category || ''} onChange={(e) => update('category', e.target.value)}>{categoriesForCollection(draft.collection).map((category) => <option key={category}>{category}</option>)}</select></label>
          {textField('sku', 'SKU', true)}{textField('name', '상품명 (한국어)', true)}{textField('name_en', '상품명 (영어)', true)}{textField('format', '판매 규격', true)}
        </div></section>
        <section><h3 className="mb-3 border-b border-stone-700 pb-2 font-semibold">2. 국내 판매 · 표시 정보</h3><div className="grid gap-3 md:grid-cols-2">
          {numberField('price', '기존 참고 판매가 (견적 미사용)', true)}{numberField('stock', '재고 수량', true)}{textField('brand', '브랜드')}{textField('manufacturer', '제조사', true)}{textField('country_of_origin', '원산지', true)}{textField('net_weight', '내용량', true)}{textField('shelf_life', '소비기한/유통기한', true)}{textField('storage', '보관 방법', true)}{textField('ingredients', '원재료 및 함량', true)}{textField('allergens', '알레르기 유발물질', true)}
        </div><label className={`${labelClass} mt-3`}>상품 설명 *<textarea className={inputClass} rows={3} value={draft.description} onChange={(e) => update('description', e.target.value)} /></label></section>
        <section><h3 className="mb-3 border-b border-stone-700 pb-2 font-semibold">3. 이미지 · 인증</h3><div className="grid gap-3 md:grid-cols-2">{textField('image_url', '대표 이미지 URL (없으면 Coming Soon)')}<label className={labelClass}>인증명 (증빙 확인 후 쉼표로 구분)<input className={inputClass} value={(draft.certifications || []).join(', ')} onChange={(e) => update('certifications', e.target.value.split(',').map((x) => x.trim()).filter(Boolean))} /></label></div><img src={draft.image_url || PLACEHOLDER} alt="제품 이미지 미리보기" className="mt-3 h-28 w-28 rounded object-cover" /></section>
        <section><h3 className="mb-3 border-b border-stone-700 pb-2 font-semibold">4. 도매 · 수출 (확정된 값만 입력)</h3><div className="grid gap-3 md:grid-cols-3">{numberField('carton_qty', '기존 카톤 입수 (검수 참고)')}<p className="text-sm text-amber-200">도매가격·수출가격은 가격·최소구매단위 메뉴에서 검수·승인합니다.</p>{numberField('moq_cartons', '기존 수출 MOQ (검수 참고)')}{textField('hs_code', 'HS Code')}{textField('loading_port', '선적항')}{textField('production_lead_time', '생산 소요기간')}{textField('export_packaging', '수출 포장')}{textField('carton_size', '카톤 치수')}{numberField('gross_weight', '총중량 (kg)')}{numberField('cbm', '부피 (CBM)')}</div></section>
        <div className="flex flex-wrap gap-4 text-sm">{(['is_featured', 'is_todays_deal', 'is_best_seller'] as const).map((key) => <label key={key}><input type="checkbox" checked={Boolean(draft[key])} onChange={(e) => update(key, e.target.checked)} /> {key}</label>)}</div>
        <div className="flex justify-end gap-3 border-t border-stone-700 pt-4"><button onClick={() => setDraft(null)}>취소</button><button disabled={busy} className="rounded bg-amber-300 px-5 py-2 font-bold text-stone-950 disabled:opacity-50" onClick={save}>{busy ? '저장 중…' : 'DB에 저장'}</button></div>
      </div>
    </div></div>}
  </main>;
}
