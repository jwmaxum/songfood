import { getProducts, getProductById } from '@/lib/products-db';
import ProductDetailClient from './ProductDetailClient';

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({
    id: p.id,
  }));
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const productId = resolvedParams.id;
  const products = await getProducts();

  const product = (await getProductById(productId)) || products[0];

  const relatedProducts = products
    .filter((p) => p.id !== product.id && p.collection === product.collection)
    .slice(0, 3);

  return <ProductDetailClient product={product} relatedProducts={relatedProducts} />;
}
