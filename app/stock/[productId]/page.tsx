import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetailPage } from "@/components/catalog/product-detail-page";
import { getCatalogProductById } from "@/lib/catalog";
import { siteConfig } from "@/lib/site";

interface StockProductPageProps {
  params: Promise<{ productId: string }>;
}

export async function generateMetadata({ params }: StockProductPageProps): Promise<Metadata> {
  const { productId } = await params;
  const product = await getCatalogProductById("stock", productId);

  if (!product) {
    return {};
  }

  return {
    title: `${product.name} | ${siteConfig.title}`,
    description: `${product.name} en stock inmediato en thewestrep con precio visible y atención por WhatsApp.`,
  };
}

export default async function StockProductPage({ params }: StockProductPageProps) {
  const { productId } = await params;
  const product = await getCatalogProductById("stock", productId);

  if (!product) {
    notFound();
  }

  return <ProductDetailPage product={product} />;
}
