import Link from "next/link";

import {
  catalogSortOptions,
  getCatalogFilterHref,
  type CatalogFilterGroups,
  type CatalogProductFilters,
} from "@/lib/catalog/models";
import type { ProductAvailability } from "@/lib/catalog/types";
import { SearchSortToolbar } from "@/components/ui/search-sort-toolbar";
import { filterGhostCtaClassName, filterSolidCtaClassName } from "@/lib/ui";

interface CatalogFiltersProps {
  availability: ProductAvailability;
  filterGroups: CatalogFilterGroups;
  activeFilters: CatalogProductFilters;
  totalProducts: number;
  totalResults: number;
}

function hasActiveFilters(filters: CatalogProductFilters) {
  return Boolean(filters.categoryId || filters.brandId || filters.query || filters.sort);
}

export function CatalogFilters({
  availability,
  filterGroups,
  activeFilters,
  totalProducts,
  totalResults,
}: CatalogFiltersProps) {
  const filtersAreActive = hasActiveFilters(activeFilters);

  return (
    <section className="pb-6">
      <div className="space-y-6 rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-[0.32em] text-[#f1d2dc]/72 uppercase">
              Filtros
            </p>
            <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Buscá por texto, ordená la grilla y afiná por marca o por tipo de prenda.
            </p>
          </div>

          <div className="space-y-1 text-sm text-slate-300 md:text-right">
            <p className="font-medium text-white">
              Mostrando {totalResults} de {totalProducts} productos
            </p>
            {filtersAreActive ? <p>Vista actual lista para compartir.</p> : null}
          </div>
        </div>

        <div className="space-y-5">
          <SearchSortToolbar
            searchPlaceholder="Producto, marca o prenda"
            defaultSortLabel="Destacados ✦"
            searchValue={activeFilters.query}
            sortValue={activeFilters.sort}
            sortOptions={catalogSortOptions}
            preservedParams={{
              brand: activeFilters.brandId,
              category: activeFilters.categoryId,
              promo: activeFilters.promoId,
            }}
            pendingCopy="Actualizando catálogo..."
          />

          <div className="space-y-3">
            <p className="text-[11px] font-medium tracking-[0.28em] text-[#f1d2dc]/72 uppercase">Marcas</p>
            <div className="flex flex-wrap gap-2">
               <Link
                 href={getCatalogFilterHref(availability, { ...activeFilters, brandId: undefined })}
                 scroll={false}
                 className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 py-2 text-sm transition ${
                      !activeFilters.brandId
                       ? filterSolidCtaClassName
                    : filterGhostCtaClassName
                 }`}
              >
                Todas
              </Link>
              {filterGroups.brands
                .filter((brand) => brand.count > 0)
                .map((brand) => (
                  <Link
                    key={brand.id}
                    href={getCatalogFilterHref(availability, { ...activeFilters, brandId: brand.id })}
                    scroll={false}
                    className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 py-2 text-sm transition ${
                        activeFilters.brandId === brand.id
                          ? filterSolidCtaClassName
                        : filterGhostCtaClassName
                     }`}
                  >
                    {brand.label} · {brand.count}
                  </Link>
                ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-medium tracking-[0.28em] text-[#f1d2dc]/72 uppercase">Prendas</p>
            <div className="flex flex-wrap gap-2">
               <Link
                 href={getCatalogFilterHref(availability, { ...activeFilters, categoryId: undefined })}
                 scroll={false}
                 className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 py-2 text-sm transition ${
                      !activeFilters.categoryId
                       ? filterSolidCtaClassName
                    : filterGhostCtaClassName
                 }`}
              >
                Todas
              </Link>
              {filterGroups.categories
                .filter((category) => category.count > 0)
                .map((category) => (
                  <Link
                    key={category.id}
                    href={getCatalogFilterHref(availability, { ...activeFilters, categoryId: category.id })}
                    scroll={false}
                    className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 py-2 text-sm transition ${
                        activeFilters.categoryId === category.id
                          ? filterSolidCtaClassName
                        : filterGhostCtaClassName
                     }`}
                  >
                    {category.label} · {category.count}
                  </Link>
                ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
