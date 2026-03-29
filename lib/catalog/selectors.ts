import { cache } from "react";

import type { Brand, Category, Product, ProductAvailability, ProductImage, ProductState } from "@/lib/catalog/types";
import { getCatalogDataset, getProductsRepository } from "@/lib/catalog/repository";

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
  availability?: ProductAvailability;
  states?: ProductState[];
}

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

type CatalogSearchParams = Record<string, string | string[] | undefined>;

export type HomepageFeaturedProduct = CatalogProduct;

function getProductCoverImage(gallery: ProductImage[]) {
  const coverImage = gallery.find((image) => image.role === "cover") ?? gallery[0];

  if (!coverImage) {
    throw new Error("Missing gallery image for catalog product");
  }

  return coverImage;
}

function getSingleSearchParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function matchesCatalogFilters(product: CatalogProduct, filters: CatalogProductFilters) {
  if (filters.brandId && product.brand.id !== filters.brandId) {
    return false;
  }

  if (filters.categoryId && product.category.id !== filters.categoryId) {
    return false;
  }

  if (filters.availability && product.availability !== filters.availability) {
    return false;
  }

  if (filters.states?.length && (!product.state || !filters.states.includes(product.state))) {
    return false;
  }

  return true;
}

const getCatalogContext = cache(async function getCatalogContext() {
  const dataset = await getCatalogDataset();
  const { brands, categories, products } = dataset;

  const brandsById = new Map(brands.map((brand) => [brand.id, brand]));
  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  const mappedProducts = products.flatMap((product) => {
    const brand = brandsById.get(product.brandId);
    const category = categoriesById.get(product.categoryId);

    if (!brand || !category) {
      return [];
    }

    const coverImage = getProductCoverImage(product.gallery);

    return [
      {
        ...product,
        brand,
        category,
        availabilityLabel: availabilityLabels[product.availability],
        image: coverImage.src,
        alt: coverImage.alt,
      } satisfies CatalogProduct,
    ];
  });

  return {
    brands,
    categories,
    products: mappedProducts,
    brandsById,
    categoriesById,
  };
});

export function getAvailabilityLabel(availability: ProductAvailability) {
  return availabilityLabels[availability];
}

export function getCatalogPath(availability: ProductAvailability) {
  return `/${availability}`;
}

export function getProductPath(product: Pick<Product, "availability" | "slug">) {
  return `${getCatalogPath(product.availability)}/${product.slug}`;
}

export async function getCategories() {
  const dataset = await getCatalogDataset();

  return dataset.categories;
}

export async function getBrands() {
  const dataset = await getCatalogDataset();

  return dataset.brands;
}

export async function getProducts() {
  return getProductsRepository();
}

export function getCatalogFiltersFromSearchParams(searchParams: CatalogSearchParams): CatalogProductFilters {
  const brand = getSingleSearchParamValue(searchParams.brand);
  const category = getSingleSearchParamValue(searchParams.category);

  return {
    brandId: brand,
    categoryId: category,
  };
}

export async function getCatalogProducts(filters: CatalogProductFilters = {}): Promise<CatalogProduct[]> {
  const context = await getCatalogContext();
  const states = filters.states ?? ["published"];

  return context.products.filter((product) => matchesCatalogFilters(product, { ...filters, states }));
}

export async function getCatalogFilterGroups(filters: CatalogProductFilters = {}): Promise<CatalogFilterGroups> {
  const context = await getCatalogContext();
  const catalogProducts = context.products.filter((product) => matchesCatalogFilters(product, { ...filters, states: ["published"] }));
  const brandCountById = new Map<string, number>();
  const categoryCountById = new Map<string, number>();

  for (const product of catalogProducts) {
    brandCountById.set(product.brand.id, (brandCountById.get(product.brand.id) ?? 0) + 1);
    categoryCountById.set(product.category.id, (categoryCountById.get(product.category.id) ?? 0) + 1);
  }

  return {
    brands: context.brands.map((brand) => ({
      id: brand.id,
      label: brand.name,
      count: brandCountById.get(brand.id) ?? 0,
    })),
    categories: context.categories.map((category) => ({
      id: category.id,
      label: category.name,
      count: categoryCountById.get(category.id) ?? 0,
    })),
  };
}

export async function getCatalogProductById(
  availability: ProductAvailability,
  productId: string,
  filters: Pick<CatalogProductFilters, "states"> = {},
) {
  const products = await getCatalogProducts({ availability, ...filters });

  return products.find((product) => product.slug === productId || product.id === productId) ?? null;
}

