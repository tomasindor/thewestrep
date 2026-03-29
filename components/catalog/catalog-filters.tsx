import Link from "next/link";

import type { CatalogFilterGroups, CatalogProductFilters } from "@/lib/catalog";
import { compactGhostCtaClassName, filterGhostCtaClassName, filterSolidCtaClassName } from "@/lib/ui";

interface CatalogFiltersProps {
  basePath: string;
  filterGroups: CatalogFilterGroups;
  activeFilters: CatalogProductFilters;
  totalProducts: number;
  totalResults: number;
}

function hasActiveFilters(filters: CatalogProductFilters) {
  return Boolean(filters.categoryId || filters.brandId);
}

function buildFilterHref(
  basePath: string,
  activeFilters: CatalogProductFilters,
  nextFilters: CatalogProductFilters,
) {
  const params = new URLSearchParams();
  const filters = { ...activeFilters, ...nextFilters };

  if (filters.brandId) {
    params.set("brand", filters.brandId);
  }

  if (filters.categoryId) {
    params.set("category", filters.categoryId);
  }

  const query = params.toString();

  return query ? `${basePath}?${query}` : basePath;
}

export function CatalogFilters({
  basePath,
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
            <p className="text-xs font-medium tracking-[0.32em] text-orange-200/70 uppercase">
              Filtros
            </p>
            <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Entrá por marca o por tipo de prenda.</p>
          </div>

          <div className="space-y-1 text-sm text-slate-300 md:text-right">
            <p className="font-medium text-white">
              Mostrando {totalResults} de {totalProducts} productos
            </p>
            {filtersAreActive ? <p>Selección activa lista para compartir.</p> : null}
          </div>
        </div>

        <div className="space-y-5">
          <div className="space-y-3">
            <p className="text-[11px] font-medium tracking-[0.28em] text-orange-200/70 uppercase">Marcas</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={activeFilters.categoryId ? buildFilterHref(basePath, activeFilters, { brandId: undefined }) : basePath}
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
                    href={buildFilterHref(basePath, activeFilters, { brandId: brand.id })}
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
            <p className="text-[11px] font-medium tracking-[0.28em] text-orange-200/70 uppercase">Prendas</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={activeFilters.brandId ? buildFilterHref(basePath, activeFilters, { categoryId: undefined }) : basePath}
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
                    href={buildFilterHref(basePath, activeFilters, { categoryId: category.id })}
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

          {filtersAreActive ? (
            <Link
              href={basePath}
              className={compactGhostCtaClassName}
            >
              Limpiar filtros
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
