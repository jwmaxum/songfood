'use client';
import {useLanguage} from '@/lib/i18n/LanguageContext';
import Link from '@/components/layout/LocalizedLink';
import {useCart} from '@/context/CartContext';
import {useRFQ} from '@/context/RFQContext';
export default function TradeLinks() {
 const {t:ui}=useLanguage();

  const {cartItems}=useCart(),{items}=useRFQ();
  return <nav aria-label={ui("구매함과 견적함")} className="flex flex-wrap gap-3 text-sm">
    <Link href="/cart" className="rounded-lg bg-green-900 px-4 py-3 font-bold text-white">{ui("국내 구매함 · ")}{cartItems.length}{ui("품목")}</Link>
    <Link href="/rfq" className="rounded-lg border border-amber-700 px-4 py-3 font-bold text-amber-900">{ui("해외 견적함 / RFQ · ")}{items.length}</Link>
  </nav>;
}
