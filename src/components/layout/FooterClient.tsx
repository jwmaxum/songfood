'use client';
import Link from 'next/link';
import type {MenuItem} from '@/lib/types';
import {safeMenuLinks} from '@/lib/storefront';
export default function FooterClient({menus}:{menus:MenuItem[]}) {
  const links=safeMenuLinks(menus).filter(m=>!['/shop','/rfq','/account','/privacy','/terms'].includes(m.url)).slice(0,6);
  return <footer className="border-t border-green-900 bg-green-950 px-4 py-10 text-emerald-100 sm:px-6"><div className="mx-auto max-w-7xl">
    <div className="grid gap-8 md:grid-cols-[1fr_1.3fr]"><div><Link href="/" className="text-lg font-bold text-white">송영민푸드 · SONGFOOD</Link><p className="mt-3 max-w-md text-sm leading-7">국내 도매·개인 대용량 구매와 해외 바이어를 위한 식품 카탈로그. 공급 가능 수량, 배송비와 선적 조건은 문의 후 확인합니다.</p></div><nav aria-label="하단 메뉴" className="grid grid-cols-2 gap-3 text-sm"><Link href="/shop">국내 상품</Link><Link href="/shop?mode=export">Export catalogue</Link><Link href="/wholesale">국내 구매 문의</Link><Link href="/rfq">Overseas RFQ</Link><Link href="/account">마이페이지</Link><Link href="/catalogues">상품 자료실</Link>{links.map(m=><Link key={m.id} href={m.url}>{m.title}</Link>)}</nav></div>
    <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-emerald-800 pt-6 text-xs"><p>Songfood · 국내 도매 / K-Food Export</p><div className="flex gap-5"><Link href="/privacy">개인정보처리방침</Link><Link href="/terms">이용약관</Link><Link href="/admin">관리자</Link></div></div>
  </div></footer>;
}
