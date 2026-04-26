import type { Brand, Category, Product, ProductAvailability, ProductState } from "@/lib/catalog/types";

const availabilityLabels: Record<ProductAvailability, string> = {
  stock: "Stock inmediato",
  encargue: "Encargue",
};

export interface CatalogProduct extends Product {
  brand: Brand;
  category: Category;
  availabilityLabel: string;
  image: string;
  alt: string;
}

export interface CatalogFilterOption {
  id: string;
  label: string;
  count: number;
}

export interface CatalogFilterGroups {
  brands: CatalogFilterOption[];
  categories: CatalogFilterOption[];
}

export interface CatalogProductFilters {
  brandId?: Brand["id"];
  categoryId?: Category["id"];
  categoryIds?: Category["id"][];
  promoId?: string;
  query?: string;
  sort?: CatalogProductSort;
  availability?: ProductAvailability;
  states?: ProductState[];
}

export type CatalogProductSort = "price-asc" | "price-desc" | "alpha-asc" | "alpha-desc";

export interface CatalogSortOption {
  value: CatalogProductSort;
  label: string;
}

export const catalogSortOptions: CatalogSortOption[] = [
  { value: "price-asc", label: "Precio ↑ Menor a mayor" },
  { value: "price-desc", label: "Precio ↓ Mayor a menor" },
  { value: "alpha-asc", label: "A → Z Alfabético" },
  { value: "alpha-desc", label: "Z → A Alfabético" },
];

export interface CatalogBrowseOption {
  id: string;
  label: string;
  href: string;
  image: string;
  alt: string;
  count: number;
}

export interface CatalogBrowseGroup {
  id: "brands" | "categories";
  title: string;
  options: CatalogBrowseOption[];
}

export interface HomepageBrandSpotlight {
  id: string;
  name: string;
  href: string;
  image?: string;
  alt: string;
}

export interface HomepageCategorySpotlight extends Category {
  href: string;
  availability: ProductAvailability;
  availabilityLabel: string;
  productCount: number;
}

export type HomepageFeaturedProduct = CatalogProduct;

export interface HomepageComboHighlight {
  comboGroup: string;
  top: CatalogProduct;
  bottom: CatalogProduct;
  originalPairAmountArs: number;
  comboPairAmountArs: number;
  discountAmountArs: number;
}

export function getAvailabilityLabel(availability: ProductAvailability) {
  return availabilityLabels[availability];
}

export function getCatalogPath(availability: ProductAvailability) {
  return `/${availability}`;
}

export function getCatalogFilterHref(
  availability: ProductAvailability,
  filters: Pick<CatalogProductFilters, "brandId" | "categoryId" | "promoId" | "query" | "sort">,
) {
  const params = new URLSearchParams();

  if (filters.brandId) {
    params.set("brand", filters.brandId);
  }

  if (filters.categoryId) {
    params.set("category", filters.categoryId);
  }

  if (filters.promoId) {
    params.set("promo", filters.promoId);
  }

  if (filters.query) {
    params.set("q", filters.query);
  }

  if (filters.sort) {
    params.set("sort", filters.sort);
  }

  const query = params.toString();
  const basePath = getCatalogPath(availability);

  return query ? `${basePath}?${query}` : basePath;
}

export function getProductPath(product: Pick<Product, "availability" | "slug">) {
  return `${getCatalogPath(product.availability)}/${product.slug}`;
}
