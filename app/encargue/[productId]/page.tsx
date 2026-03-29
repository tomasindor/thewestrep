import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetailPage } from "@/components/catalog/product-detail-page";
import { getCatalogProductById } from "@/lib/catalog";
import { siteConfig } from "@/lib/site";

interface EncargueProductPageProps {
  params: Promise<{ productId: string }>;
}

export async function generateMetadata({ params }: EncargueProductPageProps): Promise<Metadata> {
  const { productId } = await params;
  const product = await getCatalogProductById("encargue", productId);

  if (!product) {
    return {};
  }

  return {
    title: `${product.name} | ${siteConfig.title}`,
    description: `${product.name} por encargue en thewestrep con precio visible y atención por WhatsApp.`,
  };
}

export default async function EncargueProductPage({ params }: EncargueProductPageProps) {
  const { productId } = await params;
  const product = await getCatalogProductById("encargue", productId);

  if (!product) {
    notFound();
  }

  return <ProductDetailPage product={product} />;
}
