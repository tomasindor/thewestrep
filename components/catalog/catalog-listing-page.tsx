import type { Metadata } from "next";
import Link from "next/link";

import { CatalogFilters } from "@/components/catalog/catalog-filters";
import { CatalogHeader } from "@/components/catalog/catalog-header";
import { ProductGrid } from "@/components/catalog/product-grid";
import { Container } from "@/components/ui/container";
import {
  getCatalogFilterGroups,
  getCatalogFiltersFromSearchParams,
  getCatalogPath,
  getCatalogProducts,
  type ProductAvailability,
} from "@/lib/catalog";
import { siteConfig } from "@/lib/site";
import { compactGhostCtaClassName, ghostCtaClassName, solidCtaClassName } from "@/lib/ui";

const listingContent: Record<
  ProductAvailability,
  {
    title: string;
    description: string;
    eyebrow: string;
    heading: string;
    intro: string;
    statsCopy: string;
    ctaMessage: string;
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
    ctaMessage: "Hola, quiero consultar el stock inmediato disponible en thewestrep.",
    emptyTitle: "No hay stock para esta categoría.",
    emptyDescription: "Probá otra categoría o limpiá el filtro para volver a ver todo el stock disponible.",
  },
  encargue: {
    title: `Encargue internacional | ${siteConfig.title}`,
    description: "Catálogo de encargues internacionales de thewestrep para elegir el producto y avanzar la compra con una referencia clara.",
    eyebrow: "Encargue internacional",
    heading: "ELEGÍ EN EL CATÁLOGO Y AVANZÁ EL ENCARGUE.",
    intro: "Filtrá por marca o prenda, encontrá el producto y seguí la consulta con esa referencia.",
    statsCopy: "Selección pensada para elegir desde catálogo y coordinar el paso siguiente por WhatsApp.",
    ctaMessage: "Hola, quiero cotizar un producto por encargue en thewestrep.",
    emptyTitle: "No hay encargues para esta categoría.",
    emptyDescription: "Probá otra categoría o limpiá el filtro para volver a ver todos los encargues disponibles.",
  },
};

interface CatalogListingPageProps {
  availability: ProductAvailability;
  searchParams: Record<string, string | string[] | undefined>;
}

export function getCatalogListingMetadata(availability: ProductAvailability): Metadata {
  const content = listingContent[availability];

  return {
    title: content.title,
    description: content.description,
  };
}

export async function CatalogListingPage({ availability, searchParams }: CatalogListingPageProps) {
  const content = listingContent[availability];
  const activeFilters = getCatalogFiltersFromSearchParams(searchParams);
  const baseFilters = { availability } as const;
  const filters = { ...activeFilters, ...baseFilters };
  const [products, totalProducts, filterGroups] = await Promise.all([
    getCatalogProducts(filters),
    getCatalogProducts(baseFilters),
    getCatalogFilterGroups(baseFilters),
  ]);
  const basePath = getCatalogPath(availability);

  return (
    <main className="flex-1">
      <div className="relative isolate">
        <CatalogHeader whatsappMessage={content.ctaMessage} ctaLabel="WhatsApp catálogo" />

        <section className="py-12 sm:py-18">
          <Container className="space-y-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-4">
                <p className="font-display text-sm tracking-[0.45em] text-orange-100/75 uppercase">
                  {content.eyebrow}
                </p>
                <h1 className="font-display max-w-4xl text-5xl leading-[0.9] text-white sm:text-7xl">
                  {content.heading}
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-lg sm:leading-7">
                  {content.intro}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 lg:min-w-[20rem] lg:justify-end">
                <a
                  href={`${siteConfig.whatsappUrl}${encodeURIComponent(content.ctaMessage)}`}
                  target="_blank"
                  rel="noreferrer"
                  className={solidCtaClassName}
                >
                  Consultar catálogo por WhatsApp
                </a>
                <Link
                  href="/catalogo"
                  className={ghostCtaClassName}
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
            basePath={basePath}
            filterGroups={filterGroups}
            activeFilters={activeFilters}
            totalProducts={totalProducts.length}
            totalResults={products.length}
          />
        </Container>

        <section className="py-8 sm:py-10">
          <Container className="space-y-8">
            {products.length > 0 ? (
              <ProductGrid products={products} />
            ) : (
              <div className="flex flex-col items-start gap-4 rounded-[1.75rem] border border-dashed border-white/12 bg-white/[0.03] p-6 sm:p-8">
                <div className="space-y-2">
                  <p className="text-xs font-medium tracking-[0.3em] text-orange-200/75 uppercase">
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
                  className={compactGhostCtaClassName}
                >
                  Ver todo
                </Link>
              </div>
            )}
          </Container>
        </section>
      </div>
    </main>
  );
}
