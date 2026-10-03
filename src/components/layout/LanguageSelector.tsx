'use client';
import {usePathname} from 'next/navigation';
import {koreanOnlyPath} from '@/lib/i18n/locale';
import {useLanguage} from '@/lib/i18n/LanguageContext';
export default function LanguageSelector() {
 const {language,setLanguage}=useLanguage(),path=usePathname();
 if(koreanOnlyPath(path))return <span className="text-xs text-stone-600">국내 주문 · 한국어</span>;
 return <label className="flex shrink-0 items-center gap-2 text-sm"><span className="sr-only">Language / 언어</span>
   <select aria-label="Language / 언어" value={language} onChange={e=>setLanguage(e.target.value)} className="min-h-11 max-w-28 rounded-lg border border-stone-300 bg-white px-2 text-stone-900">
     <option value="ko">한국어</option><option value="en">English</option>
   </select></label>;
}
