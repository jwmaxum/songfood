'use client';
import { createContext, useCallback, useContext, useEffect, useState, useRef } from 'react';
import type { CustomerSession } from '@/lib/b2b-types';
type Result = { success: boolean; message: string };
type AuthState = {
  user: CustomerSession['user'] | null; company: CustomerSession['company']; membership: CustomerSession['membership'];
  isLoggedIn: boolean; loading: boolean; error: string;
  login: (email: string, password: string) => Promise<Result>;
  requestEmailLink: (email: string) => Promise<Result>;
  logout: () => Promise<Result>; refresh: () => Promise<void>;
};
const AuthContext = createContext<AuthState | undefined>(undefined);
async function submit(url: string, body?: object, method = 'POST'): Promise<Result> {
  try {
    const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const result = await response.json();
    return { success: response.ok && result.success === true, message: result.message || result.error || '' };
  } catch { return { success: false, message: '서버에 연결하지 못했습니다. 다시 시도해 주세요.' }; }
}
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const generation = useRef(0);
  const [session, setSession] = useState<CustomerSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    try {
      const response = await fetch('/api/account/session', { cache: 'no-store' });
      const result = await response.json();
      if (current !== generation.current) return;
      setSession(response.ok ? result : null);
      setError(response.ok || response.status === 401 ? '' : result.error || '회원 정보를 확인하지 못했습니다.');
    } catch { if(current === generation.current) { setSession(null); setError('서버에 연결하지 못했습니다.'); } }
    finally { if(current === generation.current) setLoading(false); }
  }, []);
  useEffect(() => {
    try { localStorage.removeItem('anatolia_user'); localStorage.removeItem('anatolia_orders'); } catch { /* Storage can be disabled. */ }
    const current = ++generation.current;
    const controller = new AbortController();
    fetch('/api/account/session',{cache:'no-store',signal:controller.signal}).then(async response => {
      const result = await response.json();
      if(current !== generation.current) return;
      setSession(response.ok ? result : null);
      setError(response.ok || response.status === 401 ? '' : result.error || '회원 정보를 확인하지 못했습니다.');
      setLoading(false);
    }).catch(e => { if(e.name !== 'AbortError' && current === generation.current) { setSession(null); setError('서버에 연결하지 못했습니다.'); setLoading(false); } });
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    const timer = window.setInterval(onFocus, 60_000);
    return () => { controller.abort(); window.removeEventListener('focus', onFocus); window.clearInterval(timer); };
  }, [refresh]);
  async function login(email: string, password: string) {
    const result = await submit('/api/auth/login', { email, password });
    if (result.success) await refresh();
    return result;
  }
  async function requestEmailLink(email: string) {
    return submit('/api/auth/email', { email });
  }
  async function logout() {
    const result = await submit('/api/account/session', undefined, 'DELETE');
    if (result.success) { generation.current++; setSession(null); setError(''); }
    else setError(result.message);
    return result;
  }
  return <AuthContext.Provider value={{ user: session?.user || null, company: session?.company || null, membership: session?.membership || null,
    isLoggedIn: !!session, loading, error, login, requestEmailLink, logout, refresh }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider is required');
  return context;
}
