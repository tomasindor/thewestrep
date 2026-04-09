import Link from "next/link";

import { deleteProductAction, updateProductStateAction } from "@/app/admin/actions";
import { SearchSortToolbar } from "@/components/ui/search-sort-toolbar";
import { PRODUCT_STATE_HELPERS, PRODUCT_STATE_LABELS } from "@/lib/catalog/options";
import { catalogSortOptions, getBrandsRepository, getCategoriesRepository, getEntityCounts, getProductsRepository } from "@/lib/catalog";
import { compactGhostCtaClassName, compactSolidCtaClassName } from "@/lib/ui";

type AdminProductSort = (typeof catalogSortOptions)[number]["value"];

interface AdminProductsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getBannerValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es")
    .trim();
}

function parseAdminSort(value: string | string[] | undefined): AdminProductSort | undefined {
  const singleValue = getBannerValue(value);

  if (catalogSortOptions.some((option) => option.value === singleValue)) {
    return singleValue as AdminProductSort;
  }

  return undefined;
}

function filterAdminProducts(
  products: Awaited<ReturnType<typeof getProductsRepository>>,
  query: string | undefined,
  brandsById: Map<string, string>,
  categoriesById: Map<string, string>,
) {
  const normalizedQuery = normalizeSearchText(query ?? "");

  if (!normalizedQuery) {
    return products;
  }

  return products.filter((product) => {
    const searchableContent = [
      product.name,
      product.slug,
      product.availability,
      PRODUCT_STATE_LABELS[product.state ?? "published"],
      brandsById.get(product.brandId) ?? "",
      categoriesById.get(product.categoryId) ?? "",
    ]
      .map((value) => normalizeSearchText(value))
      .join(" ");

    return searchableContent.includes(normalizedQuery);
  });
}

function sortAdminProducts(
  products: Awaited<ReturnType<typeof getProductsRepository>>,
  sort: AdminProductSort | undefined,
) {
  const nextProducts = [...products];

  switch (sort) {
    case "price-asc":
      return nextProducts.sort((left, right) => left.pricing.amount - right.pricing.amount);
    case "price-desc":
      return nextProducts.sort((left, right) => right.pricing.amount - left.pricing.amount);
    case "alpha-asc":
      return nextProducts.sort((left, right) => left.name.localeCompare(right.name, "es"));
    case "alpha-desc":
      return nextProducts.sort((left, right) => right.name.localeCompare(left.name, "es"));
    default:
      return nextProducts.sort((left, right) => left.name.localeCompare(right.name, "es"));
  }
}

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({ searchParams }: AdminProductsPageProps) {
  const params = await searchParams;
  const [products, brands, categories, counts] = await Promise.all([
    getProductsRepository({ states: ["draft", "published", "paused"] }),
    getBrandsRepository(),
    getCategoriesRepository(),
    getEntityCounts(),
  ]);

  const brandsById = new Map(brands.map((brand) => [brand.id, brand.name]));
  const categoriesById = new Map(categories.map((category) => [category.id, category.name]));
  const message = getBannerValue(params.message);
  const error = getBannerValue(params.error);
  const query = getBannerValue(params.q)?.trim() || undefined;
  const sort = parseAdminSort(params.sort);
  const visibleProducts = sortAdminProducts(filterAdminProducts(products, query, brandsById, categoriesById), sort);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-xs font-medium tracking-[0.32em] text-[#f1d2dc]/70 uppercase">Productos</p>
          <h1 className="font-display text-5xl text-white">CRUD de catálogo</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-300">
            Alta, edición, borrado y control de estados para stock y encargue.
          </p>
          <div className="space-y-1 text-sm text-slate-400">
            <p><strong>{PRODUCT_STATE_LABELS.draft}:</strong> {PRODUCT_STATE_HELPERS.draft}</p>
            <p><strong>{PRODUCT_STATE_LABELS.published}:</strong> {PRODUCT_STATE_HELPERS.published}</p>
            <p><strong>{PRODUCT_STATE_LABELS.paused}:</strong> {PRODUCT_STATE_HELPERS.paused}</p>
          </div>
        </div>

        <Link href="/admin/products/new" className={compactSolidCtaClassName}>
          Crear producto
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs tracking-[0.28em] text-[#f1d2dc]/70 uppercase">Productos</p>
          <p className="mt-3 text-3xl font-semibold text-white">{counts.products}</p>
        </article>
        <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs tracking-[0.28em] text-[#f1d2dc]/70 uppercase">Marcas</p>
          <p className="mt-3 text-3xl font-semibold text-white">{counts.brands}</p>
        </article>
        <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs tracking-[0.28em] text-[#f1d2dc]/70 uppercase">Categorías</p>
          <p className="mt-3 text-3xl font-semibold text-white">{counts.categories}</p>
        </article>
      </div>

      {message ? <p className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50">{message}</p> : null}
      {error ? <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}

      <div className="space-y-5 rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-[0.32em] text-[#f1d2dc]/70 uppercase">Búsqueda rápida</p>
            <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Buscá por nombre, slug, marca, categoría, tipo o estado y ordená la tabla sin pasos extra.
            </p>
          </div>

          <div className="space-y-1 text-sm text-slate-300 md:text-right">
            <p className="font-medium text-white">
              Mostrando {visibleProducts.length} de {products.length} productos
            </p>
            {query || sort ? <p>La vista se actualiza apenas cambiás los controles.</p> : null}
          </div>
        </div>

        <SearchSortToolbar
          searchPlaceholder="Producto, slug, marca, categoría o estado"
          defaultSortLabel="Nombre A → Z"
          searchValue={query}
          sortValue={sort}
          sortOptions={catalogSortOptions}
          pendingCopy="Actualizando productos del admin..."
        />
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm">
            <thead className="bg-black/25 text-slate-300">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Marca</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {visibleProducts.map((product) => (
                <tr key={product.id}>
                  <td className="px-4 py-4 align-top text-white">
                    <div className="space-y-1">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-slate-400">/{product.slug}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top text-slate-300">{product.availability}</td>
                  <td className="px-4 py-4 align-top text-slate-300">{brandsById.get(product.brandId) ?? "-"}</td>
                  <td className="px-4 py-4 align-top text-slate-300">{categoriesById.get(product.categoryId) ?? "-"}</td>
                  <td className="px-4 py-4 align-top text-slate-300">{PRODUCT_STATE_LABELS[product.state ?? "published"]}</td>
                  <td className="px-4 py-4 align-top text-slate-300">{product.pricing.display}</td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin/products/${product.id}/edit`} className={compactGhostCtaClassName}>
                        Editar
                      </Link>

                      {(["draft", "published", "paused"] as const).map((state) => (
                        <form key={state} action={updateProductStateAction}>
                          <input type="hidden" name="productId" value={product.id} />
                          <input type="hidden" name="state" value={state} />
                          <button type="submit" className={compactGhostCtaClassName}>
                            {PRODUCT_STATE_LABELS[state]}
                          </button>
                        </form>
                      ))}

                      <form action={deleteProductAction}>
                        <input type="hidden" name="productId" value={product.id} />
                        <button type="submit" className={compactGhostCtaClassName}>
                          Borrar
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}

              {visibleProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-300">
                    No encontramos productos con esos criterios. Probá con otra búsqueda o cambiá el orden.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