export async function getRelatedCatalogProducts(product: CatalogProduct, limit = 3) {
  const products = await getCatalogProducts({ availability: product.availability });

  return products
    .filter((candidate) => candidate.id !== product.id)
    .sort((left, right) => {
      const leftScore = Number(left.brand.id === product.brand.id) + Number(left.category.id === product.category.id);
      const rightScore = Number(right.brand.id === product.brand.id) + Number(right.category.id === product.category.id);

      return rightScore - leftScore;
    })
    .slice(0, limit);
}

export async function getCatalogBrowseGroups(availability: ProductAvailability): Promise<CatalogBrowseGroup[]> {
  const context = await getCatalogContext();
  const scopedProducts = context.products.filter(
    (product) => product.availability === availability && product.state === "published",
  );

  return [
    {
      id: "brands",
      title: "Explorá por marca",
      options: context.brands
        .map((brand) => {
          const matches = scopedProducts.filter((product) => product.brand.id === brand.id);

          if (matches.length === 0) {
            return null;
          }

          return {
            id: brand.id,
            label: brand.name,
            href: `${getCatalogPath(availability)}?brand=${brand.id}`,
            image: brand.image ?? matches[0].image,
            alt: brand.alt ?? matches[0].alt,
            count: matches.length,
          } satisfies CatalogBrowseOption;
        })
        .filter((option): option is CatalogBrowseOption => option !== null),
    },
    {
      id: "categories",
      title: "Explorá por prenda",
      options: context.categories
        .map((category) => {
          const matches = scopedProducts.filter((product) => product.category.id === category.id);

          if (matches.length === 0) {
            return null;
          }

          return {
            id: category.id,
            label: category.name,
            href: `${getCatalogPath(availability)}?category=${category.id}`,
            image: category.image,
            alt: category.alt,
            count: matches.length,
          } satisfies CatalogBrowseOption;
        })
        .filter((option): option is CatalogBrowseOption => option !== null),
    },
  ];
}

export async function getHomepageCategories(
  availability?: ProductAvailability,
): Promise<HomepageCategorySpotlight[]> {
  const context = await getCatalogContext();
  const publishedProducts = context.products.filter((product) => {
    if (product.state !== "published") {
      return false;
    }

    if (availability && product.availability !== availability) {
      return false;
    }

    return true;
  });
  const totalCounts = new Map<string, number>();

  for (const product of publishedProducts) {
    totalCounts.set(product.category.id, (totalCounts.get(product.category.id) ?? 0) + 1);
  }

  return context.categories
    .filter((category) => (totalCounts.get(category.id) ?? 0) > 0)
    .sort((left, right) => (totalCounts.get(right.id) ?? 0) - (totalCounts.get(left.id) ?? 0))
    .slice(0, 4)
    .map((category) => {
      const categoryAvailability =
        availability ??
        (publishedProducts.find((product) => product.category.id === category.id)?.availability ?? "encargue");

      return {
        ...category,
        href: `${getCatalogPath(categoryAvailability)}?category=${category.id}`,
        availability: categoryAvailability,
        availabilityLabel: getAvailabilityLabel(categoryAvailability),
        productCount: totalCounts.get(category.id) ?? 0,
      } satisfies HomepageCategorySpotlight;
    });
}

export async function getHomepageHeroCategories() {
  const categories = await getHomepageCategories();
  return categories.slice(0, 2);
}

export async function getHomepageFeaturedProducts(
  availability: ProductAvailability = "stock",
): Promise<HomepageFeaturedProduct[]> {
  const products = await getCatalogProducts({ availability });

  return products
    .filter((product) => product.featuredOnHomepage)
    .slice(0, 6);
}

export async function getHomepageProductFilters() {
  const homepageProducts = await getHomepageFeaturedProducts();
  const categoryFilters = Array.from(new Set(homepageProducts.map((product) => product.category.name)));
  const availabilityFilters = Array.from(new Set(homepageProducts.map((product) => product.availability))).map(
    getAvailabilityLabel,
  );

  return [...categoryFilters, ...availabilityFilters];
}

export async function getHomepageBrands(): Promise<HomepageBrandSpotlight[]> {
  const context = await getCatalogContext();

  return context.brands
    .toSorted((left, right) => left.name.localeCompare(right.name, "es"))
    .map((brand) => ({
      id: brand.id,
      name: brand.name,
      href: `${getCatalogPath("encargue")}?brand=${brand.id}`,
      image: brand.image,
      alt: brand.alt ?? `Imagen de ${brand.name}`,
    }));
}
