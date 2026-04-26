import type { Metadata } from "next";

import { HomePage } from "@/components/marketing/homepage";
import { createPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
   description:
     "Tienda online de thewestrep para descubrir streetwear importado con stock inmediato y encargue internacional asistido. Nosotros hacemos la importación y despachamos localmente desde Argentina, sin trámites aduaneros ni impuestos sorpresa para vos.",
  path: "/",
  keywords: ["tienda streetwear", "ropa urbana", "catálogo online"],
});

interface HomePageRouteProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function isHeroPromoPreviewEnabled(value: string | string[] | undefined) {
  const normalizedValue = Array.isArray(value) ? value[0] : value;
  return normalizedValue === "1" || normalizedValue === "true";
}

export default async function Home({ searchParams }: HomePageRouteProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <main className="flex-1">
      <HomePage heroPromoPreview={isHeroPromoPreviewEnabled(resolvedSearchParams.heroPromoPreview)} />
    </main>
  );
}
