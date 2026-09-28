'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminAccountPage() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 12 || password !== confirmation) {
      setMessage('12자 이상 비밀번호를 동일하게 입력해 주세요.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPassword('');
    setConfirmation('');
    setMessage(error ? error.message : '비밀번호가 설정되었습니다. 다음 로그인부터 사용할 수 있습니다.');
    setBusy(false);
  }

  return <main className="mx-auto max-w-xl p-8 text-stone-100">
    <h1 className="text-2xl font-bold">관리자 계정</h1>
    <p className="mt-2 text-sm text-stone-400">초대 링크로 로그인한 후 비밀번호를 설정하세요.</p>
    <form onSubmit={save} className="mt-8 space-y-4">
      <label className="block text-sm">새 비밀번호<input required type="password" autoComplete="new-password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded border border-stone-700 bg-stone-950 p-3" /></label>
      <label className="block text-sm">비밀번호 확인<input required type="password" autoComplete="new-password" minLength={12} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1 w-full rounded border border-stone-700 bg-stone-950 p-3" /></label>
      <button disabled={busy} className="rounded bg-[#c5a880] px-5 py-3 font-semibold text-black disabled:opacity-50">{busy ? '저장 중…' : '비밀번호 저장'}</button>
      {message && <p role="status" className="text-sm">{message}</p>}
    </form>
  </main>;
}
