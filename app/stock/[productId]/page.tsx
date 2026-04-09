import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetailPage } from "@/components/catalog/product-detail-page";
import { getCatalogProductById } from "@/lib/catalog";
import { createProductMetadata } from "@/lib/seo";

interface StockProductPageProps {
  params: Promise<{ productId: string }>;
}

export async function generateMetadata({ params }: StockProductPageProps): Promise<Metadata> {
  const { productId } = await params;
  const product = await getCatalogProductById("stock", productId);

  if (!product) {
    return {};
  }

  return createProductMetadata(product);
}

export default async function StockProductPage({ params }: StockProductPageProps) {
  const { productId } = await params;
  const product = await getCatalogProductById("stock", productId);

  if (!product) {
    notFound();
  }

  return <ProductDetailPage product={product} />;
}
