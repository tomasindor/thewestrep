import type { Metadata } from "next";

import {
  CatalogListingPage,
  getCatalogListingMetadata,
} from "@/components/catalog/catalog-listing-page";
import { resolvePromoIdFromSearchParams } from "@/lib/catalog";

export const metadata: Metadata = getCatalogListingMetadata("encargue");

interface EncarguePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function EncarguePage({ searchParams }: EncarguePageProps) {
  const resolvedSearchParams = await searchParams;
  const promoId = resolvePromoIdFromSearchParams(resolvedSearchParams);

  return (
    <CatalogListingPage
      availability="encargue"
      searchParams={resolvedSearchParams}
      promoId={promoId}
    />
  );
}
