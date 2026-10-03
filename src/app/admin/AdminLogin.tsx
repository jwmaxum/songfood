'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
export default function AdminLogin() {
  const router = useRouter();
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:form.get('email'),password:form.get('password'),audience:'staff'})});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '로그인에 실패했습니다.');
      router.refresh();
    } catch(e) { setError(e instanceof Error ? e.message : '서버에 연결하지 못했습니다.'); }
    finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-[#0a0a0c] p-4 text-stone-100">
    <form onSubmit={signIn} className="w-full max-w-md space-y-5 rounded-xl border border-stone-800 bg-[#111118] p-8">
      <div><h1 className="text-2xl font-bold">송영민푸드 관리자 로그인</h1><p className="mt-2 text-sm text-stone-400">이메일 인증과 활성 직원 권한이 있는 계정으로 로그인하세요.</p></div>
      <label className="block">이메일<input name="email" required type="email" autoComplete="username" maxLength={254} className="mt-1 w-full rounded border border-stone-700 bg-stone-950 p-3" /></label>
      <label className="block">비밀번호<input name="password" required type="password" autoComplete="current-password" maxLength={128} className="mt-1 w-full rounded border border-stone-700 bg-stone-950 p-3" /></label>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <button disabled={busy} className="w-full rounded bg-[#c5a880] p-3 font-bold text-black disabled:opacity-50">{busy ? '확인 중…' : '로그인'}</button>
      <p className="text-xs text-stone-400">초대 계정의 최초 비밀번호 설정·복구는 관리자에게 문의해 주세요.</p>
      <Link href="/" className="block text-center text-sm text-stone-400">사이트로 돌아가기</Link>
    </form>
  </main>;
}
