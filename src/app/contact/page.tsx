import Link from '@/components/layout/LocalizedLink';
import BusinessContact from '@/components/layout/BusinessContact';
import {getBusinessSettings} from '@/lib/business-settings-server';
import {serverLanguage} from '@/lib/i18n/server';
export default async function ContactPage(){
 const [{profile},{language,text}]=await Promise.all([getBusinessSettings(),serverLanguage()]);
 return <main className="mx-auto max-w-4xl px-4 py-12 text-stone-900"><h1 className="text-3xl font-bold">{text('고객 문의','Contact Songfood')}</h1>
 <p className="mt-5 leading-7">{text('상품·수량·배송지에 따라 공급 가능 여부와 배송 조건을 확인합니다. 아래 연락처 또는 국내 구매 문의·해외 RFQ로 요청해 주세요.','Availability and delivery terms depend on the product, quantity and destination. Contact us below, or send a domestic enquiry or overseas RFQ.')}</p>
 <div className="my-6 rounded-xl border p-5"><BusinessContact profile={profile} language={language}/></div>
 <div className="flex flex-wrap gap-4"><Link href="/wholesale" className="rounded bg-green-900 px-5 py-3 text-white">{text('국내 구매 문의','Domestic enquiry')}</Link><Link href="/rfq" className="rounded border border-green-900 px-5 py-3 text-green-900">Overseas RFQ</Link></div>
 <p className="mt-6 text-sm leading-7">{text('인증서·원산지·수출용 표시 자료는 상품별 확인 후 제공 가능 여부를 안내합니다.','Certificates, origin evidence and export label documents are reviewed for each product before availability is confirmed.')}</p></main>;
}
