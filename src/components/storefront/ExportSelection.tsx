'use client';
import {useState} from 'react';
import Link from '@/components/layout/LocalizedLink';
import {useLanguage} from '@/lib/i18n/LanguageContext';
import {useRFQ} from '@/context/RFQContext';
import {usePricing} from '@/context/PricingContext';
import {validQuantity} from '@/lib/storefront';
import {FOB_NOTICE} from '@/lib/pricing/types';
export default function ExportSelection({productId,reviewHref='/rfq'}:{productId:string;reviewHref?:string}) {
  const {products}=usePricing(),entry=products[productId],rfq=useRFQ(),{text}=useLanguage();
  const minimum=Math.max(entry?.export_moq_ctn||1,entry?.units.CTN?.quantity||1);
  const [quantity,setQuantity]=useState<number|null>(null),[added,setAdded]=useState(false);
  const count=quantity??minimum;
  return <section aria-label={text('해외 RFQ 담기','Add to export RFQ')} className="space-y-4 rounded-xl border border-amber-300 bg-amber-50 p-5 text-stone-900">
    <h2 className="text-lg font-bold">{text('해외 바이어 / Export RFQ','Export RFQ')}</h2>
    <p className="text-sm">Export MOQ: {entry?.export_moq_ctn?entry.export_moq_ctn+' CTN':'To be confirmed'} · {entry?.loading_port?'FOB '+entry.loading_port:'Loading port subject to review'}</p>
    <label className="block text-sm">{text('요청 카톤 수량 (CTN)','Cartons requested (CTN)')}<input aria-label={text('RFQ 카톤 수량','RFQ carton quantity')} type="number" min={1} max={100000} step={1} value={count} onChange={e=>{setQuantity(Number(e.target.value));setAdded(false);}} className="ml-3 min-h-11 w-24 rounded border border-stone-400 bg-white p-2"/></label>
    {entry?.export_moq_ctn&&count<minimum?<p className="text-sm text-amber-900">{text('검수된 최소 수량보다 적습니다. 담당자가 요청 수량을 검토합니다.','Requested quantity is below the reviewed minimum. Our team will review this inquiry.')}</p>:null}
    <div className="flex flex-wrap gap-3"><button disabled={!rfq.ready||!validQuantity(count)} onClick={()=>{rfq.add(productId,count);setAdded(true);}} className="min-h-11 rounded-lg bg-amber-700 px-4 py-3 font-bold text-white disabled:opacity-40">{text('해외 견적함 담기','Add to RFQ')}</button><Link href={reviewHref} className="inline-flex min-h-11 items-center rounded-lg border border-amber-700 px-4 py-3">{text('견적함 보기','Review RFQ')}</Link></div>
    {added&&<p role="status" className="text-sm">{rfq.notice}</p>}
    <p className="text-xs leading-6">{FOB_NOTICE}</p>
    <p className="text-xs">{text('검토한 견적은 최종 Commercial Invoice가 아닌 Proforma Invoice로 발행됩니다.','A reviewed quotation will be issued as a Proforma Invoice, not a final Commercial Invoice.')}</p>
  </section>;
}
