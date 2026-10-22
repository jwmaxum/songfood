'use client';
import Feedback from '@/components/storefront/Feedback';

import {useLanguage} from '@/lib/i18n/LanguageContext';

import {useEffect,useState,useTransition} from 'react';
import Link from '@/components/layout/LocalizedLink';
import {usePathname,useSearchParams} from 'next/navigation';
import type {ProductItem} from '@/lib/types';
import {filterProducts,pageWindow,readFilters,sortProducts,validQuantity} from '@/lib/storefront';
import {usePricing} from '@/context/PricingContext';
import {useCart} from '@/context/CartContext';
import {useRFQ} from '@/context/RFQContext';
import {ProductPrice} from '@/components/pricing/ProductPrice';
import TradeLinks from '@/components/storefront/TradeLinks';
import type {TradeUnit} from '@/lib/pricing/types';
import CategoryNavigation from '@/components/storefront/CategoryNavigation';
import {brandKey,brandLabel,categoryLabel,collectionLabel,productName} from '@/lib/catalogue-taxonomy';
import {catalogueHref,readCatalogueParams,productHref,productAnchor,catalogueSelectionValid,CATALOGUE_PAGE_SIZE} from '@/lib/catalogue-navigation';

function QuickOrder({product,exportMode}:{product:ProductItem;exportMode:boolean}) {
 const {t:ui}=useLanguage();

  const {products}=usePricing(),entry=products[product.id],{addToCart}=useCart(),rfq=useRFQ();
  const [selectedUnit,setUnit]=useState<TradeUnit|null>(null),[count,setCount]=useState<number|null>(null),[message,setMessage]=useState('');
  const unit=exportMode?'CTN':selectedUnit||entry?.minimum_order?.unit||product.purchase_minimum?.unit||'EA';
  const min=exportMode?Math.max(entry?.export_moq_ctn||1,entry?.units.CTN?.quantity||(product.purchase_minimum?.unit==='CTN'?product.purchase_minimum.quantity:1)):entry?.units[unit]?.quantity||product.purchase_minimum?.quantity||1;
  const quantity=count??min;
  return <div className="mt-4 space-y-2">
    <div className="flex flex-wrap gap-2">
      <label className="text-xs">{ui("단위 / Unit")}<select aria-label={product.sku+ui(" 구매 단위")} value={unit} disabled={exportMode} onChange={e=>{setUnit(e.target.value as TradeUnit);setCount(null);setMessage('');}} className="mt-1 block min-h-11 rounded border border-stone-300 bg-white p-2 text-sm">{['EA','BOX','CTN'].map(u=><option key={u}>{u}</option>)}</select></label>
      <label className="text-xs">{ui("수량 / Quantity")}<input aria-label={product.sku+ui(" 수량")} type="number" min={1} max={100000} step={1} value={quantity} onChange={e=>{setCount(Number(e.target.value));setMessage('');}} className="mt-1 block min-h-11 w-24 rounded border border-stone-300 p-2 text-sm"/></label>
      <button disabled={!validQuantity(quantity)||!rfq.ready} onClick={()=>{
        if(exportMode){const added=rfq.add(product.id,quantity);setMessage(added?ui("해외 견적함에 담았습니다. / Added to RFQ."):ui("담지 못했습니다. 견적함 품목 수와 수량 한도를 확인해 주세요."));}
        else {addToCart(product,quantity,undefined,undefined,unit==='CTN'?'carton':unit==='BOX'?'box':'ea',undefined,undefined,false);setMessage(ui("국내 구매함에 담았습니다. 구매함에서 가격·최소수량을 확인해 주세요."));}
      }} className="self-end min-h-11 rounded-lg bg-green-900 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-40">{exportMode?ui("RFQ 담기"):ui("구매함 담기")}</button>
    </div>
    {exportMode&&<p className="text-xs text-stone-600">Export MOQ: {entry?.export_moq_ctn?entry.export_moq_ctn+' CTN':ui("확인 필요 / To be confirmed")}</p>}
    {message&&<Feedback  className="text-xs text-green-900">{message}</Feedback>}
  </div>;
}
export default function CollectionShowcaseClient({initialProducts}:{initialProducts:ProductItem[]}) {
 const {t:ui,text,language}=useLanguage(),params=useSearchParams(),pathname=usePathname();
 const raw=params.toString(),search=readCatalogueParams(raw),filters=readFilters(search),exportMode=search.get('mode')==='export';
 const [pending,startTransition]=useTransition();
 const products=initialProducts;
 const filtered=sortProducts(filterProducts(products,filters),search.get('sort')||'relevance',filters.q,language);
 const paged=pageWindow(filtered,search.get('page'),CATALOGUE_PAGE_SIZE),list=search.get('view')==='list';
 const location=catalogueHref(search,{...(params.has('page')?{page:String(paged.page)}:{})},pathname);
 const returnTo=catalogueHref(search,{page:String(paged.page),lang:language});
 const {addToCart}=useCart(),rfq=useRFQ();
 const pageIds=paged.items.map(p=>p.id).join('|');
 const brandChoices=[...new Map(initialProducts.filter(p=>p.brand).map(p=>[brandKey(p.brand!),p.brand!])).entries()].sort((a,b)=>brandLabel(a[1],language).localeCompare(brandLabel(b[1],language),language));
 const markets=[...new Set(initialProducts.flatMap(p=>p.target_markets||[]))].sort();
 const validSelection=catalogueSelectionValid(search);
 const advanced=['brand','storage','market','minimum','maxMinimum'] as const;
 const chips=([
  ['q',filters.q],['collection',filters.collection?collectionLabel(filters.collection,language):''],['category',filters.category?categoryLabel(filters.category,language):''],
  ['brand',filters.brand?brandLabel(filters.brand,language):''],['storage',filters.storage?({frozen:text('냉동','Frozen'),chilled:text('냉장','Chilled'),ambient:text('상온','Ambient'),unknown:text('보관 확인 필요','Storage to confirm')}[filters.storage]||filters.storage):''],
  ['market',filters.market],['minimum',filters.minimum],['maxMinimum',filters.maxMinimum?text('최소수량 상한 ','Maximum MOQ ')+filters.maxMinimum:''],['cat',filters.legacy]
 ] as [string,string][]).filter(([,value])=>!!value);
 const clear={q:'',collection:'',category:'',brand:'',storage:'',market:'',minimum:'',maxMinimum:'',cat:'',page:'1'};
 function navigate(changes:Record<string,string>,scroll=false){
  const href=catalogueHref(search,changes,pathname);
  startTransition(()=>window.history.pushState(null,'',href));
  if(scroll)document.getElementById('catalogue-results')?.scrollIntoView({block:'start'});
 }
 function remember(id:string){
  const hash='#'+encodeURIComponent(productAnchor(id));
  window.history.replaceState(window.history.state,'',window.location.pathname+window.location.search+hash);
 }
 function detailHref(id:string){return productHref(id,returnTo+'#'+encodeURIComponent(productAnchor(id)),language);}
 useEffect(()=>{
  if(window.location.pathname+window.location.search!==location)window.history.replaceState(window.history.state,'',location+window.location.hash);
 },[location]);
 useEffect(()=>{
  function restore(){
   try{
    const id=decodeURIComponent(window.location.hash.slice(1));
    if(!id.startsWith('product-'))return;
    const card=document.getElementById(id);
    if(card){card.focus({preventScroll:true});card.scrollIntoView({block:'center'});}
   }catch{/* An invalid fragment never changes the catalogue. */}
  }
  const frame=requestAnimationFrame(restore);
  window.addEventListener('popstate',restore);window.addEventListener('hashchange',restore);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('popstate',restore);window.removeEventListener('hashchange',restore);};
 },[raw,pageIds]);
 return <main className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6 sm:py-6">
  <header className="flex flex-wrap items-center justify-between gap-3">
   <div><h1 className="text-xl font-bold leading-8 sm:text-3xl">{filters.collection?collectionLabel(filters.collection,language):exportMode?ui('수출 상품 / Export catalogue'):ui('국내 도매·대용량 상품')}</h1>
   <p className="mt-1 hidden text-sm text-stone-600 sm:block">{text('개인·사업자 모두 이용할 수 있습니다. 포장·최소수량과 공급 조건을 확인하세요.','Individuals and businesses are welcome. Review packaging, minimum quantities and supply terms.')}</p></div>
   <nav aria-label={ui('구매 유형')} className="flex flex-wrap gap-2">
    <button aria-pressed={!exportMode} onClick={()=>navigate({mode:'',market:'',page:'1'})} className={'min-h-11 rounded-lg border px-3 text-sm '+(!exportMode?'bg-green-900 text-white':'bg-white')}>{text('국내 구매','Domestic')}</button>
    <button aria-pressed={exportMode} onClick={()=>navigate({mode:'export',page:'1'})} className={'min-h-11 rounded-lg border px-3 text-sm '+(exportMode?'bg-amber-800 text-white':'bg-white')}>Export RFQ · CTN</button>
   </nav>
  </header>
  {!validSelection&&<section aria-label={text('분류 변경 안내','Category update')} className="rounded-xl border border-amber-300 bg-amber-50 p-4">
   <h2 className="font-bold">{text('이 분류가 변경되었거나 현재 상품 분류와 맞지 않습니다.','This category has changed or no longer matches the catalogue.')}</h2>
   <p className="mt-2 text-sm">{text('아래 카테고리에서 다시 선택하거나 전체 상품을 확인하세요.','Choose a category below or browse all products.')}</p>
   <button onClick={()=>navigate(clear)} className="mt-2 min-h-11 text-sm font-bold underline">{text('전체 상품 보기','Browse all products')}</button>
  </section>}
  <div className="grid items-start gap-4 lg:grid-cols-[210px_minmax(0,1fr)]">
   <aside className="min-w-0"><CategoryNavigation products={products} params={search.toString()} desktopSidebar/></aside>
   <section className="min-w-0 space-y-4" aria-label={text('상품 검색 결과','Product search results')}>
    <form key={raw} aria-label={ui('상품 검색과 필터')} onSubmit={e=>{
     e.preventDefault();const values=Object.fromEntries(new FormData(e.currentTarget));navigate({...Object.fromEntries(Object.entries(values).map(([k,v])=>[k,String(v)])),page:'1'});
    }} className="space-y-2 rounded-xl border border-stone-200 bg-white p-3">
     <div className="flex items-center gap-2">
      <label className="min-w-0 flex-1"><span className="sr-only">{ui('SKU·상품명·브랜드 검색')}</span><input type="search" name="q" defaultValue={filters.q} maxLength={200} placeholder={ui('예: 김치, SKU, 브랜드명')} className="min-h-11 w-full rounded-lg border border-stone-400 px-3 text-base"/></label>
      <button className="min-h-11 shrink-0 rounded-lg bg-green-900 px-3 text-sm font-bold text-white">{ui('검색·필터 적용')}</button>
     </div>
     <details open={advanced.some(k=>!!filters[k])||undefined} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.currentTarget.open=false;e.currentTarget.querySelector('summary')?.focus();}}}>
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">{ui('상세 필터 / Filters')}</summary>
      <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
       <label className="text-sm">{ui('브랜드')}<select name="brand" defaultValue={filters.brand?brandKey(filters.brand):''} className="mt-1 min-h-11 w-full rounded border border-stone-400 bg-white px-2"><option value="">{ui('전체')}</option>{brandChoices.map(([key,value])=><option key={key} value={key}>{brandLabel(value,language)}</option>)}</select></label>
       <label className="text-sm">{ui('보관 온도')}<select name="storage" defaultValue={filters.storage} className="mt-1 min-h-11 w-full rounded border border-stone-400 bg-white px-2"><option value="">{ui('전체')}</option><option value="frozen">{ui('냉동')}</option><option value="chilled">{ui('냉장')}</option><option value="ambient">{ui('실온·상온')}</option><option value="unknown">{ui('기타·확인 필요')}</option></select></label>
       {exportMode&&<label className="text-sm">{ui('수출 대상 국가·지역 (등록 정보)')}<select name="market" defaultValue={filters.market} className="mt-1 min-h-11 w-full rounded border border-stone-400 bg-white px-2"><option value="">{ui('전체')}</option>{markets.map(m=><option key={m}>{m}</option>)}</select></label>}
       <label className="text-sm">{ui('최소구매단위')}<select name="minimum" defaultValue={filters.minimum} className="mt-1 min-h-11 w-full rounded border border-stone-400 bg-white px-2"><option value="">{ui('전체')}</option>{['EA','BOX','CTN'].map(unit=><option key={unit}>{unit}</option>)}<option value="unknown">{ui('확인 필요')}</option></select></label>
       <label className="text-sm">{ui('최소구매수량 상한 (선택 단위 기준)')}<input name="maxMinimum" type="number" min={1} max={1000000} defaultValue={filters.maxMinimum} className="mt-1 min-h-11 w-full rounded border border-stone-400 px-2"/></label>
      </div>
      <p className="mt-2 text-xs leading-5 text-stone-600">{ui('수량 상한은 EA/BOX/CTN 중 한 단위를 선택했을 때 적용합니다. 대상국 정보는 수출 허가를 의미하지 않으며 실제 공급 조건을 확인합니다.')} {text('최소수량 필터는 카탈로그 공개 기준이며, 계정별 실제 구매 조건은 상품에서 확인하세요.','Minimum quantity filters use the public catalogue. Check your account-specific purchasing terms on the product.')}</p>
     </details>
     {!!chips.length&&<div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-2" aria-label={text('적용된 검색 조건','Applied filters')}>
      {chips.map(([key,value])=><button key={key} type="button" aria-label={text(value+' 해제','Remove '+value)} onClick={()=>navigate({[key]:'',...(key==='minimum'?{maxMinimum:''}:{}),page:'1'})} className="min-h-11 max-w-full break-words rounded-lg bg-green-50 px-3 py-2 text-left text-xs text-green-950">{value} <span aria-hidden="true">×</span></button>)}
      <button type="button" onClick={()=>navigate(clear)} className="min-h-11 px-2 text-sm text-green-800 underline">{ui('필터 초기화')}</button>
     </div>}
    </form>
    <div id="catalogue-results" className="flex scroll-mt-4 flex-wrap items-center justify-between gap-2">
     <Feedback className="text-sm">{pending?ui('검색 중…'):paged.total+ui('개 상품 · ')+(paged.total?paged.page+' / '+paged.pages+ui(' 페이지'):'')}</Feedback>
     <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="catalogue-sort">{text('상품 정렬','Sort products')}</label>
      <select id="catalogue-sort" value={search.get('sort')||'relevance'} onChange={e=>navigate({sort:e.target.value,page:'1'})} className="min-h-11 max-w-40 rounded-lg border border-stone-400 bg-white px-2 text-sm">
       <option value="relevance">{text('기본·관련도','Relevance')}</option><option value="name">{text('상품명 오름차순','Name A–Z')}</option><option value="name-desc">{text('상품명 내림차순','Name Z–A')}</option><option value="sku">SKU</option><option value="featured">{text('관리자 추천','Featured')}</option>
      </select>
      <button aria-pressed={list} onClick={()=>navigate({view:'list'})} className="min-h-11 rounded-lg border px-3 text-sm">{ui('목록')}</button><button aria-pressed={!list} onClick={()=>navigate({view:'grid'})} className="min-h-11 rounded-lg border px-3 text-sm">{ui('카드')}</button>
     </div>
    </div>
    {!paged.total?<section className="rounded-xl border border-dashed p-6 text-center">
     <h2 className="font-bold">{ui('조건에 맞는 상품이 없습니다.')}</h2><p className="mt-2 text-sm text-stone-600">{ui('검색어나 필터를 줄이거나 필요한 상품을 문의해 주세요.')}</p>
     <div className="mt-3 flex flex-wrap justify-center gap-3"><button onClick={()=>navigate(clear)} className="min-h-11 text-sm text-green-800 underline">{ui('필터 초기화')}</button>
     {filters.collection&&<Link href={catalogueHref(search,{q:'',category:'',brand:'',storage:'',market:'',minimum:'',maxMinimum:'',cat:'',page:'1'})} className="min-h-11 py-3 text-sm text-green-800 underline">{text('현재 대분류 보기','Browse this category')}</Link>}
     <Link href={exportMode?'/rfq':'/wholesale'} className="min-h-11 py-3 text-sm text-green-800 underline">{exportMode?text('해외 상품 문의 · RFQ','Ask about export products · RFQ'):ui('상품 문의')}</Link></div>
    </section>:<div aria-busy={pending} className={list?'space-y-3':'space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 sm:gap-4'}>
     {paged.items.map(p=>{
      const discountPct = p.deal_discount_percent || (p.original_price && p.price && p.original_price > p.price ? Math.round((1 - p.price / p.original_price) * 100) : 0);
      const couponPrice = p.price ? Math.round((p.price * 0.9) / 10) * 10 : null;
      if (list) {
       return <article key={p.id} id={productAnchor(p.id)} tabIndex={-1} className="min-w-0 scroll-mt-4 rounded-xl border border-stone-200 bg-white p-3 outline-green-700 grid grid-cols-[64px_minmax(0,1fr)] gap-3 sm:grid-cols-[80px_minmax(0,1fr)] xl:grid-cols-[80px_minmax(0,1fr)_minmax(220px,260px)]">
        <Link href={detailHref(p.id)} onClick={event=>{if(event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey)remember(p.id);}} className="block">
         <img src={p.image_url||'/images/products/coming-soon.png'} alt={productName(p,language)} loading="lazy" className="aspect-square w-16 rounded-lg object-cover sm:w-20"/>
        </Link>
        <div className="min-w-0">
         <div className="mb-1">
          {exportMode ? <span className="inline-block rounded border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">{text('수출용', 'Export')}</span> : <span className="inline-block rounded border border-emerald-300 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-900">{text('직배송', 'Direct Delivery')}</span>}
         </div>
         <p className="break-all text-xs text-stone-700">{p.sku||ui('SKU 확인 필요')} · {brandLabel(p.brand||'',language)||categoryLabel(p.category||'',language)}</p>
         <Link href={detailHref(p.id)} onClick={event=>{if(event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey)remember(p.id);}} className="mt-1 block break-words text-base font-bold leading-6 hover:text-green-800">{productName(p,language)}</Link>
         <p className="mt-2 text-sm text-stone-700">{p.net_weight||p.format||text('규격 확인 필요','Specification to confirm')} · {p.storage||ui('보관조건 확인 필요')}</p>
         <Link href={catalogueHref(search,{collection:p.collection,category:p.category||'',page:'1'})} className="mt-1 inline-flex min-h-11 items-center text-xs text-green-900 underline">{categoryLabel(p.category||p.collection,language)}</Link>
        </div>
        <div className="col-span-2 min-w-0 border-t border-stone-100 pt-2 xl:col-span-1 xl:border-t-0 xl:pt-0">
         {exportMode?(
          <div className="space-y-1 text-xs leading-5 text-stone-700">
           <p className="font-semibold text-stone-900">{text('해외 카톤 견적','Export carton quotation')}</p>
           <p>{text('VAT 제외 FOB 조건은 RFQ에서 확인합니다.','Review VAT-excluded FOB terms in your RFQ.')}</p>
           <Link
            href={`/labeling?product=${p.id}&mode=export&lang=${language}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-900 hover:text-amber-950 underline"
           >
            <span aria-hidden="true">🏷️</span>
            <span>{text('수출국별 라벨·스펙시트', 'Export Label & Spec')}</span>
            <span aria-hidden="true">&nearr;</span>
           </Link>
          </div>
         ):<ProductPrice product={p}/>}
         <QuickOrder key={String(exportMode)} product={p} exportMode={exportMode}/>
        </div>
       </article>;
      }
      return <article key={p.id} id={productAnchor(p.id)} tabIndex={-1} className="min-w-0 scroll-mt-4 rounded-xl border border-stone-200 bg-white p-3 outline-green-700 grid grid-cols-[64px_minmax(0,1fr)] gap-3 sm:flex sm:flex-col sm:justify-between sm:p-3 sm:shadow-sm sm:hover:shadow-md sm:hover:border-stone-300 transition-all">
       <div className="relative aspect-square w-16 sm:w-full overflow-hidden rounded-lg bg-stone-50 flex items-center justify-center border border-stone-100">
        <Link href={detailHref(p.id)} onClick={event=>{if(event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey)remember(p.id);}} className="block h-full w-full">
         <img
          src={p.image_url||'/images/products/coming-soon.png'}
          alt={productName(p,language)}
          loading="lazy"
          className="h-full w-full object-contain p-1 sm:p-2 transition-transform duration-300 group-hover:scale-105"
         />
        </Link>
        <button
         type="button"
         aria-label={productName(p,language)+' '+(exportMode?ui('RFQ 담기'):ui('구매함 담기'))}
         onClick={(e)=>{
          e.preventDefault();
          e.stopPropagation();
          if(exportMode){rfq.add(p.id,1);}
          else{addToCart(p,1,undefined,undefined,'ea',undefined,undefined,false);}
         }}
         className="hidden sm:flex absolute bottom-2 right-2 h-8 w-8 items-center justify-center rounded-lg border border-stone-300 bg-white/95 text-stone-700 shadow-sm transition hover:bg-stone-50 hover:text-green-800"
        >
         <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
         </svg>
        </button>
       </div>
       <div className="min-w-0 sm:mt-2.5 sm:flex-1">
        <div>
         {exportMode ? (
          <span className="inline-block rounded border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
           {text('수출용', 'Export')}
          </span>
         ) : (
          <span className="inline-block rounded border border-emerald-300 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-900">
           {text('직배송', 'Direct Delivery')}
          </span>
         )}
        </div>
        <p className="mt-1 truncate text-xs font-medium text-stone-700">
         {p.sku ? p.sku + ' · ' : ''}{brandLabel(p.brand||'',language)||(language==='ko'?'온국민 신선몰':'Songfood Direct')}
        </p>
        <Link
         href={detailHref(p.id)}
         onClick={event=>{if(event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey)remember(p.id);}}
         className="mt-1 block text-xs sm:text-sm font-semibold text-stone-900 leading-snug line-clamp-2 min-h-[2.5rem] hover:text-green-800"
        >
         {productName(p,language)}
        </Link>
        <div className="mt-1.5 space-y-0.5">
         {p.price ? (
          <>
           {discountPct > 0 && p.original_price ? (
            <div className="flex flex-wrap items-baseline gap-1">
             <span className="text-xs sm:text-sm font-extrabold text-amber-900">
              {discountPct}%
             </span>
             <span className="text-xs sm:text-sm font-bold text-stone-900">
              {p.price.toLocaleString()}원
             </span>
             <span className="text-[10px] sm:text-xs text-stone-600 line-through">
              {p.original_price.toLocaleString()}원
             </span>
            </div>
           ) : (
            <div className="flex items-baseline gap-1">
             <span className="text-xs sm:text-sm font-bold text-stone-900">
              {p.price.toLocaleString()}원
             </span>
            </div>
           )}
           {couponPrice && (
            <div className="text-xs font-bold text-amber-900">
             <span className="mr-1 text-[11px] font-semibold text-stone-700">쿠폰가</span>
             {couponPrice.toLocaleString()}원
            </div>
           )}
           <div className="pt-0.5">
            <span className="inline-flex items-center gap-1 rounded border border-rose-300 bg-rose-100 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold text-rose-900">
             <svg aria-hidden="true" className="h-2.5 w-2.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.5 4A1.5 1.5 0 001 5.5v1.6a2 2 0 010 3.8v1.6A1.5 1.5 0 002.5 14h15a1.5 1.5 0 001.5-1.5v-1.6a2 2 0 010-3.8V5.5A1.5 1.5 0 0017.5 4h-15zM7 7.5a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 3.5a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" />
             </svg>
             <span>{text('쿠폰 받으면 20% 더', 'Extra 20% off with coupon')}</span>
            </span>
           </div>
          </>
         ) : null}
        </div>
        <p className="mt-1 text-xs text-stone-700">
         {p.net_weight||p.format||text('규격 확인 필요','Specification to confirm')} · {p.storage||ui('보관조건 확인 필요')}
        </p>
        <Link href={catalogueHref(search,{collection:p.collection,category:p.category||'',page:'1'})} className="mt-0.5 inline-flex min-h-8 items-center text-xs text-green-900 underline">
         {categoryLabel(p.category||p.collection,language)}
        </Link>
       </div>
       <div className="col-span-2 min-w-0 border-t border-stone-100 pt-2 sm:col-span-1 sm:mt-2.5">
        {exportMode?(
         <div className="space-y-0.5 text-[11px] leading-4 text-stone-700">
          <p className="font-semibold text-stone-900">{text('해외 카톤 견적','Export carton quotation')}</p>
          <p className="text-[10px]">{text('VAT 제외 FOB 조건은 RFQ에서 확인합니다.','Review VAT-excluded FOB terms in your RFQ.')}</p>
          <div className="pt-1">
           <Link
            href={`/labeling?product=${p.id}&mode=export&lang=${language}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 hover:text-amber-950 underline"
           >
            <span aria-hidden="true">🏷️</span>
            <span>{text('수출국별 라벨·스펙시트', 'Export Label & Spec')}</span>
            <span aria-hidden="true">&nearr;</span>
           </Link>
          </div>
         </div>
        ):(
         <ProductPrice product={p}/>
        )}
        <QuickOrder key={String(exportMode)} product={p} exportMode={exportMode}/>
       </div>
      </article>;
     })}
    </div>}
    {!!paged.total&&<nav aria-label={ui('상품 페이지')} className="flex flex-wrap items-center justify-center gap-2">
     <button disabled={paged.page===1} onClick={()=>navigate({page:String(paged.page-1)},true)} className="min-h-11 rounded-lg border bg-white px-3 disabled:opacity-30">{ui('이전')}</button>
     {Array.from({length:Math.min(5,paged.pages)},(_,i)=>Math.min(Math.max(1,paged.page-2),Math.max(1,paged.pages-4))+i).map(page=><button key={page} aria-current={page===paged.page?'page':undefined} onClick={()=>navigate({page:String(page)},true)} className="min-h-11 min-w-11 rounded-lg border bg-white px-2 aria-[current=page]:bg-green-900 aria-[current=page]:text-white">{page}</button>)}
     <span className="px-1 text-xs text-stone-600">{paged.page} / {paged.pages}</span>
     <button disabled={paged.page===paged.pages} onClick={()=>navigate({page:String(paged.page+1)},true)} className="min-h-11 rounded-lg border bg-white px-3 disabled:opacity-30">{ui('다음')}</button>
    </nav>}
   </section>
  </div>
  <div className="rounded-xl bg-stone-100 p-4"><TradeLinks/><p className="mt-3 text-xs text-stone-600">{ui('선택한 상품과 수량은 이 브라우저에 보관됩니다. 국내 구매함과 해외 견적함은 별도로 관리하며, 담기는 주문·견적 확정이 아닙니다.')}</p></div>
 </main>;
}
