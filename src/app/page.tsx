import {serverLanguage} from '@/lib/i18n/server';
import {translateUI} from '@/lib/i18n/translate';
import Link from '@/components/layout/LocalizedLink';
import {getPublicProducts} from '@/lib/products-db';
import {ProductPrice} from '@/components/pricing/ProductPrice';
import CatalogueSearch from '@/components/storefront/CatalogueSearch';
import CategoryNavigation from '@/components/storefront/CategoryNavigation';
import {catalogueHref,productHref} from '@/lib/catalogue-navigation';
import {categoryLabel,productName} from '@/lib/catalogue-taxonomy';

export default async function Home({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
 const {language,text}=await serverLanguage(),ui=(key:string)=>translateUI(key,language);
 const raw=await searchParams,params=new URLSearchParams();
 for(const [key,value] of Object.entries(raw))if(typeof value==='string')params.set(key,value);
 params.set('lang',language);
 const catalogue=catalogueHref(params),domestic=catalogueHref(params,{mode:'',page:'1'}),overseas=catalogueHref(params,{mode:'export',page:'1'}),exportMode=params.get('mode')==='export';
 const products=await getPublicProducts();
 const featured=[...products.filter(p=>p.is_featured),...products.filter(p=>!p.is_featured)].slice(0,4);
 return <main className="bg-[#fafaf8]">
  <section className="border-b border-green-900/10 bg-[#eef2eb] px-4 py-6 sm:px-6 lg:py-10">
   <div className="mx-auto max-w-7xl">
    <p className="text-xs font-bold tracking-[.2em] text-green-800">SONGFOOD · KOREAN FOOD SUPPLY</p>
    <h1 className="mt-3 text-3xl font-bold leading-tight text-green-950 sm:text-4xl">{text('필요한 식품을 찾아보세요','Find food for your business and everyday bulk needs')}</h1>
    <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">{text('개인·사업자 누구나 대용량 식품을 찾고, 해외 바이어는 FOB 공급 조건을 문의할 수 있습니다.','Browse bulk food as an individual or business, or request FOB supply terms as an overseas buyer.')}</p>
    <div className="mt-5 max-w-3xl"><CatalogueSearch params={params.toString()} id="home-product-search"/></div>
    <div className="mt-4 flex flex-wrap gap-2 text-sm">
     <Link href={domestic} className="flex min-h-11 items-center rounded-lg bg-green-950 px-4 font-bold text-white">{text('국내 상품 찾기','Browse domestic products')}</Link>
     <Link href={overseas} className="flex min-h-11 items-center rounded-lg border border-amber-700 bg-amber-50 px-4 font-bold text-amber-950">{text('해외 상품·FOB 견적','Export products & FOB RFQ')}</Link>
    </div>
   </div>
  </section>
  <section aria-labelledby="home-categories" className="mx-auto max-w-7xl px-4 py-7 sm:px-6">
   <h2 id="home-categories" className="mb-4 text-xl font-bold">{text('카테고리로 찾기','Browse by category')}</h2>
   <CategoryNavigation products={products} params={params.toString()}/>
  </section>
  <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
   <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold tracking-widest text-green-800">CATALOGUE</p><h2 className="mt-2 text-2xl font-bold">{ui('공급 상품 둘러보기')}</h2></div><Link href={catalogue} className="min-h-11 py-3 text-sm text-green-800 underline">{text('전체 '+products.length+'개 상품','All '+products.length+' products')}</Link></div>
   <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{featured.map(p=><article key={p.id} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
    <Link href={productHref(p.id,catalogue,language)}><img src={p.image_url||'/images/products/coming-soon.png'} alt={productName(p,language)} loading="lazy" className="aspect-[4/3] w-full object-cover"/></Link>
    <div className="space-y-3 p-5"><p className="text-xs text-stone-500">{categoryLabel(p.category||p.collection,language)} · {p.sku}</p><Link className="block font-bold leading-6" href={productHref(p.id,catalogue,language)}>{productName(p,language)}</Link>{exportMode?<Link href={productHref(p.id,catalogue,language)} className="block min-h-11 py-3 text-xs text-green-900 underline">{text('수출 포장·FOB 조건 확인','View export packaging & FOB terms')}</Link>:<ProductPrice product={p}/>}</div>
   </article>)}</div>
  </section>
  <section className="mx-auto grid max-w-7xl gap-7 border-t border-stone-200 px-4 py-10 sm:px-6 md:grid-cols-3">{[
   ['01',ui('이메일로 간편 가입'),ui('개인도 이용할 수 있습니다. 회사 정보와 사업자번호는 선택입니다.')],
   ['02',ui('포장·최소수량 확인'),ui('확인된 가격은 로그인 후 표시됩니다. 미확정 상품은 공급 조건을 문의해 주세요.')],
   ['03',ui('조건 검토 후 거래'),ui('국내 배송비와 해외 선적 조건을 확인합니다. RFQ 접수는 주문·결제 완료가 아닙니다.')]
  ].map(([n,title,body])=><div key={n}><p className="text-sm font-bold text-amber-800">{n}</p><h2 className="mt-2 text-lg font-bold">{title}</h2><p className="mt-3 text-sm leading-7 text-stone-600">{body}</p></div>)}</section>
 </main>;
}
