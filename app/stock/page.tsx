import type { Metadata } from "next";

import {
  CatalogListingPage,
  getCatalogListingMetadata,
} from "@/components/catalog/catalog-listing-page";

export const metadata: Metadata = getCatalogListingMetadata("stock");

interface StockPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function StockPage({ searchParams }: StockPageProps) {
  return <CatalogListingPage availability="stock" searchParams={await searchParams} />;
}
