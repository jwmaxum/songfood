'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
export default function AdminLogin() {
  const router = useRouter();
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const [email,setEmail]=useState(''),[mailBusy,setMailBusy]=useState(false),[mailMessage,setMailMessage]=useState('');
  async function emailLogin(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setMailBusy(true);setMailMessage('');setError('');try{const r=await fetch('/api/auth/email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,audience:'staff',language:'ko'})}),d=await r.json();if(!r.ok)throw new Error(d.error||'직원 인증 메일을 요청하지 못했습니다.');setMailMessage('직원 인증 링크를 요청했습니다. 메일의 링크를 눌러 관리자 화면에 접속해 주세요.');}catch(e){setError(e instanceof Error?e.message:'연결에 실패했습니다.');}finally{setMailBusy(false);}}
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
    <div className="w-full max-w-md space-y-5"><form onSubmit={signIn} className="w-full max-w-md space-y-5 rounded-xl border border-stone-800 bg-[#111118] p-8">
      <div><h1 className="text-2xl font-bold">송영민푸드 관리자 로그인</h1><p className="mt-2 text-sm text-stone-400">이메일 인증과 활성 직원 권한이 있는 계정으로 로그인하세요.</p></div>
      <label className="block">이메일<input name="email" required type="email" autoComplete="username" maxLength={254} className="mt-1 w-full rounded border border-stone-700 bg-stone-950 p-3" /></label>
      <label className="block">비밀번호<input name="password" required type="password" autoComplete="current-password" maxLength={128} className="mt-1 w-full rounded border border-stone-700 bg-stone-950 p-3" /></label>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <button disabled={busy} className="w-full rounded bg-[#c5a880] p-3 font-bold text-black disabled:opacity-50">{busy ? '확인 중…' : '로그인'}</button>
      <p className="text-xs text-stone-400">비밀번호 없이 가입한 직원은 아래 이메일 인증으로 로그인할 수 있습니다.</p>
      <Link href="/" className="block text-center text-sm text-stone-400">사이트로 돌아가기</Link>
    </form><form onSubmit={emailLogin} className="space-y-4 rounded-xl border border-stone-700 bg-[#111118] p-6"><h2 className="text-xl font-bold">직원 이메일로 로그인</h2><p className="text-sm leading-6 text-stone-300">최고관리자가 등록한 활성 직원만 관리자 화면에 접속할 수 있습니다.</p><label className="block">직원 인증 이메일<input required type="email" autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded border border-stone-600 bg-stone-950 p-3"/></label><button disabled={mailBusy} className="min-h-11 w-full rounded bg-amber-200 p-3 font-bold text-black">{mailBusy?'요청 중…':'직원 인증 링크 발송'}</button>{mailMessage&&<p role="status" className="text-green-200">{mailMessage}</p>}</form></div>
  </main>;
}
