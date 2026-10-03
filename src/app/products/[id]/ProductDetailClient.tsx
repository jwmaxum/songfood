'use client';
import {useState} from 'react';
import Link from 'next/link';
import type {ProductItem} from '@/lib/types';
import {ProductPrice,PurchasePanel} from '@/components/pricing/ProductPrice';
import ExportSelection from '@/components/storefront/ExportSelection';
import {usePricing} from '@/context/PricingContext';
import {useWishlist} from '@/context/WishlistContext';
export default function ProductDetailClient({product,relatedProducts}:{product:ProductItem;relatedProducts:ProductItem[]}) {
  const {products}=usePricing(),entry=products[product.id],{toggleWishlist,isInWishlist}=useWishlist();
  const images=(product.images?.filter(Boolean).length?product.images:[product.image_url])!.slice(0,6);
  const [selected,setSelected]=useState(images[0]||'/images/products/coming-soon.png');
  const details=[['SKU',product.sku],['브랜드 / Brand',product.brand],['제조사 / Manufacturer',product.manufacturer],['원산지 / Origin',product.country_of_origin||product.origin],['내용량 / Net weight',product.net_weight||product.format],['보관 / Storage',product.storage],['소비기한 / Shelf life',product.shelf_life],['생산 납기 / Lead time',product.production_lead_time],['원재료 / Ingredients',product.ingredients],['알레르기 / Allergens',product.allergens]];
  return <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6">
    <nav aria-label="현재 위치" className="flex flex-wrap gap-3 text-xs text-stone-500"><Link href="/">홈</Link><span>/</span><Link href="/shop">상품 카탈로그</Link><span>/</span><span>{product.sku||product.category}</span></nav>
    <div className="grid items-start gap-8 lg:grid-cols-[.85fr_1.15fr]">
      <div><img src={selected} alt={product.name} className="aspect-[4/3] w-full rounded-2xl border border-stone-200 bg-white object-cover"/>{images.length>1&&<div className="mt-3 flex flex-wrap gap-2">{images.map((src,i)=><button key={src+i} aria-label={'상품 이미지 '+(i+1)} aria-pressed={src===selected} onClick={()=>setSelected(src)} className="rounded border border-stone-300 p-1"><img src={src} alt="" className="h-14 w-14 rounded object-cover"/></button>)}</div>}<p className="mt-4 text-xs text-stone-500">이미지와 실제 포장은 다를 수 있습니다. 출하 규격은 문의 후 확인합니다.</p></div>
      <div className="min-w-0 space-y-5"><p className="text-xs font-bold tracking-widest text-green-800">{product.category} · {product.sku}</p><h1 className="text-2xl font-bold leading-9 sm:text-3xl">{product.name}</h1>{product.name_en&&<p className="text-base text-stone-500">{product.name_en}</p>}
        <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-green-50 px-3 py-2">{product.storage||'보관 조건 확인 필요'}</span><span className="rounded-full bg-stone-100 px-3 py-2">공급 가능 수량·출하일 확인 필요</span></div>
        <PurchasePanel product={product}/>
        <ExportSelection productId={product.id}/>
        <button aria-pressed={isInWishlist(product.id)} onClick={()=>toggleWishlist(product)} className="text-sm text-green-800 underline">{isInWishlist(product.id)?'관심상품에서 해제':'관심상품 저장'}</button>
      </div>
    </div>
    <section className="grid gap-8 border-t border-stone-200 pt-8 md:grid-cols-2"><div><h2 className="text-xl font-bold">상품·표시 정보</h2><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-stone-600">{product.description||'상세 상품 자료를 준비하고 있습니다.'}</p><dl className="mt-5 divide-y divide-stone-200">{details.map(([name,value])=><div key={name} className="grid grid-cols-[130px_minmax(0,1fr)] gap-4 py-3 text-sm"><dt className="text-stone-500">{name}</dt><dd className="break-words">{value||'확인 필요 / To be confirmed'}</dd></div>)}</dl></div>
      <div className="space-y-6"><section className="rounded-xl border border-stone-200 bg-white p-5"><h2 className="text-xl font-bold">포장·최소구매 기준</h2><div className="mt-4"><ProductPrice product={product}/></div><ul className="mt-3 space-y-2 text-sm">{Object.entries(entry?.units||{}).map(([unit,offer])=><li key={unit}>1 {unit} = {offer.line.ea_per_unit} EA · 최소 {offer.quantity} {unit}</li>)}</ul>{!Object.keys(entry?.units||{}).length&&<p className="mt-3 text-sm text-stone-500">검수된 포장 환산은 로그인 후 확인합니다. 미확정 입수는 담당자가 안내합니다.</p>}<p className="mt-4 text-xs text-stone-600">선택한 단위의 수량에 따라 서버에서 세금과 상품 합계를 다시 확인합니다. 배송비·수출 조건은 별도 검토합니다.</p></section>
      <section className="rounded-xl bg-stone-100 p-5"><h2 className="text-xl font-bold">수출·상품 자료</h2><dl className="mt-4 space-y-3 text-sm">{[['선적항 / Loading port',entry?.loading_port],['수출 MOQ',entry?.export_moq_ctn?entry.export_moq_ctn+' CTN':null],['HS Code',product.hs_code],['카톤 치수',product.carton_size],['총중량',product.gross_weight?product.gross_weight+' kg':null],['등록 대상 국가·지역',product.target_markets?.join(', ')],['등록 인증 정보',product.certifications?.join(', ')]].map(([name,value])=><div key={name}><dt className="text-stone-500">{name}</dt><dd>{value||'확인 필요 / To be confirmed'}</dd></div>)}</dl><p className="mt-4 text-xs text-stone-600">대상국·인증 표기는 등록 자료이며 최종 수출 적합성이나 증명서 발급을 보장하지 않습니다. 필요한 라벨·성분·인증 서류를 RFQ에 적어 주세요.</p><Link href="/catalogues" className="mt-4 inline-block text-sm text-green-800 underline">상품 자료실</Link></section></div>
    </section>
    {!!relatedProducts.length&&<section className="border-t border-stone-200 pt-8"><div className="flex justify-between"><h2 className="text-xl font-bold">함께 살펴볼 상품</h2><Link href="/shop" className="text-sm text-green-800 underline">전체 상품</Link></div><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{relatedProducts.slice(0,4).map(p=><article key={p.id} className="rounded-xl border bg-white p-4"><Link href={'/products/'+encodeURIComponent(p.id)} className="block font-bold">{p.name}</Link><p className="my-2 text-xs text-stone-500">{p.format}</p><ProductPrice product={p}/></article>)}</div></section>}
  </main>;
}
