'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { ProductItem } from '@/lib/types';
import { PRODUCT_DRAFT_FIELDS, type ProductSourceNotes as SourceNotes, type ProductDraft as DraftRecord } from '@/lib/product-drafts/types';
import { PRODUCT_TAXONOMY, categoriesForCollection, isValidProductCategory } from '@/lib/product-taxonomy';

type Editor = {
  saved: DraftRecord | null; productId: string | null; base: ProductItem | null;
  baseHash: string | null; data: Record<string, unknown>; notes: SourceNotes;
  dirty: boolean; conflict: boolean;
};
const notesBlank = (): SourceNotes => ({ specification: '', label: '', sales_terms: '' });
const PLACEHOLDER = '/images/products/coming-soon.png';
const inputClass = 'min-h-11 w-full min-w-0 rounded border border-stone-600 bg-stone-950 px-3 py-2 text-white outline-none focus:border-amber-300';
const labelClass = 'block min-w-0 space-y-1 text-sm text-stone-200';
const sourceLabels = { specification: '규격서 출처·확인 메모', label: '원본 라벨 출처·확인 메모', sales_terms: '판매조건 출처·확인 메모' } as const;
const fromRecord = (saved: DraftRecord): Editor => ({
  saved, productId: saved.product_id, base: saved.base_product, baseHash: saved.base_hash,
  data: { ...saved.data }, notes: { ...notesBlank(), ...saved.source_notes }, dirty: false, conflict: false,
});

