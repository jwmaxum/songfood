'use client';
import {useState,useTransition} from 'react';
import Link from 'next/link';
import {usePathname,useSearchParams} from 'next/navigation';
import type {ProductItem} from '@/lib/types';
import {filterProducts,pageWindow,readFilters,validQuantity} from '@/lib/storefront';
import {usePricing} from '@/context/PricingContext';
import {useCart} from '@/context/CartContext';
import {useRFQ} from '@/context/RFQContext';
import {ProductPrice} from '@/components/pricing/ProductPrice';
import TradeLinks from '@/components/storefront/TradeLinks';
import type {TradeUnit} from '@/lib/pricing/types';

function QuickOrder({product,exportMode}:{product:ProductItem;exportMode:boolean}) {
  const {products}=usePricing(),entry=products[product.id],{addToCart}=useCart(),rfq=useRFQ();
  const [selectedUnit,setUnit]=useState<TradeUnit|null>(null),[count,setCount]=useState<number|null>(null),[message,setMessage]=useState('');
  const unit=exportMode?'CTN':selectedUnit||entry?.minimum_order?.unit||product.purchase_minimum?.unit||'EA';
  const min=exportMode?Math.max(entry?.export_moq_ctn||1,entry?.units.CTN?.quantity||1):entry?.units[unit]?.quantity||product.purchase_minimum?.quantity||1;
  const quantity=count??min;
  return <div className="mt-4 space-y-2">
    <div className="flex flex-wrap gap-2">
      <label className="text-xs">단위 / Unit<select aria-label={product.sku+' 구매 단위'} value={unit} disabled={exportMode} onChange={e=>{setUnit(e.target.value as TradeUnit);setCount(null);setMessage('');}} className="mt-1 block rounded border border-stone-300 bg-white p-2 text-sm">{['EA','BOX','CTN'].map(u=><option key={u}>{u}</option>)}</select></label>
      <label className="text-xs">수량 / Quantity<input aria-label={product.sku+' 수량'} type="number" min={1} max={100000} step={1} value={quantity} onChange={e=>{setCount(Number(e.target.value));setMessage('');}} className="mt-1 block w-24 rounded border border-stone-300 p-2 text-sm"/></label>
      <button disabled={!validQuantity(quantity)||!rfq.ready} onClick={()=>{
        if(exportMode){const added=rfq.add(product.id,quantity);setMessage(added?'해외 견적함에 담았습니다. / Added to RFQ.':'담지 못했습니다. 견적함 품목 수와 수량 한도를 확인해 주세요.');}
        else {addToCart(product,quantity,undefined,undefined,unit==='CTN'?'carton':unit==='BOX'?'box':'ea',undefined,undefined,false);setMessage('국내 구매함에 담았습니다. 구매함에서 가격·최소수량을 확인해 주세요.');}
      }} className="self-end rounded-lg bg-green-900 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-40">{exportMode?'RFQ 담기':'구매함 담기'}</button>
    </div>
    {exportMode&&<p className="text-xs text-stone-600">Export MOQ: {entry?.export_moq_ctn?entry.export_moq_ctn+' CTN':'확인 필요 / To be confirmed'}</p>}
    {message&&<p role="status" className="text-xs text-green-900">{message}</p>}
  </div>;
}
export default function CollectionShowcaseClient({initialProducts}:{initialProducts:ProductItem[]}) {
  const params=useSearchParams(),pathname=usePathname(),[pending,startTransition]=useTransition();
  const {products:prices}=usePricing();
  const search=new URLSearchParams(params.toString()),filters=readFilters(search),exportMode=search.get('mode')==='export';
  const products=initialProducts.map(p=>({...p,purchase_minimum:prices[p.id]?.minimum_order||p.purchase_minimum}));
  const filtered=filterProducts(products,filters),paged=pageWindow(filtered,search.get('page'),12),list=search.get('view')!=='grid';
  const choices=(key:'category'|'brand')=>[...new Set(initialProducts.map(p=>p[key]).filter(Boolean))].sort() as string[];
  const markets=[...new Set(initialProducts.flatMap(p=>p.target_markets||[]))].sort();
  function url(changes:Record<string,string>) {const next=new URLSearchParams(search);for(const [k,v]of Object.entries(changes)){if(v)next.set(k,v);else next.delete(k);}return pathname+'?'+next.toString();}
  function navigate(changes:Record<string,string>){startTransition(()=>window.history.pushState(null,'',url(changes)));}
  return <main className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:space-y-7 sm:px-6 sm:py-8 lg:py-12">
    <header className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold tracking-widest text-green-800">SONGFOOD · WHOLESALE CATALOGUE</p><h1 className="mt-2 text-2xl font-bold sm:text-3xl">{exportMode?'수출 상품 / Export catalogue':'국내 도매·대용량 상품'}</h1><p className="mt-3 hidden max-w-2xl text-sm sm:block text-stone-600">개인·사업자 모두 이용할 수 있습니다. 상품별 포장·최소수량을 확인하고 필요한 품목을 모아 문의해 주세요.</p></div><TradeLinks/></header>
    <nav aria-label="구매 유형" className="flex flex-wrap gap-2"><button aria-pressed={!exportMode} onClick={()=>navigate({mode:'',page:'1'})} className={'rounded-full border px-5 py-2 text-sm '+(!exportMode?'bg-green-900 text-white':'bg-white')}>국내 구매 · EA / BOX / CTN</button><button aria-pressed={exportMode} onClick={()=>navigate({mode:'export',page:'1'})} className={'rounded-full border px-5 py-2 text-sm '+(exportMode?'bg-amber-800 text-white':'bg-white')}>Export RFQ · CTN</button></nav>
    <form key={params.toString()} aria-label="상품 검색과 필터" onSubmit={e=>{e.preventDefault();const values=Object.fromEntries(new FormData(e.currentTarget));navigate({...Object.fromEntries(Object.entries(values).map(([k,v])=>[k,String(v)])),page:'1'});}} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex items-end gap-2"><label className="min-w-0 flex-1 text-sm font-semibold">SKU·상품명·브랜드 검색<input name="q" defaultValue={filters.q} maxLength={200} placeholder="예: 김치, SKU, 브랜드명" className="mt-2 w-full rounded-lg border border-stone-300 p-3"/></label><button className="shrink-0 whitespace-nowrap rounded-lg bg-green-900 px-3 py-3 text-sm font-bold text-white">검색·필터 적용</button></div>
      <details open={Object.values(filters).some(Boolean)}><summary className="cursor-pointer py-2 text-sm font-semibold">상세 필터 / Filters</summary><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(['category','brand']as const).map(k=><label key={k} className="text-sm">{k==='category'?'카테고리':'브랜드'}<select name={k} defaultValue={filters[k]} className="mt-1 w-full rounded border border-stone-300 p-2"><option value="">전체</option>{choices(k).map(v=><option key={v}>{v}</option>)}</select></label>)}
        <label className="text-sm">보관 온도<select name="storage" defaultValue={filters.storage} className="mt-1 w-full rounded border border-stone-300 p-2"><option value="">전체</option><option value="frozen">냉동</option><option value="chilled">냉장</option><option value="ambient">실온·상온</option><option value="unknown">기타·확인 필요</option></select></label>
        <label className="text-sm">수출 대상 국가·지역 (등록 정보)<select name="market" defaultValue={filters.market} className="mt-1 w-full rounded border border-stone-300 p-2"><option value="">전체</option>{markets.map(m=><option key={m}>{m}</option>)}</select></label>
        <label className="text-sm">최소구매단위<select name="minimum" defaultValue={filters.minimum} className="mt-1 w-full rounded border border-stone-300 p-2"><option value="">전체</option>{['EA','BOX','CTN'].map(u=><option key={u}>{u}</option>)}<option value="unknown">확인 필요</option></select></label>
        <label className="text-sm">최소구매수량 상한 (선택 단위 기준)<input name="maxMinimum" type="number" min={1} max={1000000} defaultValue={filters.maxMinimum} className="mt-1 w-full rounded border border-stone-300 p-2"/></label>
      </div><p className="mt-3 text-xs text-stone-500">수량 상한은 EA/BOX/CTN 중 한 단위를 선택했을 때 적용합니다. 대상국 정보는 수출 허가를 의미하지 않으며 실제 공급 조건을 확인합니다.</p></details>
      <button type="button" onClick={()=>navigate({q:'',category:'',brand:'',storage:'',market:'',minimum:'',maxMinimum:'',page:'1'})} className="text-sm text-green-800 underline">필터 초기화</button>
    </form>
    <div className="flex flex-wrap items-center justify-between gap-3"><p role="status" className="text-sm">{pending?'검색 중…':paged.total+'개 상품 · '+paged.page+' / '+paged.pages+' 페이지'}</p><div className="flex gap-2"><button aria-pressed={list} onClick={()=>navigate({view:'list'})} className="rounded border px-3 py-2 text-sm">목록</button><button aria-pressed={!list} onClick={()=>navigate({view:'grid'})} className="rounded border px-3 py-2 text-sm">카드</button></div></div>
    {!paged.total?<section className="rounded-2xl border border-dashed p-10 text-center"><h2 className="font-bold">조건에 맞는 상품이 없습니다.</h2><p className="mt-2 text-sm text-stone-600">검색어나 필터를 줄이거나 필요한 상품을 문의해 주세요.</p><Link href="/wholesale" className="mt-4 inline-block text-green-800 underline">상품 문의</Link></section>:<div aria-busy={pending} className={list?'space-y-3':'grid gap-4 md:grid-cols-2 xl:grid-cols-3'}>{paged.items.map(p=><article key={p.id} className={'min-w-0 rounded-xl border border-stone-200 bg-white p-4 '+(list?'grid gap-4 sm:grid-cols-[96px_minmax(0,1fr)_minmax(260px,340px)]':'space-y-4')}>
      <Link href={'/products/'+encodeURIComponent(p.id)} className={list?'hidden sm:block':'block'}><img src={p.image_url||'/images/products/coming-soon.png'} alt={p.name} loading="lazy" className={list?'aspect-square w-24 rounded-lg object-cover':'aspect-[4/3] w-full rounded-lg object-cover'}/></Link>
      <div className="min-w-0"><p className="break-all text-xs text-stone-500">{p.sku||'SKU 확인 필요'} · {p.brand||p.category}</p><Link href={'/products/'+encodeURIComponent(p.id)} className="mt-1 block text-lg font-bold leading-7 hover:text-green-800">{exportMode?p.name_en||p.name:p.name}</Link><p className="mt-2 text-sm text-stone-600">{p.net_weight||p.format} · {p.storage||'보관조건 확인 필요'}</p><p className="mt-1 text-xs text-stone-500">공급 가능 수량·납기는 문의 후 확인</p></div>
      <div className="min-w-0"><ProductPrice product={p}/><QuickOrder key={String(exportMode)} product={p} exportMode={exportMode}/></div>
    </article>)}</div>}
    <nav aria-label="상품 페이지" className="flex items-center justify-center gap-4"><button disabled={paged.page===1} onClick={()=>navigate({page:String(paged.page-1)})} className="rounded border bg-white px-4 py-2 disabled:opacity-30">이전</button><span className="text-sm">{paged.page} / {paged.pages}</span><button disabled={paged.page===paged.pages} onClick={()=>navigate({page:String(paged.page+1)})} className="rounded border bg-white px-4 py-2 disabled:opacity-30">다음</button></nav>
    <div className="rounded-xl bg-stone-100 p-5"><TradeLinks/><p className="mt-3 text-xs text-stone-600">선택한 상품과 수량은 이 브라우저에 보관됩니다. 국내 구매함과 해외 견적함은 별도로 관리하며, 담기는 주문·견적 확정이 아닙니다.</p></div>
  </main>;
}
