import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetailPage } from "@/components/catalog/product-detail-page";
import { getCatalogProductById } from "@/lib/catalog";
import { createProductMetadata } from "@/lib/seo";

interface EncargueProductPageProps {
  params: Promise<{ productId: string }>;
}

export async function generateMetadata({ params }: EncargueProductPageProps): Promise<Metadata> {
  const { productId } = await params;
  const product = await getCatalogProductById("encargue", productId);

  if (!product) {
    return {};
  }

  return createProductMetadata(product);
}

export default async function EncargueProductPage({ params }: EncargueProductPageProps) {
  const { productId } = await params;
  const product = await getCatalogProductById("encargue", productId);

  if (!product) {
    notFound();
  }

  return <ProductDetailPage product={product} />;
}
