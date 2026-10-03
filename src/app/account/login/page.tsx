'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
export default function LoginPage() {
  const { login, requestEmailLink, isLoggedIn, loading } = useAuth();
  const router = useRouter();
  const [passwordMode, setPasswordMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const form = new FormData(event.currentTarget);
    const result = passwordMode ? await login(String(form.get('email')), String(form.get('password')))
      : await requestEmailLink(String(form.get('email')));
    setBusy(false);
    if (result.success && passwordMode) router.replace('/account');
    else { setMessage(result.message); setSent(result.success); }
  }
  return <main className="mx-auto max-w-lg px-6 py-16">
    <p className="text-sm font-semibold text-green-800">SONGFOOD</p>
    <h1 className="mt-3 text-3xl font-bold">{passwordMode ? '비밀번호로 로그인' : '로그인 / 간편 회원가입'}</h1>
    <p className="mt-4 leading-7 text-stone-600">개인도 사업자도 대용량 식료품을 이용할 수 있습니다. 이메일 인증 후 별도 승인 없이 가입됩니다. 회사 정보와 사업자번호는 선택입니다.</p>
    {isLoggedIn ? <Link href="/account" className="mt-8 inline-block underline">내 계정으로 이동</Link> :
    <form onSubmit={submit} className="mt-8 space-y-5">
      <label className="block">이메일<input name="email" type="email" autoComplete="email" required maxLength={254} className="mt-2 w-full rounded border p-3" /></label>
      {passwordMode && <label className="block">비밀번호<input name="password" type="password" autoComplete="current-password" required maxLength={128} className="mt-2 w-full rounded border p-3" /></label>}
      {!passwordMode && <p className="text-sm text-stone-600">비밀번호 없이 메일의 인증 링크로 이용하세요. 처음 이용하는 이메일은 자동으로 가입됩니다.</p>}
      <button disabled={busy || loading} className="w-full rounded bg-green-900 p-3 font-semibold text-white disabled:opacity-50">{busy ? '확인 중…' : passwordMode ? '로그인' : sent ? '인증 링크 다시 받기' : '이메일 인증 링크 받기'}</button>
      <button type="button" disabled={busy} onClick={() => { setPasswordMode(!passwordMode); setMessage(''); setSent(false); }} className="w-full py-2 text-sm text-green-800 underline">{passwordMode ? '이메일 링크로 간편하게 이용하기' : '기존 비밀번호로 로그인하기'}</button>
    </form>}
    {message && <p role="status" className="mt-5 rounded border border-amber-300 bg-amber-50 p-4 text-sm">{message}</p>}
    <p className="mt-8 text-sm text-stone-500">상품 탐색과 구매 문의를 이용할 수 있습니다. 온라인 주문·결제는 준비 중입니다. <Link href="/shop" className="underline">상품 둘러보기</Link></p>
  </main>;
}
