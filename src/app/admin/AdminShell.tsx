'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { pageRoles } from '@/lib/staff-permissions';
import type { StaffRole } from '@/lib/admin-auth';

const NAVIGATION = [
  { href: '/admin', label: '대시보드' },
  { href: '/admin/products', label: '상품 등록·수정' },
  { href: '/admin/pricing', label: '가격·최소구매단위' },
  { href: '/admin/labels', label: '수출 라벨 스튜디오' },
  { href: '/admin/hero', label: '히어로 콘텐츠' },
  { href: '/admin/navigation', label: '사이트 메뉴' },
  { href: '/admin/journal', label: '저널' },
  { href: '/admin/media', label: '미디어' },
  { href: '/admin/crm', label: 'RFQ·도매 문의' },
  { href: '/admin/orders', label: '주문·입금·출고' },
  { href: '/admin/companies', label: '회사·담당자 관리' },
  { href: '/admin/users', label: '직원 권한' },
  { href: '/admin/account', label: '내 계정' },
];

export default function AdminShell({ children, email, role }: { children: React.ReactNode; email: string; role: StaffRole }) {
  const pathname = usePathname();
  const router = useRouter();
  const [error, setError] = useState('');
  useEffect(() => {
    const check = () => { void fetch('/api/admin/session', {cache:'no-store'}).then(r => { if(!r.ok) router.refresh(); }).catch(() => setError('세션 확인 연결에 실패했습니다.')); };
    const timer = window.setInterval(check,60000); window.addEventListener('focus',check);
    return () => { window.clearInterval(timer); window.removeEventListener('focus',check); };
  },[router]);
  async function signOut() {
    try {
      const response = await fetch('/api/admin/session', { method: 'DELETE' });
      if(!response.ok) throw new Error();
      router.refresh();
    } catch { setError('로그아웃에 실패했습니다. 다시 시도해 주세요.'); }
  }
  return <div className="flex min-h-screen flex-col bg-[#0a0a0c] text-stone-200 md:flex-row">
    <aside className="w-full shrink-0 border-b border-stone-800 bg-[#0d0d12] p-5 md:min-h-screen md:w-60 md:border-b-0 md:border-r">
      <Link href="/admin" className="text-lg font-bold text-white">송영민푸드 CMS</Link>
      <p className="mt-1 break-all text-xs text-stone-400">{email} · {role}</p>
      <nav className="mt-7 flex gap-2 overflow-x-auto md:flex-col" aria-label="관리자 메뉴">{NAVIGATION.filter(item => pageRoles(item.href).includes(role)).map((item) => <Link key={item.href} href={item.href} className={`whitespace-nowrap rounded px-3 py-2 text-sm ${pathname === item.href ? 'bg-[#c5a880] font-semibold text-black' : 'text-stone-300 hover:bg-stone-800'}`}>{item.label}</Link>)}</nav>
      {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
      <button className="mt-7 text-sm text-amber-300" onClick={signOut}>로그아웃</button>
    </aside>
    <div className="min-w-0 flex-1">{children}</div>
  </div>;
}
