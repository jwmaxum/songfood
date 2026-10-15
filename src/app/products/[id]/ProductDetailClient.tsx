'use client';

import { useState } from 'react';
import Link from '@/components/layout/LocalizedLink';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { ProductItem } from '@/lib/types';
import type { DetailNavigation } from '@/lib/catalogue-detail';
import { catalogueReturnForProduct, resultProductHref } from '@/lib/catalogue-detail';
import { catalogueHref, productHref } from '@/lib/catalogue-navigation';
import { productName, collectionLabel, categoryLabel } from '@/lib/catalogue-taxonomy';
import { ProductPrice, PurchasePanel } from '@/components/pricing/ProductPrice';
import ExportSelection from '@/components/storefront/ExportSelection';
import { usePricing } from '@/context/PricingContext';
import { useWishlist } from '@/context/WishlistContext';

export default function ProductDetailClient({
  product,
  relatedProducts,
  navigation,
}: {
  product: ProductItem;
  relatedProducts: ProductItem[];
  navigation: DetailNavigation;
}) {
  const { t: ui, language, text } = useLanguage();
  const { products } = usePricing(), entry = products[product.id], { toggleWishlist, isInWishlist } = useWishlist();
  const images = (product.images?.filter(Boolean).length ? product.images : [product.image_url])!.filter(Boolean).slice(0, 6);
  const [selected, setSelected] = useState(images[0] || '/images/products/coming-soon.png');
  const returnTo = catalogueHref(new URLSearchParams(navigation.returnTo.split('?')[1] || ''), { lang: language });
  const baseParams = new URLSearchParams({ lang: language });
  if (navigation.mode === 'export') baseParams.set('mode', 'export');
  const allProductsHref = catalogueHref(baseParams);
  const collectionHref = catalogueHref(baseParams, { collection: product.collection });
  const categoryHref = catalogueHref(baseParams, { collection: product.collection, category: product.category || '' });
  const name = productName(product, language);
  const switchHref = (mode: 'domestic' | 'export') => productHref(product.id,
    catalogueHref(new URLSearchParams(returnTo.split('?')[1] || ''), { mode: mode === 'export' ? 'export' : '', ...(mode === 'domestic' ? { market: '' } : {}), lang: language }), language);
  const exportSummary = (id: string) => <div className="space-y-1 text-xs leading-5">
    <p className="font-semibold">{text('수출 MOQ: ', 'Export MOQ: ')}{products[id]?.export_moq_ctn ? products[id].export_moq_ctn + ' CTN' : text('확인 필요', 'To be confirmed')}</p>
    <p className="text-amber-900">{text('FOB 견적은 검토 후 안내합니다.', 'FOB quotation requires review.')}</p>
  </div>;
  const details = [
    ['SKU', product.sku], [ui('브랜드 / Brand'), product.brand], [ui('제조사 / Manufacturer'), product.manufacturer],
    [ui('원산지 / Origin'), product.country_of_origin || product.origin], [ui('내용량 / Net weight'), product.net_weight || product.format],
    [ui('보관 / Storage'), product.storage], [ui('소비기한 / Shelf life'), product.shelf_life],
    [ui('생산 납기 / Lead time'), product.production_lead_time], [ui('원재료 / Ingredients'), product.ingredients],
    [ui('알레르기 / Allergens'), product.allergens],
  ];
  return <main className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
    <div className="space-y-3">
      <Link href={catalogueReturnForProduct(returnTo, product.id)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-green-900">
        <span aria-hidden="true">←</span>{navigation.fromResults ? text('검색 결과로 돌아가기', 'Back to results') : text('이 분류 상품 보기', 'Browse this category')}
      </Link>
      <nav aria-label={text('현재 위치', 'Breadcrumb')} className="text-xs text-stone-600">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li><Link href={'/?lang=' + language + (navigation.mode === 'export' ? '&mode=export' : '')} className="inline-flex min-h-11 items-center underline">{text('홈', 'Home')}</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href={allProductsHref} className="inline-flex min-h-11 items-center underline">{text('상품', 'Products')}</Link></li>
          {product.collection && <><li aria-hidden="true">/</li><li><Link href={collectionHref} className="inline-flex min-h-11 items-center underline">{collectionLabel(product.collection, language)}</Link></li></>}
          {product.category && <><li aria-hidden="true">/</li><li><Link href={categoryHref} className="inline-flex min-h-11 items-center underline">{categoryLabel(product.category, language)}</Link></li></>}
          <li aria-hidden="true">/</li><li aria-current="page" className="min-w-0 max-w-full break-words font-medium text-stone-900">{name}</li>
        </ol>
      </nav>
    </div>
    <div className="grid items-start gap-8 lg:grid-cols-[.85fr_1.15fr]">
      <div>
        <img src={selected} alt={name} className="aspect-[4/3] w-full rounded-2xl border border-stone-200 bg-white object-cover" />
        {images.length > 1 && <div className="mt-3 flex flex-wrap gap-2">{images.map((src, i) => <button key={src + i} aria-label={text('상품 이미지 ', 'Product image ') + (i + 1)} aria-pressed={src === selected} onClick={() => setSelected(src)} className="min-h-11 min-w-11 rounded border border-stone-300 p-1"><img src={src} alt="" className="h-14 w-14 rounded object-cover" /></button>)}</div>}
        <p className="mt-4 text-xs text-stone-500">{ui('이미지와 실제 포장은 다를 수 있습니다. 출하 규격은 문의 후 확인합니다.')}</p>
      </div>
      <div className="min-w-0 space-y-5">
        <p className="text-xs font-bold tracking-wider text-green-800">{categoryLabel(product.category || '', language)}{product.sku ? ' · ' + product.sku : ''}</p>
        <h1 className="break-words text-2xl font-bold leading-9 sm:text-3xl">{name}</h1>
        {product.name_en && <p className="text-base text-stone-500">{language === 'en' ? product.name : product.name_en}</p>}
        <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-green-50 px-3 py-2">{product.storage || ui('보관 조건 확인 필요')}</span><span className="rounded-full bg-stone-100 px-3 py-2">{ui('공급 가능 수량·출하일 확인 필요')}</span></div>
        <nav aria-label={text('거래 유형', 'Buying channel')} className="flex flex-wrap gap-2 text-sm">
          <Link href={switchHref('domestic')} aria-current={navigation.mode === 'domestic' ? 'page' : undefined} className={'inline-flex min-h-11 items-center rounded-lg border px-4 py-2 ' + (navigation.mode === 'domestic' ? 'border-green-800 bg-green-800 text-white' : 'border-stone-300 bg-white text-stone-800')}>{text('국내 도매·대용량', 'Korea wholesale & bulk')}</Link>
          <Link href={switchHref('export')} aria-current={navigation.mode === 'export' ? 'page' : undefined} className={'inline-flex min-h-11 items-center rounded-lg border px-4 py-2 ' + (navigation.mode === 'export' ? 'border-amber-700 bg-amber-700 text-white' : 'border-stone-300 bg-white text-stone-800')}>{text('해외 RFQ', 'Export RFQ')}</Link>
        </nav>
        {navigation.mode === 'export' ? <ExportSelection productId={product.id} reviewHref={'/rfq?mode=export&lang=' + language} /> : <PurchasePanel product={product} />}
        <button aria-pressed={isInWishlist(product.id)} onClick={() => toggleWishlist(product)} className="min-h-11 text-sm text-green-800 underline">{isInWishlist(product.id) ? ui('관심상품에서 해제') : ui('관심상품 저장')}</button>
        <Link href={categoryHref} className="flex min-h-11 items-center text-sm text-green-800 underline">{product.category ? text(categoryLabel(product.category, language) + ' 전체 보기', 'Browse all ' + categoryLabel(product.category, language)) : text('같은 대분류 상품 보기', 'Browse this collection')}</Link>
      </div>
    </div>
    <nav aria-label={text('검색 결과 내 상품 이동', 'Navigate search results')} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600">
        <p>{navigation.fromResults ? text('현재 검색 결과', 'Current search results') : text('이 분류의 상품', 'Products in this category')}{navigation.position > 0 ? ' · ' + navigation.position + ' / ' + navigation.total : ''}</p>
        <Link href={catalogueReturnForProduct(returnTo, product.id)} className="inline-flex min-h-11 items-center text-green-800 underline">{navigation.fromResults ? text('검색 결과 보기', 'View results') : text('분류 목록 보기', 'View category')}</Link>
      </div>
      {navigation.position === 0 && <p className="mb-3 text-sm text-stone-600">{text('이 상품은 현재 조건의 최신 검색 결과에 포함되어 있지 않습니다. 조건을 확인해 주세요.', 'This product is no longer in the current results. Review your search filters.')}</p>}
      <div className="grid grid-cols-2 gap-3">
        {navigation.previous ? <Link href={resultProductHref(navigation.previous.id, returnTo, navigation.position - 1, language)} rel="prev" className="min-w-0 rounded-lg border border-stone-300 bg-white p-3 text-sm"><span className="block text-xs text-stone-500">{text('← 이전 상품', '← Previous product')}</span><span className="mt-1 block break-words font-semibold">{productName(navigation.previous, language)}</span></Link> : <span aria-disabled="true" className="flex min-h-14 items-center rounded-lg border border-stone-200 p-3 text-sm text-stone-500">{text('이전 상품 없음', 'No previous product')}</span>}
        {navigation.next ? <Link href={resultProductHref(navigation.next.id, returnTo, navigation.position + 1, language)} rel="next" className="min-w-0 rounded-lg border border-stone-300 bg-white p-3 text-right text-sm"><span className="block text-xs text-stone-500">{text('다음 상품 →', 'Next product →')}</span><span className="mt-1 block break-words font-semibold">{productName(navigation.next, language)}</span></Link> : <span aria-disabled="true" className="flex min-h-14 items-center justify-end rounded-lg border border-stone-200 p-3 text-right text-sm text-stone-500">{text('다음 상품 없음', 'No next product')}</span>}
      </div>
    </nav>
    <section className="grid gap-8 border-t border-stone-200 pt-8 md:grid-cols-2">
      <div>
        <h2 className="text-xl font-bold">{ui('상품·표시 정보')}</h2>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-stone-600">{product.description || ui('상세 상품 자료를 준비하고 있습니다.')}</p>
        <dl className="mt-5 divide-y divide-stone-200">{details.map(([label, value]) => <div key={label} className="grid grid-cols-[minmax(0,100px)_minmax(0,1fr)] gap-3 py-3 text-sm sm:grid-cols-[130px_minmax(0,1fr)]"><dt className="break-words text-stone-500">{label}</dt><dd className="break-words">{value || ui('확인 필요 / To be confirmed')}</dd></div>)}</dl>
      </div>
      <div className="space-y-6">
        <section className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="text-xl font-bold">{navigation.mode === 'export' ? text('수출 포장·최소수량', 'Export packing & minimum') : ui('포장·최소구매 기준')}</h2>
          <div className="mt-4">{navigation.mode === 'export' ? exportSummary(product.id) : <ProductPrice product={product} />}</div>
          {navigation.mode === 'export' ? <>
            {entry?.units.CTN && <p className="mt-3 text-sm">1 CTN = {entry.units.CTN.line.ea_per_unit} EA</p>}
            <p className="mt-4 text-xs text-stone-600">{text('수출 수량·포장과 FOB 조건은 RFQ 검토 후 확정합니다. 검토한 견적은 Proforma Invoice로 발행합니다.', 'Export quantities, packing and FOB terms are reviewed through RFQ. A reviewed quotation is issued as a Proforma Invoice.')}</p>
          </> : <>
            <ul className="mt-3 space-y-2 text-sm">{Object.entries(entry?.units || {}).map(([unit, offer]) => <li key={unit}>1 {unit} = {offer.line.ea_per_unit}{ui(' EA · 최소 ')}{offer.quantity} {unit}</li>)}</ul>
            {!Object.keys(entry?.units || {}).length && <p className="mt-3 text-sm text-stone-500">{ui('검수된 포장 환산은 로그인 후 확인합니다. 미확정 입수는 담당자가 안내합니다.')}</p>}
            <p className="mt-4 text-xs text-stone-600">{ui('선택한 단위의 수량에 따라 서버에서 세금과 상품 합계를 다시 확인합니다. 배송비·수출 조건은 별도 검토합니다.')}</p>
          </>}
        </section>
        <section className="rounded-xl bg-stone-100 p-5">
          <h2 className="text-xl font-bold">{ui('수출·상품 자료')}</h2>
          <dl className="mt-4 space-y-3 text-sm">{[[ui('선적항 / Loading port'), entry?.loading_port], [ui('수출 MOQ'), entry?.export_moq_ctn ? entry.export_moq_ctn + ' CTN' : null], ['HS Code', product.hs_code], [ui('카톤 치수'), product.carton_size], [ui('총중량'), product.gross_weight ? product.gross_weight + ' kg' : null], [ui('등록 대상 국가·지역'), product.target_markets?.join(', ')], [ui('등록 인증 정보'), product.certifications?.join(', ')]].map(([label, value]) => <div key={label}><dt className="text-stone-500">{label}</dt><dd className="break-words">{value || ui('확인 필요 / To be confirmed')}</dd></div>)}</dl>
          <p className="mt-4 text-xs text-stone-600">{ui('대상국·인증 표기는 등록 자료이며 최종 수출 적합성이나 증명서 발급을 보장하지 않습니다. 필요한 라벨·성분·인증 서류를 RFQ에 적어 주세요.')}</p>
          <Link href={'/catalogues?lang=' + language + (navigation.mode === 'export' ? '&mode=export' : '')} className="mt-4 inline-flex min-h-11 items-center text-sm text-green-800 underline">{ui('상품 자료실')}</Link>
        </section>
      </div>
    </section>
    {!!relatedProducts.length && <section className="border-t border-stone-200 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">{ui('함께 살펴볼 상품')}</h2><Link href={categoryHref} className="inline-flex min-h-11 items-center text-sm text-green-800 underline">{text('같은 분류 더 보기', 'More in this category')}</Link></div>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{relatedProducts.map(item => <article key={item.id} className="min-w-0 rounded-xl border border-stone-200 bg-white p-4">
        <Link href={productHref(item.id, returnTo, language)} className="block rounded-lg">
          <img src={item.image_url || '/images/products/coming-soon.png'} alt="" loading="lazy" className="mb-3 aspect-[4/3] w-full rounded-lg border border-stone-100 object-cover" />
          <span className="block break-words font-bold">{productName(item, language)}</span>
        </Link>
        <p className="my-2 text-xs text-stone-500">{item.sku ? item.sku + ' · ' : ''}{item.net_weight || item.format || text('규격 확인 필요', 'Specification to confirm')}</p>{navigation.mode === 'export' ? exportSummary(item.id) : <ProductPrice product={item} />}
      </article>)}</div>
    </section>}
  </main>;
}
