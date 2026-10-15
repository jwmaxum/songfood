'use client';
import { useEffect, useId, useRef, useState } from 'react';
import type { MediaItem } from '@/lib/types';
import { prepareImageUpload, validateSourceImage } from '@/lib/image-upload-client';
export type ImageUploadFieldProps = { label: string; value: string; onChange(url: string): void; disabled?: boolean; onBusyChange?(busy: boolean): void; allowClear?: boolean };
const placeholder = '/images/products/coming-soon.png';
function usableUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value || /[\\\u0000-\u001f\u007f]/.test(value) || /\.svgz?(?:$|[?#])/i.test(value)) return false;
  if (value.startsWith('/')) return !value.startsWith('//');
  try { const url = new URL(value); return !url.username && !url.password && (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname) && ['localhost', '127.0.0.1'].includes(window.location.hostname))); } catch { return false; }
}
export default function ImageUploadField({ label, value, onChange, disabled = false, onBusyChange, allowClear = true }: ImageUploadFieldProps) {
  const feedback = useRef<HTMLParagraphElement>(null), libraryOpener = useRef<HTMLButtonElement>(null);
  const id = useId(), request = useRef<AbortController | null>(null), libraryRequest = useRef<AbortController | null>(null), previewUrl = useRef('');
  const [preview, setPreview] = useState(''), [pending, setPending] = useState<File | null>(null), [stage, setStage] = useState<'idle' | 'preparing' | 'uploading'>('idle');
  const [message, setMessage] = useState(''), [error, setError] = useState(''), [preserveAlpha, setPreserveAlpha] = useState(true);
  const [libraryOpen, setLibraryOpen] = useState(false), [libraryLoading, setLibraryLoading] = useState(false), [libraryError, setLibraryError] = useState('');
  const [items, setItems] = useState<MediaItem[]>([]), [query, setQuery] = useState(''), [limit, setLimit] = useState(60);
  const uploading = stage !== 'idle', blocked = disabled || uploading;
  useEffect(() => () => { request.current?.abort(); libraryRequest.current?.abort(); if (previewUrl.current) URL.revokeObjectURL(previewUrl.current); }, []);
  useEffect(() => {
    if (uploading || (!message && !error)) return;
    const frame = requestAnimationFrame(() => feedback.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [uploading, message, error]);
  function temporaryPreview(file: File | null) {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = file ? URL.createObjectURL(file) : ''; setPreview(previewUrl.current);
  }
  async function upload(file: File) {
    if (blocked || request.current) return;
    setMessage(''); setError('');
    try { validateSourceImage(file); } catch (failure) { setError(failure instanceof Error ? failure.message : '사진 파일을 확인해 주세요.'); return; }
    const controller = new AbortController(); request.current = controller;
    setPending(file); temporaryPreview(file); setStage('preparing'); onBusyChange?.(true);
    try {
      const prepared = await prepareImageUpload(file, { preserveTransparency: preserveAlpha });
      if (controller.signal.aborted) return;
      temporaryPreview(prepared.file); setStage('uploading');
      const form = new FormData(); form.append('file', prepared.file);
      const response = await fetch('/api/upload', { method: 'POST', body: form, credentials: 'same-origin', signal: controller.signal });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) throw new Error(response.status === 401 || response.status === 403 ? '사진 업로드 권한이 없거나 인증이 만료되었습니다. 다시 로그인해 주세요.' : body?.error || '사진 업로드에 실패했습니다. 기존 선택은 유지됩니다.');
      if (body.data?.type !== 'image' || !usableUrl(body.data?.url)) throw new Error('저장된 이미지 주소를 확인하지 못했습니다. 기존 선택은 유지됩니다.');
      if (controller.signal.aborted) return;
      onChange(body.data.url); setPending(null); temporaryPreview(null);
      setMessage('업로드 완료 — 미디어에 저장했습니다. 현재 편집 내용을 저장해야 화면에 반영됩니다.');
    } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : '사진 업로드에 실패했습니다. 기존 선택은 유지됩니다.'); }
    finally { if (request.current === controller) request.current = null; if (!controller.signal.aborted) setStage('idle'); onBusyChange?.(false); }
  }
  async function openLibrary() {
    if (blocked) return;
    setLibraryOpen(true); setLibraryLoading(true); setLibraryError(''); setQuery(''); setLimit(60);
    libraryRequest.current?.abort(); const controller = new AbortController(); libraryRequest.current = controller;
    try {
      const response = await fetch('/api/media?mode=admin&type=image', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success || !Array.isArray(body.data)) throw new Error(response.status === 401 || response.status === 403 ? '이미지 목록을 볼 권한이 없거나 인증이 만료되었습니다. 다시 로그인해 주세요.' : '기존 이미지를 불러오지 못했습니다. 다시 시도해 주세요.');
      if (!controller.signal.aborted) setItems(body.data.filter((item: MediaItem) => item.type === 'image' && usableUrl(item.url)));
    } catch (failure) { if (!controller.signal.aborted) setLibraryError(failure instanceof Error ? failure.message : '이미지 목록 연결에 실패했습니다.'); }
    finally { if (!controller.signal.aborted) setLibraryLoading(false); }
  }
  function closeLibrary() { libraryRequest.current?.abort(); setLibraryOpen(false); requestAnimationFrame(() => libraryOpener.current?.focus()); }
  const matches = items.filter(item => String(item.name || '').toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return <section aria-label={label} aria-busy={uploading} className="min-w-0 space-y-3 rounded-xl border border-stone-600 p-3">
    <p className="font-semibold text-stone-100">{label}</p>
    <div className="flex flex-wrap items-start gap-3">
      <figure><img src={usableUrl(value) ? value : placeholder} alt={label + ' 현재 선택 이미지'} className="h-28 w-28 rounded border border-stone-600 object-contain" /><figcaption className="mt-1 max-w-36 text-xs text-stone-300">현재 선택 이미지{!value ? ' 없음' : ''}</figcaption></figure>
      {preview && <figure><img src={preview} alt={label + ' 선택한 파일 미리보기'} className="h-28 w-28 rounded border border-amber-400 object-contain" /><figcaption className="mt-1 max-w-40 text-xs text-amber-200">임시 미리보기 · 아직 저장 완료 전</figcaption></figure>}
    </div>
    <label className="block text-sm text-stone-200" htmlFor={id + '-file'}>{label} 파일 선택<input id={id + '-file'} type="file" accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif" disabled={blocked} className="mt-1 block min-h-11 w-full min-w-0 rounded border border-stone-500 bg-stone-950 p-2 text-sm" onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (file) void upload(file); }} /></label>
    <label className="inline-flex min-h-11 items-center gap-2 text-sm text-stone-200"><input type="checkbox" checked={preserveAlpha} disabled={blocked} onChange={event => setPreserveAlpha(event.target.checked)} />{label} 투명 배경 유지 (PNG)</label>
    <p className="text-xs leading-5 text-stone-300">원본 20MB 이하 · JPEG/PNG/WebP/GIF. 긴 변 1,400px·2MB 이하 JPEG/PNG로 변환합니다. 투명 배경을 끄면 흰색 배경 JPEG로 저장하며 GIF는 첫 장만 사용합니다.</p>
    <div className="flex flex-wrap gap-2">
      <button ref={libraryOpener} type="button" disabled={blocked} aria-label={label + ' 기존 이미지 선택'} className="min-h-11 rounded border border-stone-400 px-3 text-sm disabled:opacity-40" onClick={() => void openLibrary()}>기존 이미지 선택</button>
      {pending && error && <button type="button" disabled={blocked} aria-label={label + ' 업로드 다시 시도'} className="min-h-11 rounded border border-amber-300 px-3 text-sm text-amber-200 disabled:opacity-40" onClick={() => void upload(pending)}>업로드 다시 시도</button>}
      {allowClear && (value || pending) && <button type="button" disabled={blocked} aria-label={label + ' 제외'} className="min-h-11 rounded border border-stone-400 px-3 text-sm disabled:opacity-40" onClick={() => { onChange(''); setPending(null); temporaryPreview(null); setError(''); setMessage('선택에서 제외했습니다. 업로드 원본은 미디어에 보존됩니다.'); }}>사진 제외</button>}
    </div>
    {uploading && <div role="status" className="space-y-2 text-sm text-amber-200"><p>{stage === 'preparing' ? '사진을 확인하고 크기를 줄이는 중…' : '미디어에 사진을 업로드하는 중…'}</p><progress aria-label={label + ' 업로드 진행'} className="w-full" /></div>}
    {error && <p ref={feedback} tabIndex={-1} role="alert" className="break-words text-sm text-red-200">{error}</p>}
    {message && <p ref={feedback} tabIndex={-1} role="status" className="break-words text-sm text-amber-200">{message}</p>}
    {value && <details><summary className="flex min-h-11 cursor-pointer items-center text-xs text-stone-300">현재 이미지 주소 · 복사</summary><input readOnly aria-label={label + ' 현재 이미지 주소'} value={value} className="min-h-11 w-full min-w-0 rounded border border-stone-600 bg-stone-950 px-2 text-xs" onFocus={event => event.currentTarget.select()} /><button type="button" disabled={blocked} className="min-h-11 px-2 text-xs underline" onClick={() => { if (!navigator.clipboard?.writeText) { setError('주소를 선택해 직접 복사해 주세요.'); return; } void navigator.clipboard.writeText(value).then(() => setMessage('이미지 주소를 복사했습니다.')).catch(() => setError('주소를 선택해 직접 복사해 주세요.')); }}>주소 복사</button></details>}
    {libraryOpen && <section aria-label={label + ' 기존 이미지 목록'} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); event.preventDefault(); closeLibrary(); } }} className="space-y-3 rounded border border-stone-500 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">기존 이미지 선택</p><button type="button" className="min-h-11 rounded border px-3 text-sm" onClick={closeLibrary}>이미지 목록 닫기</button></div>
      <label className="block text-sm" htmlFor={id + '-search'}>이미지 파일명 검색<input id={id + '-search'} value={query} onChange={event => { setQuery(event.target.value); setLimit(60); }} className="mt-1 min-h-11 w-full min-w-0 rounded border border-stone-500 bg-stone-950 px-2" /></label>
      {libraryLoading ? <p role="status" className="text-sm">기존 이미지 불러오는 중…</p> : libraryError ? <p role="alert" className="text-sm text-red-200">{libraryError}</p> : <><p className="text-xs text-stone-300">{matches.length}개 이미지 · 선택하면 현재 편집 내용에만 적용됩니다.</p><ul className="grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">{matches.slice(0, limit).map(item => <li key={item.id} className="min-w-0"><button type="button" disabled={blocked} aria-label={item.name + ' 이미지 선택'} className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded border border-stone-500 p-2 text-left text-xs disabled:opacity-40" onClick={() => { onChange(item.url); setPending(null); temporaryPreview(null); setError(''); setMessage('기존 이미지를 선택했습니다. 현재 편집 내용을 저장해 주세요.'); closeLibrary(); }}><img src={item.url} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded object-contain" /><span className="break-all">{item.name}</span></button></li>)}</ul>{matches.length > limit && <button type="button" className="min-h-11 rounded border px-3 text-sm" onClick={() => setLimit(old => old + 60)}>이미지 더 보기</button>}</>}
    </section>}
  </section>;
}
