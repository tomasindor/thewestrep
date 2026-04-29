import type { Metadata } from "next";
import Link from "next/link";

import { CatalogFilters } from "@/components/catalog/catalog-filters";
import { InfiniteProductGrid } from "@/components/catalog/infinite-product-grid";
import { PromoBanner } from "@/components/catalog/promo-banner";
import { Container } from "@/components/ui/container";
import {
  applyPromoPresetFilters,
  getCatalogFilterGroups,
  getCatalogFiltersFromSearchParams,
  getCatalogPath,
  getCatalogProducts,
  getPromoBannerForCatalogListing,
  resolvePromoPreset,
  resolvePromoPresetCategoryIds,
  type ProductAvailability,
} from "@/lib/catalog";
import { createPageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import { compactGhostCtaClassName } from "@/lib/ui";

const listingContent: Record<
  ProductAvailability,
  {
    title: string;
    description: string;
    eyebrow: string;
    heading: string;
    intro: string;
    statsCopy: string;
    emptyTitle: string;
    emptyDescription: string;
  }
> = {
  stock: {
    title: `Stock inmediato | ${siteConfig.title}`,
    description: "Catálogo de stock inmediato de thewestrep con exploración por marca o prenda y acceso directo a cada detalle.",
    eyebrow: "Stock thewestrep",
    heading: "STOCK LISTO PARA ELEGIR Y CERRAR.",
    intro: "Entrá por marca, prenda y precio sin vueltas.",
    statsCopy: "Selección local lista para entrega coordinada o retiro según disponibilidad.",
    emptyTitle: "No hay stock para esta categoría.",
    emptyDescription: "Probá otra búsqueda, cambiá el orden o limpiá los filtros para volver a ver todo el stock disponible.",
  },
  encargue: {
    title: `Encargue internacional asistido | ${siteConfig.title}`,
    description:
      "Catálogo de encargue internacional asistido de thewestrep: elegí el producto, nosotros hacemos la importación y despachamos localmente por Correo Argentino.",
    eyebrow: "Encargue internacional asistido",
    heading: "ELEGÍ EL PRODUCTO, NOSOTROS NOS OCUPAMOS DE TODO.",
    intro:
      "Filtrá por marca o prenda, encontrá tu referencia y avanzá sin trámites: nosotros hacemos la importación y despachamos localmente por Correo Argentino.",
    statsCopy:
      "Plazo estimado: 30 a 60 días. Puede variar según aduana, transporte aéreo y correo local. No gestionás nada por tu cuenta.",
    emptyTitle: "No hay encargues para esta categoría.",
    emptyDescription:
      "Probá otra búsqueda, cambiá el orden o limpiá los filtros para volver a ver todos los encargues disponibles.",
  },
};

interface CatalogListingPageProps {
  availability: ProductAvailability;
  searchParams: Record<string, string | string[] | undefined>;
  promoId?: string;
}

export function getCatalogListingMetadata(availability: ProductAvailability): Metadata {
  const content = listingContent[availability];

  return createPageMetadata({
    title: content.title.replace(` | ${siteConfig.title}`, ""),
    description: content.description,
    path: availability === "stock" ? "/stock" : "/encargue",
    keywords: [content.eyebrow, "catálogo", availability],
  });
}

export async function CatalogListingPage({ availability, searchParams, promoId }: CatalogListingPageProps) {
  const content = listingContent[availability];
  const activeFilters = getCatalogFiltersFromSearchParams(searchParams);
  const candidatePromoId = promoId ?? activeFilters.promoId;
  const resolvedPreset = availability === "encargue" ? await resolvePromoPreset(candidatePromoId) : null;
  const promoCategoryIds = resolvedPreset ? await resolvePromoPresetCategoryIds(resolvedPreset) : [];
  const promoPreset = resolvedPreset ? { ...resolvedPreset, categoryIds: promoCategoryIds } : null;
  const promoBanner = getPromoBannerForCatalogListing(availability, promoPreset);
  const baseFilters = { availability } as const;
  const filters = {
    ...applyPromoPresetFilters(activeFilters, promoPreset),
    ...baseFilters,
  };
  const [products, totalProducts, filterGroups] = await Promise.all([
    getCatalogProducts(filters),
    getCatalogProducts(baseFilters),
    getCatalogFilterGroups(filters),
  ]);
  const basePath = getCatalogPath(availability);
  const gridKey = [
    availability,
    activeFilters.brandId ?? "all-brands",
    activeFilters.categoryId ?? "all-categories",
    filters.categoryIds?.join(",") ?? "promo-off",
    filters.promoId ?? "no-promo",
    activeFilters.query ?? "all-products",
    activeFilters.sort ?? "alpha-asc",
  ].join(":");

  return (
    <div className="relative isolate">
      <section className="py-12 sm:py-18">
        <Container className="space-y-8">
          {promoBanner ? (
            <PromoBanner
              title={promoBanner.title}
              rules={promoBanner.rules}
              disclosure={promoBanner.disclosure}
            />
          ) : null}

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <p className="font-display text-sm tracking-[0.45em] text-[#f2d4dd]/78 uppercase">
                {content.eyebrow}
              </p>
              <h1 className="font-display max-w-4xl text-5xl leading-[0.9] text-white sm:text-7xl">
                {content.heading}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-lg sm:leading-7">
                {content.intro}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <Link
                href="/catalogo"
                className={`${compactGhostCtaClassName} px-5`}
              >
                Ver ambos catálogos
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-white">
              {totalProducts.length} productos
            </span>
            <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-white">
              {filterGroups.brands.filter((brand) => brand.count > 0).length} marcas
            </span>
            <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-white">
              {filterGroups.categories.filter((category) => category.count > 0).length} prendas
            </span>
            <span>{content.statsCopy}</span>
          </div>
        </Container>
      </section>

      <Container>
        <CatalogFilters
          availability={availability}
          filterGroups={filterGroups}
          activeFilters={activeFilters}
          totalProducts={totalProducts.length}
          totalResults={products.length}
        />
      </Container>

      <section className="py-8 sm:py-10">
        <Container className="space-y-8">
          {products.length > 0 ? (
            <InfiniteProductGrid
              key={gridKey}
              products={products}
              contextAvailability={availability}
            />
          ) : (
            <div className="flex flex-col items-start gap-4 rounded-[1.75rem] border border-dashed border-white/12 bg-white/[0.03] p-6 sm:p-8">
              <div className="space-y-2">
                <p className="text-xs font-medium tracking-[0.3em] text-[#f1d2dc]/75 uppercase">
                  Sin resultados
                </p>
                <h3 className="font-display text-3xl leading-none text-white sm:text-4xl">
                  {content.emptyTitle}
                </h3>
                <p className="max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                  {content.emptyDescription}
                </p>
              </div>

              <Link
                href={basePath}
                scroll={false}
                className={compactGhostCtaClassName}
              >
                Ver todo
              </Link>
            </div>
          )}
        </Container>
      </section>
    </div>
  );
}
