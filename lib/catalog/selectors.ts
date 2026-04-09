import { cache } from "react";

import type { ProductAvailability, ProductImage } from "@/lib/catalog/types";
import {
  getAvailabilityLabel,
  getCatalogPath,
  type CatalogBrowseGroup,
  type CatalogBrowseOption,
  type CatalogFilterGroups,
  type CatalogProduct,
  type CatalogProductFilters,
  type CatalogProductSort,
  type HomepageBrandSpotlight,
  type HomepageCategorySpotlight,
  type HomepageFeaturedProduct,
} from "@/lib/catalog/models";
import { buildBrandImageAlt, buildCategoryImageAlt } from "@/lib/catalog/image-alt";
import { brands as fallbackBrands, homepageBrandPriorityIds } from "@/lib/catalog/data/brands";
import { getCatalogDataset, getProductsRepository } from "@/lib/catalog/repository";

type CatalogSearchParams = Record<string, string | string[] | undefined>;

function pickRandomUniqueItems<T>(items: readonly T[], limit: number) {
  const shuffledItems = [...items];

  for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const currentItem = shuffledItems[index];

    shuffledItems[index] = shuffledItems[randomIndex];
    shuffledItems[randomIndex] = currentItem;
  }

  return shuffledItems.slice(0, limit);
}

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

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es")
    .trim();
}

function parseCatalogSort(value: string | undefined): CatalogProductSort | undefined {
  switch (value) {
    case "price-asc":
    case "price-desc":
    case "alpha-asc":
    case "alpha-desc":
      return value;
    default:
      return undefined;
  }
}

function matchesCatalogQuery(product: CatalogProduct, query: string) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  const searchableContent = [product.name, product.brand.name, product.category.name, product.detail]
    .map((value) => normalizeSearchText(value))
    .join(" ");

  return normalizedQuery
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => searchableContent.includes(term));
}

function sortCatalogProducts(products: CatalogProduct[], sort: CatalogProductSort | undefined) {
  if (!sort) {
    return products;
  }

  return [...products].sort((left, right) => {
    switch (sort) {
      case "price-asc":
        return left.pricing.amount - right.pricing.amount;
      case "price-desc":
        return right.pricing.amount - left.pricing.amount;
      case "alpha-asc":
        return left.name.localeCompare(right.name, "es", { sensitivity: "base" });
      case "alpha-desc":
        return right.name.localeCompare(left.name, "es", { sensitivity: "base" });
      default:
        return 0;
    }
  });
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

  if (filters.query && !matchesCatalogQuery(product, filters.query)) {
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
        availabilityLabel: getAvailabilityLabel(product.availability),
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
  const query = getSingleSearchParamValue(searchParams.q)?.trim();
  const sort = parseCatalogSort(getSingleSearchParamValue(searchParams.sort));

  return {
    brandId: brand,
    categoryId: category,
    query,
    sort,
  };
}

export async function getCatalogProducts(filters: CatalogProductFilters = {}): Promise<CatalogProduct[]> {
  const context = await getCatalogContext();
  const states = filters.states ?? ["published"];

  return sortCatalogProducts(
    context.products.filter((product) => matchesCatalogFilters(product, { ...filters, states })),
    filters.sort,
  );
}

export async function getCatalogFilterGroups(filters: CatalogProductFilters = {}): Promise<CatalogFilterGroups> {
  const context = await getCatalogContext();
  const brandCountById = new Map<string, number>();
  const categoryCountById = new Map<string, number>();
  const sharedScopedFilters: CatalogProductFilters = {
    availability: filters.availability,
    query: filters.query,
    sort: filters.sort,
    states: ["published"],
  };

  const brandScopedProducts = context.products.filter((product) =>
    matchesCatalogFilters(product, {
      ...sharedScopedFilters,
      categoryId: filters.categoryId,
    }),
  );
  const categoryScopedProducts = context.products.filter((product) =>
    matchesCatalogFilters(product, {
      ...sharedScopedFilters,
      brandId: filters.brandId,
    }),
  );

  for (const product of brandScopedProducts) {
    brandCountById.set(product.brand.id, (brandCountById.get(product.brand.id) ?? 0) + 1);
  }

  for (const product of categoryScopedProducts) {
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

export async function getRelatedCatalogProducts(product: CatalogProduct, limit = 10) {
  const products = await getCatalogProducts({ availability: product.availability });
  const tiers: CatalogProduct[][] = [[], [], []];
  const seenProductIds = new Set<string>([product.id]);

  for (const candidate of products) {
    if (seenProductIds.has(candidate.id)) {
      continue;
    }

    const matchesBrand = candidate.brand.id === product.brand.id;
    const matchesCategory = candidate.category.id === product.category.id;

    if (matchesBrand && matchesCategory) {
      tiers[0].push(candidate);
      seenProductIds.add(candidate.id);
      continue;
    }

    if (matchesBrand) {
      tiers[1].push(candidate);
      seenProductIds.add(candidate.id);
      continue;
    }

    if (matchesCategory) {
      tiers[2].push(candidate);
      seenProductIds.add(candidate.id);
    }
  }

  return tiers.flat().slice(0, limit);
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
            alt: buildBrandImageAlt(brand.name),
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
            alt: buildCategoryImageAlt(category.name),
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
  const products = await getCatalogProducts({ availability, states: ["published"] });
  const uniqueProducts = Array.from(new Map(products.map((product) => [product.id, product])).values());

  return pickRandomUniqueItems(uniqueProducts, 5);
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
  const brandsById = new Map(context.brands.map((brand) => [brand.id, brand]));
  const fallbackBrandsById = new Map(fallbackBrands.map((brand) => [brand.id, brand]));

  return homepageBrandPriorityIds.flatMap((brandId) => {
    const brand = brandsById.get(brandId) ?? fallbackBrandsById.get(brandId);

    if (!brand) {
      return [];
    }

    const fallbackBrand = fallbackBrandsById.get(brandId);

    return [
      {
        id: brand.id,
        name: brand.name,
        href: `${getCatalogPath("encargue")}?brand=${brand.id}`,
        image: brand.image ?? fallbackBrand?.image,
        alt: buildBrandImageAlt(brand.name),
      },
    ];
  });
}
