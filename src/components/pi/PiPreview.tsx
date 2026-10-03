'use client';
import {useLanguage} from '@/lib/i18n/LanguageContext';
import type {PiSnapshot} from '@/lib/pi/types';
import {formatMoney} from '@/lib/pricing/types';
export default function PiPreview({snapshot:s}:{snapshot:PiSnapshot}){
 const {language,text}=useLanguage();
 return <div className="space-y-4 text-sm">
  <p className="rounded border border-amber-600 bg-amber-50 p-3 text-amber-950"><strong>{text('PROFORMA INVOICE / 견적송장','PROFORMA INVOICE')}</strong><br/>{text('최종 Commercial Invoice가 아닙니다.','Not a final Commercial Invoice.')}</p>
  <div className="grid gap-4 sm:grid-cols-2"><div><h4 className="font-bold">{text('Seller / 판매자','Seller')}</h4><p className="whitespace-pre-wrap">{s.seller.name}{'\n'}{s.seller.address}{'\n'}{s.seller.email} · {s.seller.phone}</p></div><div><h4 className="font-bold">{text('Buyer / 구매자','Buyer')}</h4><p className="whitespace-pre-wrap">{s.buyer.name} · {s.buyer.contact}{'\n'}{s.buyer.address}{'\n'}{s.buyer.country} · {s.buyer.destination}</p></div></div>
  <p>{text('유효기간','Valid until')}: {new Date(s.valid_until).toLocaleString(language==='en'?'en-GB':'ko-KR',{timeZone:'Asia/Seoul'})} KST</p>
  <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={text('PI 상품 내역 · 가로 스크롤','PI line items · scroll horizontally')}><table className="w-full min-w-[520px] text-left text-xs"><thead><tr><th className="p-2">SKU / Product</th><th className="p-2">CTN</th><th className="p-2">USD / CTN</th><th className="p-2">Amount</th><th className="p-2">FOB</th></tr></thead><tbody>{s.lines.map(l=><tr key={l.product_id} className="border-t"><td className="p-2">{l.sku}<br/>{l.name}<br/>{l.ea_per_ctn} EA/CTN</td><td className="p-2">{l.quantity}</td><td className="p-2">{formatMoney(l.unit_minor,'USD')}</td><td className="p-2">{formatMoney(l.total_minor,'USD')}</td><td className="p-2">{l.loading_port}</td></tr>)}</tbody></table></div>
  <p className="text-lg font-bold">{text('합계 USD','Total USD')}: {formatMoney(s.total_minor,'USD')}</p>
  <p className="whitespace-pre-wrap">{text('납기','Lead time')}: {s.lead_time}{'\n'}{text('요구 서류','Documents')}: {s.documents.join(', ')||text('없음','None')}{'\n'}{text('결제조건','Payment')}: {s.seller.payment_terms}{'\n'}{text('은행정보','Bank')}: {s.seller.bank_details}</p>
  <p>{text('변경 사유','Revision')}: {s.change_reason}</p><p className="text-xs leading-6">{s.notice}</p>
 </div>;
}
