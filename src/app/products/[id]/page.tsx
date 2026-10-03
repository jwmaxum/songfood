import { getPublicProducts } from '@/lib/products-db';
import ProductDetailClient from './ProductDetailClient';
import { notFound } from 'next/navigation';

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const productId = resolvedParams.id;
  const products = await getPublicProducts();

  const product = products.find(p=>p.id===productId);
  if (!product) notFound();

  const relatedProducts = products
    .filter((p) => p.id !== product.id && p.collection === product.collection)
    .slice(0, 3);

  return <ProductDetailClient key={product.id} product={product} relatedProducts={relatedProducts} />;
}
