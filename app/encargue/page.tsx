import type { Metadata } from "next";

import {
  CatalogListingPage,
  getCatalogListingMetadata,
} from "@/components/catalog/catalog-listing-page";

export const metadata: Metadata = getCatalogListingMetadata("encargue");

interface EncarguePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function EncarguePage({ searchParams }: EncarguePageProps) {
  return <CatalogListingPage availability="encargue" searchParams={await searchParams} />;
}
