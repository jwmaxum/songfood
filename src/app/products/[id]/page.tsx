import { getPublicProducts } from '@/lib/products-db';
import { detailNavigation, relatedPublicProducts } from '@/lib/catalogue-detail';
import ProductDetailClient from './ProductDetailClient';
import { notFound } from 'next/navigation';
import { serverLanguage } from '@/lib/i18n/server';

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query, products, { language }] = await Promise.all([params, searchParams, getPublicProducts(), serverLanguage()]);
  const product = products.find(item => item.id === id);
  if (!product) notFound();

  const detailParams = new URLSearchParams();
  for (const key of ['returnTo', 'mode', 'lang']) {
    if (typeof query[key] === 'string') detailParams.set(key, query[key]);
  }
  if (!detailParams.has('lang')) detailParams.set('lang', language);
  const navigation = detailNavigation(products, product, detailParams);
  const relatedProducts = relatedPublicProducts(products, product);

  return <ProductDetailClient key={product.id} product={product} relatedProducts={relatedProducts} navigation={navigation} />;
}