export default function ProductManagerV2() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [search, setSearch] = useState(''), [message, setMessage] = useState(''), [editorMessage, setEditorMessage] = useState('');
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true);
  const [reason, setReason] = useState('관리자 상품 자료 작성');
  const [comparison, setComparison] = useState<{ product: ProductItem; base_hash: string } | null>(null);
  const modal = useRef<HTMLDivElement>(null), opener = useRef<HTMLElement | null>(null), createButton = useRef<HTMLButtonElement>(null);
  const editorOpen = !!editor;

  async function load(signal?: AbortSignal) {
    try {
      const [productResponse, draftResponse] = await Promise.all([
        fetch('/api/products?mode=admin', { cache: 'no-store', signal }),
        fetch('/api/admin/product-drafts', { cache: 'no-store', signal }),
      ]);
      const [productBody, draftBody] = await Promise.all([productResponse.json(), draftResponse.json()]);
      if (!productResponse.ok || !Array.isArray(productBody.data)) throw new Error('서버 상품 목록을 조회하지 못했습니다.');
      if (!draftResponse.ok || !Array.isArray(draftBody.drafts)) throw new Error(draftBody.error || '비공개 초안 목록을 조회하지 못했습니다.');
      if (!signal?.aborted) { setProducts(productBody.data); setDrafts(draftBody.drafts); }
    } catch (error) { if (!signal?.aborted) setMessage(error instanceof Error ? error.message : '목록 연결에 실패했습니다.'); }
    finally { if (!signal?.aborted) setLoading(false); }
  }
  useEffect(() => { const controller = new AbortController(); void Promise.resolve().then(() => { if (!controller.signal.aborted) void load(controller.signal); }); return () => controller.abort(); }, []);
  useEffect(() => {
    if (!editorOpen) return;
    const before = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => (modal.current?.querySelector<HTMLElement>('#product-editor-feedback') || modal.current?.querySelector<HTMLElement>('h2'))?.focus());
    return () => { document.body.style.overflow = before; cancelAnimationFrame(frame); };
  }, [editorOpen]);

  useEffect(() => {
    if (!editorOpen || !editorMessage || busy) return;
    const frame = requestAnimationFrame(() => modal.current?.querySelector<HTMLElement>('#product-editor-feedback')?.focus());
    return () => cancelAnimationFrame(frame);
  }, [editorOpen, editorMessage, busy]);

  const visible = useMemo(() => products.filter(p =>
    [p.name, p.name_en, p.sku, p.collection, p.category].filter(Boolean).join(' ').toLocaleLowerCase().includes(search.toLocaleLowerCase())
  ), [products, search]);
  const pendingDrafts = drafts.filter(item => item.status === 'draft');
  const value = (key: string): unknown => editor && Object.hasOwn(editor.data, key) ? editor.data[key] : editor?.base?.[key as keyof ProductItem];
  const asText = (key: string) => String(value(key) ?? '');
  const missingIdentity = editor ? [
    !asText('name').trim() ? '상품명' : '',
    !asText('sku').trim() ? 'SKU' : '',
    !isValidProductCategory(asText('collection'), asText('category')) ? '대분류·제품 종류' : '',
  ].filter(Boolean) : [];

  function update(key: string, next: unknown) {
    setEditor(old => old ? { ...old, data: { ...old.data, [key]: next }, dirty: true } : old);
  }
  function show(next: Editor) {
    if (!editor) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setEditor(next); setComparison(null); setEditorMessage(''); setReason('관리자 상품 자료 작성');
  }
  function focusOpener() { requestAnimationFrame(() => { if (opener.current?.isConnected) opener.current.focus(); else createButton.current?.focus(); }); }
  function close() {
    if (busy) return;
    if (editor?.dirty && !window.confirm('아직 임시저장하지 않은 입력이 있습니다. 저장하지 않고 닫을까요?')) return;
    setEditor(null); setComparison(null); setEditorMessage(''); focusOpener();
  }
  async function resume(id: string) {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/admin/product-drafts?id=' + encodeURIComponent(id), { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok || !body.draft) throw new Error(body.error || '초안을 불러오지 못했습니다.');
      if (body.draft.status !== 'draft') { setEditor(null); setComparison(null); setMessage('이미 카탈로그에 반영된 초안입니다. 최신 상품 목록에서 새 수정 초안을 열어 주세요.'); await load(); focusOpener(); return; }
      show(fromRecord(body.draft));
    } catch (error) { setMessage(error instanceof Error ? error.message : '초안을 불러오지 못했습니다.'); }
    finally { setBusy(false); }
  }
  async function edit(product: ProductItem) {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/admin/product-drafts?product_id=' + encodeURIComponent(product.id), { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok || !body.product || !body.base_hash) throw new Error(body.error || '최신 상품 원본을 불러오지 못했습니다.');
      show(body.draft ? fromRecord(body.draft) : {
        saved: null, productId: product.id, base: body.product, baseHash: body.base_hash,
        data: {}, notes: notesBlank(), dirty: false, conflict: false,
      });
    } catch (error) { setMessage(error instanceof Error ? error.message : '상품을 불러오지 못했습니다.'); }
    finally { setBusy(false); }
  }
  async function save(publish = false, rebase = false) {
    if (!editor || busy || (editor.conflict && !rebase) || (rebase && (!comparison || !editor.saved || !editor.productId))) return;
    if (reason.trim().length < 3) { setEditorMessage('작성·변경 사유를 3글자 이상 적어 주세요.'); return; }
    if (publish && (!editor.saved || editor.dirty || missingIdentity.length)) {
      setEditorMessage('입력 내용을 먼저 임시저장하고 카탈로그 최소 항목을 확인해 주세요.'); return;
    }
    setBusy(true); setEditorMessage('');
    try {
      const payload = publish ? { id: editor.saved!.id, revision: editor.saved!.revision, reason } : {
        ...(editor.saved ? { id: editor.saved.id } : {}),
        product_id: editor.productId, revision: editor.saved?.revision || 0, data: editor.data,
        source_notes: editor.notes, reason, ...(rebase ? { rebase: true, base_hash: comparison!.base_hash } : editor.baseHash ? { base_hash: editor.baseHash } : {}),
      };
      const response = await fetch('/api/admin/product-drafts', {
        method: publish ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (response.status === 409) {
        setEditor(old => old ? { ...old, conflict: true } : old);
        throw new Error(body.error || '다른 직원의 변경 또는 원본 변경이 있습니다. 내 입력은 그대로 유지됩니다. 최신 자료를 다시 불러와 대조해 주세요.');
      }
      if (!response.ok || !body.success || !body.draft) throw new Error(body.error || '저장하지 못했습니다.');
      if (publish && !body.product) throw new Error('반영 결과를 확인하지 못했습니다. 최신 저장 자료와 카탈로그를 다시 확인해 주세요.');
      setDrafts(old => [body.draft, ...old.filter(item => item.id !== body.draft.id)]);
      if (publish && body.product) {
        setProducts(old => [body.product, ...old.filter(item => item.id !== body.product.id)]);
        setEditor(null); setMessage('카탈로그에 반영했습니다. 가격 승인·표시 검수·국내/해외 출시 승인은 별도로 진행하세요.');
        focusOpener();
      } else {
        setEditor(fromRecord(body.draft)); setComparison(null); setEditorMessage(rebase ? '최신 원본을 대조한 기준으로 비공개 초안을 다시 저장했습니다. 카탈로그는 변경하지 않았습니다.' : '비공개 초안을 DB에 임시저장했습니다. 나중에 계속 작성할 수 있습니다. 카탈로그는 변경하지 않았습니다.');
      }
    } catch (error) { setEditorMessage(error instanceof Error ? error.message : '서버 연결 오류로 저장하지 못했습니다. 입력은 유지됩니다.'); }
    finally { setBusy(false); }
  }
  async function compareOriginal() {
    if (!editor?.productId || busy) return;
    setBusy(true);
    try {
      const response = await fetch('/api/admin/product-drafts?product_id=' + encodeURIComponent(editor.productId), { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok || !body.product || !body.base_hash) throw new Error(body.error || '현재 상품 원본을 조회하지 못했습니다.');
      setComparison({ product: body.product, base_hash: body.base_hash });
      setReason('최신 상품 원본 대조 후 초안 재저장');
    } catch (error) { setEditorMessage(error instanceof Error ? error.message : '현재 원본 조회 실패'); }
    finally { setBusy(false); }
  }
  async function reloadEditor() {
    if (!editor || busy || !window.confirm('현재 입력을 최신 저장 자료로 교체합니다. 필요한 미저장 내용을 확인한 뒤 계속할까요?')) return;
    if (editor.saved) {
      setBusy(true);
      try {
        const response = await fetch('/api/admin/product-drafts?id=' + encodeURIComponent(editor.saved.id), { cache: 'no-store' });
        const body = await response.json();
        if (!response.ok || !body.draft) throw new Error(body.error || '최신 초안을 불러오지 못했습니다.');
        if (body.draft.status !== 'draft') { setEditor(null); setComparison(null); setMessage('다른 직원이 이미 카탈로그에 반영한 초안입니다. 최신 상품 목록에서 새 수정 초안을 열어 주세요.'); await load(); focusOpener(); return; }
        setEditor(fromRecord(body.draft)); setComparison(null); setEditorMessage('최신 초안을 불러왔습니다. 상품 원본도 변경되었다면 새 수정 초안에서 다시 대조해야 합니다.');
      } catch (error) { setEditorMessage(error instanceof Error ? error.message : '최신 자료 조회 실패'); }
      finally { setBusy(false); }
    } else if (editor.base) { await edit(editor.base); }
  }
  async function remove(product: ProductItem) {
    if (!window.confirm(product.name + ' 상품을 삭제하시겠습니까? 기존 거래 및 참조가 있으면 서버에서 제한될 수 있습니다.')) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/products?id=' + encodeURIComponent(product.id), { method: 'DELETE' }), body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || '상품을 삭제하지 못했습니다.');
      setProducts(old => old.filter(item => item.id !== product.id)); setMessage('상품을 삭제했습니다.');
    } catch (error) { setMessage(error instanceof Error ? error.message : '삭제 실패'); }
    finally { setBusy(false); }
  }
  const textField = (key: string, title: string, max = 500) => <label htmlFor={'product-' + key} className={labelClass} key={key}>{title}<input id={'product-' + key} className={inputClass} maxLength={max} value={asText(key)} onChange={event => update(key, event.target.value)} /></label>;
  const numberField = (key: string, title: string, fractional = false) => <label htmlFor={'product-' + key} className={labelClass} key={key}>{title}<input id={'product-' + key} className={inputClass} type="number" min="0" step={fractional ? 'any' : '1'} value={asText(key)} onChange={event => update(key, event.target.value === '' ? null : Number(event.target.value))} /></label>;
  const arrayText = (key: string) => Array.isArray(value(key)) ? (value(key) as string[]).join(', ') : '';
  const display = (item: unknown) => item === null || item === undefined || item === '' ? '(빈칸)' : typeof item === 'object' ? JSON.stringify(item) : String(item);
  const compareKeys = comparison && editor ? PRODUCT_DRAFT_FIELDS.filter(key => Object.hasOwn(editor.data, key) || JSON.stringify(editor.base?.[key as keyof ProductItem]) !== JSON.stringify(comparison.product[key as keyof ProductItem])) : [];
  return <main className="min-h-screen min-w-0 bg-[#0a0a0c] p-4 text-stone-100 md:p-10">
    <div className="mx-auto min-w-0 max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><Link href="/admin" className="inline-flex min-h-11 items-center text-sm text-amber-300">← 관리자 홈</Link><h1 className="text-2xl font-bold sm:text-3xl">제품 등록 · 수정</h1><p className="mt-2 text-sm text-stone-300">카탈로그 {products.length}개 · 비공개 작업 초안 {pendingDrafts.length}개</p></div>
        <button ref={createButton} disabled={busy || loading} className="min-h-11 rounded bg-amber-300 px-5 py-2 font-bold text-stone-950 disabled:opacity-40" onClick={() => show({ saved: null, productId: null, base: null, baseHash: null, data: {}, notes: notesBlank(), dirty: false, conflict: false })}>+ 상품 초안 만들기</button>
      </div>
      <p className="rounded border border-amber-900/50 bg-amber-950/30 p-4 text-sm leading-6 text-amber-100">확인한 항목부터 입력해 비공개 초안으로 저장하세요. 빈칸·미확정 값은 그대로 둘 수 있습니다. 카탈로그 반영과 판매 출시는 별도이며 실제 거래가격·입수·MOQ는 가격 관리에서 검수·승인합니다.</p>
      {message && <p role="status" className="rounded border border-stone-600 p-3 text-sm">{message}</p>}
      <button disabled={busy || loading} onClick={() => { setMessage(''); setLoading(true); void load(); }} className="min-h-11 rounded border border-stone-600 px-4 text-sm">{loading ? '목록 불러오는 중…' : '목록 새로고침'}</button>
      <section aria-labelledby="product-drafts-title" className="space-y-3 rounded-xl border border-stone-700 p-4">
        <h2 id="product-drafts-title" className="text-lg font-bold">비공개 작업 초안</h2><p className="text-sm text-stone-300">규격서·라벨·판매조건의 출처 메모는 담당 직원만 볼 수 있습니다. 미반영 초안은 고객 검색·상품 API에 노출되지 않습니다.</p>
        {!pendingDrafts.length && <p className="text-sm text-stone-400">저장된 작업 초안이 없습니다.</p>}
        <ul className="grid gap-3 md:grid-cols-2">{pendingDrafts.map(item => <li key={item.id} className="min-w-0 space-y-2 rounded border border-stone-600 p-3">
          <p className="break-words font-semibold">{String(item.data.name || item.base_product?.name || '이름 미입력 초안')}</p>
          <p className="text-xs text-amber-200">검수 전 · 비공개 · {item.product_id ? '기존 상품 수정' : '신규 상품'} · 저장 버전 {item.revision}</p>
          <button disabled={busy} onClick={() => void resume(item.id)} className="min-h-11 rounded border border-amber-400 px-4 text-sm text-amber-200">계속 작성</button>
        </li>)}</ul>
      </section>
      <label className={labelClass} htmlFor="product-list-search">카탈로그 상품 검색<input id="product-list-search" className={inputClass} placeholder="상품명, SKU, 대분류, 제품 종류" value={search} onChange={event => setSearch(event.target.value)} /></label>
      <div className="max-w-full overflow-x-auto rounded border border-stone-700"><table className="w-full min-w-[750px] text-left text-sm"><caption className="sr-only">현재 카탈로그 상품과 수정 메뉴</caption><thead className="bg-stone-900 text-stone-200"><tr><th scope="col" className="p-3">제품</th><th scope="col" className="p-3">대분류</th><th scope="col" className="p-3">제품 종류</th><th scope="col" className="p-3">SKU</th><th scope="col" className="p-3">관리</th></tr></thead><tbody>{visible.map(product => <tr key={product.id} className="border-t border-stone-700"><td className="p-3">{product.name}</td><td className="p-3">{product.collection}</td><td className="p-3">{product.category}</td><td className="p-3 font-mono text-xs">{product.sku}</td><td className="whitespace-nowrap p-3"><button disabled={busy} onClick={() => void edit(product)} className="mr-3 min-h-11 text-amber-300" aria-label={product.name + ' 수정'}>수정 초안</button><Link className="mr-3 inline-flex min-h-11 items-center text-emerald-300" href={'/admin/pricing?sku=' + encodeURIComponent(product.sku || '')}>가격·최소구매</Link><button className="min-h-11 text-red-300" disabled={busy} onClick={() => void remove(product)} aria-label={product.name + ' 삭제'}>삭제</button></td></tr>)}</tbody></table></div>
      <Link href="/admin/releases" className="inline-flex min-h-11 items-center text-sm text-emerald-300 underline">국내·해외 상품 출시 검수</Link>
    </div>
    {editor && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 p-3 sm:p-4" onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'Tab') {
        const controls = modal.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]');
        if (!controls?.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement?.id === 'product-editor-title')) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }}>
      <div ref={modal} role="dialog" aria-modal="true" aria-labelledby="product-editor-title" className="mx-auto my-3 min-w-0 max-w-4xl rounded-xl border border-stone-600 bg-stone-900 p-4 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3"><div><h2 id="product-editor-title" tabIndex={-1} className="text-xl font-bold">{editor.productId ? '기존 상품 수정 초안' : '새 상품 비공개 초안'}</h2><p className="mt-2 text-xs text-amber-200">검수 전 · 비공개 · {editor.saved ? '저장 버전 ' + editor.saved.revision : '아직 저장하지 않음'}{editor.dirty ? ' · 미저장 변경 있음' : ''}</p></div><button disabled={busy} className="min-h-11 shrink-0 rounded border border-stone-500 px-3 text-sm" onClick={close}>닫기</button></div>
        <p className="mb-4 text-sm leading-6 text-stone-200">어느 항목이든 입력한 부분부터 임시저장할 수 있습니다. 빈칸을 임의 수치나 예시 값으로 채우지 마세요. 기존 상품은 바꾼 필드만 저장하고, 카탈로그 반영 전에는 현재 공개 자료를 변경하지 않습니다.</p>
        {editorMessage && <p id="product-editor-feedback" tabIndex={-1} role="status" className="mb-4 rounded border border-amber-700 bg-amber-950/30 p-3 text-sm text-amber-100">{editorMessage}</p>}
        {editor.conflict && <div role="alert" className="mb-4 space-y-3 rounded border border-red-500 p-3 text-sm"><p>다른 변경과 충돌했습니다. 내 입력은 보존되어 있습니다. 최신 자료를 확인한 뒤 다시 작성해야 합니다.</p><div className="flex flex-wrap gap-2"><button disabled={busy} className="min-h-11 rounded border px-4" onClick={() => void reloadEditor()}>최신 저장 자료 다시 불러오기</button>{editor.productId && editor.saved && <button disabled={busy} className="min-h-11 rounded border px-4" onClick={() => void compareOriginal()}>현재 상품 원본과 대조</button>}</div></div>}
        {comparison && <section aria-label="상품 원본 변경 대조" className="mb-5 space-y-3 rounded border border-amber-400 p-4 text-sm">
          <h3 className="font-bold">저장 당시 원본 · 현재 카탈로그 · 내 입력 대조</h3>
          <p>현재 카탈로그를 기준으로 내 변경 필드만 다시 적용할 수 있습니다. 다른 직원이 저장한 초안 버전과도 충돌하면 최신 초안을 먼저 불러오세요. 아래 버튼은 비공개 초안만 다시 저장합니다.</p>
          <dl className="space-y-3">{compareKeys.map(key => <div key={key} className="min-w-0 rounded border border-stone-600 p-3"><dt className="font-bold">{key}</dt><dd className="break-words">저장 당시: {display(editor.base?.[key as keyof ProductItem])}</dd><dd className="break-words">현재 상품: {display(comparison.product[key as keyof ProductItem])}</dd><dd className="break-words text-amber-200">재적용할 값: {display(Object.hasOwn(editor.data, key) ? editor.data[key] : comparison.product[key as keyof ProductItem])}</dd></div>)}</dl>
          <button disabled={busy} className="min-h-11 rounded border border-amber-300 px-4 font-bold text-amber-200" onClick={() => void save(false, true)}>대조한 현재 원본 기준으로 초안 재저장</button>
        </section>}
        <fieldset disabled={busy} className="min-w-0 space-y-6">
          <section><h3 className="mb-3 border-b border-stone-600 pb-2 font-semibold">1. 분류 · 식별</h3><div className="grid gap-3 md:grid-cols-2">
            <label className={labelClass} htmlFor="product-collection">대분류<select id="product-collection" className={inputClass} value={asText('collection')} onChange={event => { update('collection', event.target.value); update('category', ''); }}><option value="">아직 선택하지 않음</option>{PRODUCT_TAXONOMY.map(group => <option key={group.collection}>{group.collection}</option>)}</select></label>
            <label className={labelClass} htmlFor="product-category">제품 종류<select id="product-category" className={inputClass} value={asText('category')} onChange={event => update('category', event.target.value)}><option value="">아직 선택하지 않음</option>{categoriesForCollection(asText('collection')).map(category => <option key={category}>{category}</option>)}</select></label>
            {textField('sku', 'SKU', 100)}{textField('name', '상품명 (한국어)', 200)}{textField('name_en', '상품명 (영어)', 200)}{textField('format', '판매 규격')}
          </div></section>
          <section><h3 className="mb-3 border-b border-stone-600 pb-2 font-semibold">2. 상품 · 표시 정보</h3><div className="grid gap-3 md:grid-cols-2">
            {textField('brand', '브랜드')}{textField('manufacturer', '제조사')}{textField('country_of_origin', '원산지')}{textField('net_weight', '내용량')}{textField('shelf_life', '소비기한/유통기한')}{textField('storage', '보관 방법')}{textField('ingredients', '원재료 및 함량', 6000)}{textField('allergens', '알레르기 유발물질', 3000)}
          </div><label className={labelClass + ' mt-3'} htmlFor="product-description">상품 설명<textarea id="product-description" className={inputClass} maxLength={6000} rows={3} value={asText('description')} onChange={event => update('description', event.target.value)} /></label></section>
          <section><h3 className="mb-3 border-b border-stone-600 pb-2 font-semibold">3. 이미지 · 인증</h3><div className="grid gap-3 md:grid-cols-2">
            {textField('image_url', '대표 이미지 URL (없으면 기본 대기 이미지)', 2000)}
            <label className={labelClass} htmlFor="product-certifications">인증명 (증빙 확인 후 쉼표로 구분)<input id="product-certifications" className={inputClass} maxLength={1000} value={arrayText('certifications')} onChange={event => update('certifications', event.target.value.split(',').map(item => item.trim()).filter(Boolean))} /></label>
          </div><img src={asText('image_url') || PLACEHOLDER} alt="제품 이미지 미리보기" className="mt-3 h-28 w-28 rounded object-cover" /></section>
          <section><h3 className="mb-3 border-b border-stone-600 pb-2 font-semibold">4. 포장 · 도매 · 수출 (확인한 값만)</h3><p className="mb-3 text-sm text-amber-200">실제 거래가격·VAT·입수·최소구매단위·수출 MOQ·FOB 비용은 가격 관리에서 별도로 검수·승인합니다. 아래 기존 참고 값은 거래 계산에 사용하지 않습니다.</p><div className="grid gap-3 md:grid-cols-3">
            {numberField('price', '기존 참고 판매가 (선택)', true)}{numberField('stock', '참고 재고 수량 (선택)')}{numberField('carton_qty', '기존 카톤 입수 (검수 참고)')}{numberField('moq_cartons', '기존 수출 MOQ (검수 참고)')}{textField('hs_code', 'HS Code')}{textField('loading_port', '선적항')}{textField('production_lead_time', '생산 소요기간')}{textField('export_packaging', '수출 포장')}{textField('carton_size', '카톤 치수')}{numberField('gross_weight', '총중량 (kg)', true)}{numberField('cbm', '부피 (CBM)', true)}
          </div><label className={labelClass + ' mt-3'} htmlFor="product-target_markets">등록 대상 국가·지역 (쉼표로 구분)<input id="product-target_markets" className={inputClass} maxLength={1000} value={arrayText('target_markets')} onChange={event => update('target_markets', event.target.value.split(',').map(item => item.trim()).filter(Boolean))} /></label></section>
          <section className="space-y-3 rounded-xl border border-stone-600 p-4"><h3 className="font-semibold">5. 비공개 기준자료 메모</h3><p className="text-sm text-stone-300">확인한 문서 이름·발행처·확인일과 남은 질문을 기록하세요. 고객 개인정보·비밀번호·API 키를 입력하지 마세요. 이 메모는 공개 상품 설명으로 복사하지 않습니다.</p>
            {(Object.keys(sourceLabels) as (keyof SourceNotes)[]).map(key => <label key={key} className={labelClass} htmlFor={'source-' + key}>{sourceLabels[key]}<textarea id={'source-' + key} className={inputClass} rows={3} maxLength={3000} value={editor.notes[key]} onChange={event => setEditor(old => old ? { ...old, notes: { ...old.notes, [key]: event.target.value }, dirty: true } : old)} /></label>)}
          </section>
          <div className="flex flex-wrap gap-3 text-sm">{(['is_featured', 'is_todays_deal', 'is_best_seller'] as const).map(key => <label key={key} className="inline-flex min-h-11 items-center gap-2"><input type="checkbox" checked={Boolean(value(key))} onChange={event => update(key, event.target.checked)} />{key === 'is_featured' ? '관리자 추천' : key === 'is_todays_deal' ? '특가 표시 (운영 근거 확인)' : '베스트셀러 표시 (운영 근거 확인)'}</label>)}</div>
          <label className={labelClass} htmlFor="product-reason">작성·변경 사유<input id="product-reason" className={inputClass} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /><span className="block text-xs text-stone-300">저장·반영 이력에 남기는 사유입니다. 상품 필수정보를 대신하지 않습니다.</span></label>
        </fieldset>
        <section className="mt-6 space-y-3 border-t border-stone-600 pt-4">
          <p className="text-sm text-stone-200">{missingIdentity.length ? '카탈로그 반영 전 입력할 최소 항목: ' + missingIdentity.join(', ') + '. 임시저장은 가능합니다.' : '카탈로그 최소 식별정보가 입력되었습니다. 표시·가격·판매 출시 검수는 별도로 필요합니다.'}</p>
          <div className="flex flex-wrap justify-end gap-3"><button disabled={busy} className="min-h-11 rounded border border-stone-500 px-4 text-sm" onClick={close}>닫기</button><button disabled={busy || editor.conflict} className="min-h-11 rounded bg-amber-300 px-4 font-bold text-stone-950 disabled:opacity-40" onClick={() => void save(false)}>{busy ? '처리 중…' : '비공개 임시저장'}</button><button disabled={busy || editor.conflict || !editor.saved || editor.dirty || !!missingIdentity.length} className="min-h-11 rounded border border-emerald-400 px-4 font-bold text-emerald-200 disabled:opacity-40" onClick={() => void save(true)}>카탈로그에 반영</button></div>
          <p className="text-xs leading-6 text-stone-300">카탈로그에 반영하면 상품 기본자료가 고객에게 보일 수 있습니다. 비공개 출처 메모는 제외됩니다. 이 작업은 가격 승인·판매 출시 승인이나 인증·수출 적합성 확인이 아닙니다.</p>
        </section>
      </div>
    </div>}
  </main>;
}
