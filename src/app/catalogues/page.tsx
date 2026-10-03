import Link from 'next/link';
import {serverLanguage} from '@/lib/i18n/server';
export default async function Page(){
 const {text,href}=await serverLanguage();
 return <main className="mx-auto max-w-4xl px-5 py-12"><p className="text-sm font-bold text-green-800">SONGFOOD · DOCUMENTS</p><h1 className="mt-3 text-3xl font-bold">{text('상품 자료실','Product resources')}</h1>
 <p className="mt-5 leading-8">{text('현재 공개 다운로드가 가능한 검수 완료 카탈로그는 등록되지 않았습니다. 필요한 상품의 사양서·원산지·성분·인증 자료를 요청해 주세요. 담당자가 해당 상품과 수출 대상국에 맞는 자료의 제공 가능 여부를 확인합니다.','No reviewed public catalogue is currently available for download. Request specifications, origin, ingredient or certification documents for the products you need. Staff will confirm availability for the product and destination.')}</p>
 <div className="mt-8 flex flex-wrap gap-4"><Link href={href('/shop?mode=export')} className="rounded border px-5 py-3">{text('상품 정보 보기','View product information')}</Link><Link href={href('/rfq')} className="rounded bg-green-900 px-5 py-3 text-white">{text('RFQ에서 자료 요청','Request documents in an RFQ')}</Link><Link href={href('/account#proforma')} className="rounded border px-5 py-3">{text('발행된 PI·PDF 확인','View issued PIs and PDFs')}</Link></div>
 <p className="mt-8 text-sm leading-7 text-stone-700">{text('상품의 인증 정보는 증명서·대상 시설·적용 범위·유효기간 검토가 필요합니다. Proforma Invoice는 견적용 문서이며 최종 Commercial Invoice가 아닙니다.','Certification requires review of the certificate, facility, scope and validity period. A Proforma Invoice is a quotation document, not a final Commercial Invoice.')}</p></main>;
}
