'use client';
import Link from './LocalizedLink';
import type {MenuItem} from '@/lib/types';
import type {BusinessProfile} from '@/lib/business-settings';
import {initialBusinessProfile} from '@/lib/business-settings';
import {useLanguage} from '@/lib/i18n/LanguageContext';
import CmsLinks from './CmsLinks';
import BusinessContact from './BusinessContact';
export default function FooterClient({menus,profile=initialBusinessProfile}:{menus:MenuItem[];profile?:BusinessProfile}){
 const {text,language}=useLanguage();
 const links=[['/shop',text('국내 상품','Domestic catalogue')],['/shop?mode=export','Export catalogue'],['/wholesale',text('국내 구매 문의','Domestic enquiry')],['/rfq','Overseas RFQ'],['/account',text('마이페이지','My account')],['/catalogues',text('상품 자료실','Product resources')]];
 return <footer className="border-t border-green-900 bg-green-950 px-4 py-10 text-emerald-100 sm:px-6"><div className="mx-auto max-w-7xl"><div className="grid gap-8 md:grid-cols-2">
 <div><Link href="/" className="text-lg font-bold text-white">{profile.name} · SONGFOOD</Link><p className="mt-3 max-w-md text-sm leading-7">{text('국내 도매·개인 대용량 구매와 해외 바이어를 위한 식품 카탈로그. 공급 가능 수량, 배송비와 선적 조건은 문의 후 확인합니다.','Food for domestic wholesale and individual bulk purchases, and overseas buyers. Availability, delivery costs and shipping terms are confirmed after enquiry.')}</p><BusinessContact profile={profile} language={language}/></div>
 <nav aria-label={text('하단 메뉴','Footer navigation')} className="grid grid-cols-2 content-start gap-3 text-sm">{links.map(([href,title])=><Link key={href} href={href} className="py-3">{title}</Link>)}<CmsLinks menus={menus}/></nav></div>
 <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-emerald-800 pt-6 text-xs"><p>Songfood · K-Food Export</p><div className="flex flex-wrap gap-5"><Link className="py-3" href="/privacy">{text('개인정보 처리 안내','Privacy')}</Link><Link className="py-3" href="/terms">{text('이용·거래 안내','Terms')}</Link><Link className="py-3" href="/admin">{text('관리자','Staff')}</Link></div></div></div></footer>;
}
