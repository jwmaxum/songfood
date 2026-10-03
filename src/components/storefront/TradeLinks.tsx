'use client';
import Link from 'next/link';
import {useCart} from '@/context/CartContext';
import {useRFQ} from '@/context/RFQContext';
export default function TradeLinks() {
  const {cartItems}=useCart(),{items}=useRFQ();
  return <nav aria-label="구매함과 견적함" className="flex flex-wrap gap-3 text-sm">
    <Link href="/cart" className="rounded-lg bg-green-900 px-4 py-3 font-bold text-white">국내 구매함 · {cartItems.length}품목</Link>
    <Link href="/rfq" className="rounded-lg border border-amber-700 px-4 py-3 font-bold text-amber-900">해외 견적함 / RFQ · {items.length}</Link>
  </nav>;
}
