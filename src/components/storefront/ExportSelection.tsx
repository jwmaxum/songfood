'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useRFQ} from '@/context/RFQContext';
import {usePricing} from '@/context/PricingContext';
import {validQuantity} from '@/lib/storefront';
import {FOB_NOTICE} from '@/lib/pricing/types';
export default function ExportSelection({productId}:{productId:string}) {
  const {products}=usePricing(),entry=products[productId],rfq=useRFQ();
  const minimum=Math.max(entry?.export_moq_ctn||1,entry?.units.CTN?.quantity||1);
  const [quantity,setQuantity]=useState<number|null>(null),[added,setAdded]=useState(false);
  const count=quantity??minimum;
  return <section aria-label="해외 RFQ 담기" className="space-y-4 rounded-xl border border-amber-300 bg-amber-50 p-5 text-stone-900">
    <h2 className="text-lg font-bold">해외 바이어 / Export RFQ</h2>
    <p className="text-sm">Export MOQ: {entry?.export_moq_ctn?entry.export_moq_ctn+' CTN':'To be confirmed'} · {entry?.loading_port?'FOB '+entry.loading_port:'Loading port subject to review'}</p>
    <label className="block text-sm">Cartons requested (CTN)<input aria-label="RFQ 카톤 수량" type="number" min={1} max={100000} step={1} value={count} onChange={e=>{setQuantity(Number(e.target.value));setAdded(false);}} className="ml-3 w-24 rounded border border-stone-400 bg-white p-2"/></label>
    {entry?.export_moq_ctn&&count<minimum?<p className="text-sm text-amber-900">Requested quantity is below the reviewed minimum. Our team will review this inquiry.</p>:null}
    <div className="flex flex-wrap gap-3"><button disabled={!rfq.ready||!validQuantity(count)} onClick={()=>{rfq.add(productId,count);setAdded(true);}} className="rounded-lg bg-amber-700 px-4 py-3 font-bold text-white disabled:opacity-40">해외 견적함 담기 / Add to RFQ</button><Link href="/rfq" className="rounded-lg border border-amber-700 px-4 py-3">견적함 보기 / Review RFQ</Link></div>
    {added&&<p role="status" className="text-sm">{rfq.notice}</p>}
    <p className="text-xs leading-6">{FOB_NOTICE}</p>
    <p className="text-xs">A reviewed quotation will be issued as a Proforma Invoice, not a final Commercial Invoice.</p>
  </section>;
}
