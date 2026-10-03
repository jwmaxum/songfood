import {serverLanguage} from '@/lib/i18n/server';
import {translateUI} from '@/lib/i18n/translate';
import Link from '@/components/layout/LocalizedLink';
import {getPublicProducts} from '@/lib/products-db';
import {ProductPrice} from '@/components/pricing/ProductPrice';
export default async function Home() {
 const {language}=await serverLanguage(); const ui=(key:string)=>translateUI(key,language);

  const products=await getPublicProducts();
  const featured=[...products.filter(p=>p.is_featured),...products.filter(p=>!p.is_featured)].slice(0,4);
  return <main className="bg-[#fafaf8]">
    <section className="border-b border-green-900/10 bg-[#eef2eb] px-4 py-12 sm:px-6 lg:py-20"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_1fr]">
      <div className="self-center"><p className="text-xs font-bold tracking-[.2em] text-green-800">SONGFOOD · KOREAN FOOD SUPPLY</p><h1 className="mt-5 max-w-2xl text-4xl font-bold leading-tight text-green-950 sm:text-5xl">{ui("필요한 식품을,")}<br/>{ui("알맞은 공급 단위로.")}</h1><p className="mt-6 max-w-xl text-base leading-8 text-stone-600">{ui("국내 도매고객, 해외 바이어, 대용량 식품을 찾는 개인을 위한 카탈로그입니다. 상품별 포장·최소수량을 확인하고 구매 조건을 문의하세요.")}</p><Link href="/shop" className="mt-7 inline-block border-b border-green-800 pb-1 font-semibold text-green-900">{ui("전체 상품 살펴보기 →")}</Link></div>
      <div className="grid gap-4"><Link href="/shop" className="group rounded-2xl bg-green-950 p-7 text-white shadow-sm"><p className="text-xs tracking-widest text-emerald-200">01 · DOMESTIC WHOLESALE</p><h2 className="mt-4 text-2xl font-bold">{ui("국내 도매·대용량 구매")}</h2><p className="mt-3 text-sm leading-7 text-emerald-100">{ui("개인·사업자 모두 가능 · EA / BOX / CTN")}<br/>{ui("상품 선택 → 구매함 → 공급·배송 조건 확인")}</p><span className="mt-6 block font-bold">{ui("국내 상품 찾기 →")}</span></Link>
      <Link href="/shop?mode=export" className="group rounded-2xl border border-amber-300 bg-[#f2e6c9] p-7 text-stone-900"><p className="text-xs tracking-widest text-amber-900">02 · OVERSEAS BUYERS</p><h2 className="mt-4 text-2xl font-bold">K-Food Export RFQ</h2><p className="mt-3 text-sm leading-7">Select products in cartons, review MOQ and request FOB terms. A quotation is subject to review.</p><span className="mt-6 block font-bold">Explore export products →</span></Link></div>
    </div></section>
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold tracking-widest text-green-800">CATALOGUE</p><h2 className="mt-2 text-2xl font-bold">{ui("공급 상품 둘러보기")}</h2></div><Link href="/shop" className="text-sm text-green-800 underline">{ui("전체 ")}{products.length}{ui("개 상품")}</Link></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{featured.map(p=><article key={p.id} className="overflow-hidden rounded-xl border border-stone-200 bg-white"><Link href={'/products/'+encodeURIComponent(p.id)}><img src={p.image_url} alt={p.name} loading="lazy" className="aspect-[4/3] w-full object-cover"/></Link><div className="space-y-3 p-5"><p className="text-xs text-stone-500">{p.category} · {p.sku}</p><Link className="block font-bold leading-6" href={'/products/'+encodeURIComponent(p.id)}>{p.name}</Link><ProductPrice product={p}/></div></article>)}</div>
    </section>
    <section className="mx-auto grid max-w-7xl gap-7 border-t border-stone-200 px-4 py-12 sm:px-6 md:grid-cols-3">{[['01',ui("이메일로 간편 가입"),ui("개인도 이용할 수 있습니다. 회사 정보와 사업자번호는 선택입니다.")],['02',ui("포장·최소수량 확인"),ui("확인된 가격은 로그인 후 표시됩니다. 미확정 상품은 공급 조건을 문의해 주세요.")],['03',ui("조건 검토 후 거래"),ui("국내 배송비와 해외 선적 조건을 확인합니다. RFQ 접수는 주문·결제 완료가 아닙니다.")]].map(([n,title,body])=><div key={n}><p className="text-sm font-bold text-amber-800">{n}</p><h2 className="mt-2 text-lg font-bold">{title}</h2><p className="mt-3 text-sm leading-7 text-stone-600">{body}</p></div>)}</section>
  </main>;
}
