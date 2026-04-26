import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetailPage } from "@/components/catalog/product-detail-page";
import { getCatalogProducts } from "@/lib/catalog";
import { createProductMetadata } from "@/lib/seo";

interface ProductBySlugPageProps {
  params: Promise<{ slug: string }>;
}

async function getPublishedProductBySlug(slug: string) {
  const products = await getCatalogProducts({ states: ["published"] });
  return products.find((product) => product.slug === slug) ?? null;
}

export async function generateMetadata({ params }: ProductBySlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublishedProductBySlug(slug);

  if (!product) {
    return {};
  }

  return createProductMetadata(product);
}

export default async function ProductBySlugPage({ params }: ProductBySlugPageProps) {
  const { slug } = await params;
  const product = await getPublishedProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return <ProductDetailPage product={product} />;
}
