'use client';
import Feedback from '@/components/storefront/Feedback';

import {localizedHref} from '@/lib/i18n/locale';
import {useLanguage} from '@/lib/i18n/LanguageContext';

import { useEffect, useRef, useState } from 'react';
import Link from '@/components/layout/LocalizedLink';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
export default function ConfirmedPage() {
 const {t:ui,language}=useLanguage();

  const started = useRef(false);
  const [message, setMessage] = useState(ui("이메일 인증을 확인하고 있습니다…"));
  const { refresh } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = fragment.get('access_token');
    // Remove bearer credentials before any further navigation; never persist them in storage.
    window.history.replaceState(null, '', localizedHref(window.location.pathname,language));
    async function finish() {
      if (!accessToken || fragment.has('error')) {
        setMessage(ui("인증 링크가 없거나 만료되었습니다. 새 인증 메일을 요청해 주세요."));
        return;
      }
      try {
        const response = await fetch('/api/auth/verify', { method: 'POST',
          headers: { 'Content-Type':'application/json' }, body: JSON.stringify({accessToken}) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || ui("인증을 완료하지 못했습니다."));
        await refresh();
        router.replace(localizedHref('/account',language));
      } catch (error) { setMessage(error instanceof Error ? error.message : ui("서버에 연결하지 못했습니다.")); }
    }
    void finish();
  }, [refresh, router,ui,language]);
  return <main className="mx-auto max-w-xl px-6 py-20"><h1 className="text-3xl font-bold">{ui("이메일 인증")}</h1>
    <Feedback  className="mt-5 text-stone-600">{message}</Feedback>
    <Link href="/account/login" className="mt-8 inline-block rounded bg-green-900 px-6 py-3 text-white">{ui("로그인 / 인증 메일 다시 받기")}</Link></main>;
}
