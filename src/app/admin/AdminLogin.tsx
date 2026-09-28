'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

async function establishSession(accessToken: string): Promise<boolean> {
  const response = await fetch('/api/admin/session', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } });
  return response.ok;
}

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session && await establishSession(data.session.access_token) && active) router.refresh();
    }).catch(() => {});
    return () => { active = false; };
  }, [router]);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setPassword('');
    if (authError || !data.session) {
      setError(authError?.message || '로그인에 실패했습니다.');
    } else if (await establishSession(data.session.access_token)) {
      router.refresh();
    } else {
      await supabase.auth.signOut();
      setError('활성 직원 권한이 확인되지 않았습니다.');
    }
    setBusy(false);
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#0a0a0c] p-4 text-stone-100">
    <form onSubmit={signIn} className="w-full max-w-md space-y-5 rounded-xl border border-stone-800 bg-[#111118] p-8">
      <div><h1 className="text-2xl font-bold">송영민푸드 관리자 로그인</h1><p className="mt-2 text-sm text-stone-400">초대받은 직원 계정으로 로그인하세요.</p></div>
      <label className="block text-sm">이메일<input required type="email" autoComplete="username" className="mt-1 w-full rounded border border-stone-700 bg-stone-950 p-3" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label className="block text-sm">비밀번호<input required type="password" autoComplete="current-password" className="mt-1 w-full rounded border border-stone-700 bg-stone-950 p-3" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <button disabled={busy} className="w-full rounded bg-[#c5a880] p-3 font-bold text-black disabled:opacity-50">{busy ? '확인 중…' : '로그인'}</button>
      <Link className="block text-center text-sm text-stone-400" href="/">사이트로 돌아가기</Link>
    </form>
  </main>;
}
