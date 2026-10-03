'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function AdminAccountPage() {
  const [message,setMessage] = useState('');
  const [busy,setBusy] = useState(false);
  const router = useRouter();
  async function save(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const form = new FormData(event.currentTarget);
    const element = event.currentTarget;
    try {
      if(form.get('password') !== form.get('confirmation')) throw new Error('새 비밀번호가 일치하지 않습니다.');
      const response = await fetch('/api/admin/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword:form.get('currentPassword'),password:form.get('password')})});
      const result = await response.json();
      if(!response.ok) throw new Error(result.error);
      element.reset(); setMessage('변경되었습니다. 새 비밀번호로 다시 로그인해 주세요.'); router.refresh();
    } catch(e) { setMessage(e instanceof Error ? e.message : '변경에 실패했습니다.'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-xl p-8"><h1 className="text-2xl font-bold">관리자 비밀번호 변경</h1>
    <form onSubmit={save} className="mt-6 space-y-5">{[['currentPassword','현재 비밀번호'],['password','새 비밀번호'],['confirmation','새 비밀번호 확인']].map(([name,label]) =>
      <label key={name} className="block">{label}<input name={name} required type="password" autoComplete={name === 'currentPassword' ? 'current-password' : 'new-password'} minLength={name === 'currentPassword' ? 1 : 12} maxLength={128} className="mt-2 w-full rounded border border-stone-700 bg-stone-950 p-3" /></label>)}
      <p className="text-sm text-stone-400">새 비밀번호는 12자 이상입니다. 변경 시 이 계정의 모든 사이트 세션이 종료됩니다.</p>
      <button disabled={busy} className="rounded bg-amber-200 px-6 py-3 text-black">{busy ? '저장 중…' : '비밀번호 변경'}</button></form>
    {message && <p role="status" className="mt-5">{message}</p>}</main>;
}
