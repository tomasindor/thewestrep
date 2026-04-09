import "server-only";

import { cache } from "react";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb, getDbSql } from "@/lib/db/client";
import { getBrandSchemaCompatibility, getBrandSchemaCompatibilityWarning } from "@/lib/db/brands-schema-compat";
import {
  getProductImagesSchemaCompatibility,
  getProductImagesSchemaCompatibilityWarning,
} from "@/lib/db/product-images-schema-compat";
import {
  getProductSizeGuidesSchemaCompatibility,
  getProductSizeGuidesSchemaCompatibilityWarning,
} from "@/lib/db/product-size-guides-schema-compat";
import { brands, categories, productImages, products, productSizeGuides, productSizes, productVariants } from "@/lib/db/schema";
import { buildEditableCommercialAvailabilityBySlug, enrichCommercialAvailabilityInfo } from "@/lib/catalog/commercial-availability";
import {
  cleanupManagedBrandImage,
  type ManagedBrandImageReference,
  type ManagedImageProvider,
  persistManagedBrandImage,
} from "@/lib/media/brand-images";
import {
  cleanupManagedProductImage,
  persistManagedProductImage,
  type ManagedProductImageProvider,
  type ManagedProductImageRecord,
  type ManagedProductImageReference,
} from "@/lib/media/product-image-persistence";
import { resolvePreferredBrandLogoSrc } from "@/lib/media/brand-logo-variants";
import { getCloudinaryConfig } from "@/lib/env/shared";
import { persistRemoteImageLocally } from "@/lib/media/persistence";
import type {
  Brand,
  Category,
  Product,
  ProductAvailability,
  ProductAvailabilityInfo,
  ProductImage,
  ProductSizeGuide,
  ProductSize,
  ProductState,
} from "@/lib/catalog/types";
import { catalogInventorySource } from "@/lib/catalog/data/inventory";
import {
  buildBrandImageAlt,
  buildCategoryImageAlt,
  buildProductImageAlt,
} from "@/lib/catalog/image-alt";
import { buildProductWhatsappCta, buildProductWhatsappMessage } from "@/lib/catalog/whatsapp";
import { getDisplayGalleryImages, normalizeProductSizeGuide, reorderLikelySizeGuideImageUrls } from "@/lib/catalog/size-guides";
import { createId, defaultProductImage, formatArs, slugify, uniqueValues } from "@/lib/utils";
import { canonicalizeYupooImageCandidates } from "@/lib/yupoo";

const DEFAULT_PRODUCT_NOTE: Record<ProductAvailability, string> = {
  stock: "",
  encargue: "",
};

const MIN_HOMEPAGE_STOCK_PRODUCTS = 5;

function mapFallbackBrands() {
  return catalogInventorySource.brands.map((brand) => ({
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    image: brand.image,
    imageSourceUrl: brand.image,
    alt: buildBrandImageAlt(brand.name),
    featuredOnHomepage: brand.featuredOnHomepage,
  })) satisfies Brand[];
}

function mapFallbackCategories() {
  return catalogInventorySource.categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    image: category.image,
    alt: buildCategoryImageAlt(category.name),
    featuredOnHomepage: category.featuredOnHomepage,
    featuredOnHero: category.featuredOnHero,
  })) satisfies Category[];
}

function mapFallbackProducts() {
  return catalogInventorySource.products.map((product) => {
    const brandName = catalogInventorySource.brands.find((brand) => brand.id === product.brandId)?.name;
    const categoryName = catalogInventorySource.categories.find((category) => category.id === product.categoryId)?.name;
    const fallbackImage = defaultProductImage(product.name, brandName, categoryName);
    const displayGallery = getDisplayGalleryImages(product.gallery, product.sizeGuide, product.sourceUrl);
    const rawGallery = (displayGallery.length > 0 ? displayGallery : product.gallery).map((image, index) => ({
      ...image,
      alt: buildProductImageAlt({
        productName: product.name,
        brandName,
        categoryName,
        imageIndex: index + 1,
        totalImages: Math.max(displayGallery.length > 0 ? displayGallery.length : product.gallery.length, 1),
        role: image.role,
      }),
    }));

    return {
      ...product,
      sku: undefined,
      state: "published" as const,
      pricing: {
        amount: product.pricing.amount,
        currency: "ARS" as const,
        display: formatArs(product.pricing.amount),
      },
      note: product.note || DEFAULT_PRODUCT_NOTE[product.availability],
      whatsappCtaLabel: buildProductWhatsappCta(product.availability),
      whatsappMessage: buildProductWhatsappMessage({
        productName: product.name,
        availability: product.availability,
      }),
      gallery:
        rawGallery.length > 0
          ? rawGallery
          : [
              {
                id: `${product.id}-cover`,
                src: fallbackImage.src,
                alt: fallbackImage.alt,
                role: "cover" as const,
              },
            ],
    };
  }) satisfies Product[];
}

const fallbackData = {
  brands: mapFallbackBrands(),
  categories: mapFallbackCategories(),
  products: mapFallbackProducts(),
};

async function resolvePreferredBrandLogos(brands: readonly Brand[]) {
  return Promise.all(
    brands.map(async (brand) => {
      const preferredImage = await resolvePreferredBrandLogoSrc(brand.image);

      return preferredImage === brand.image ? brand : { ...brand, image: preferredImage };
    }),
  );
}

function mergeEntitiesById<T extends { id: string }>(primary: readonly T[], fallback: readonly T[]) {
  const entitiesById = new Map(primary.map((entity) => [entity.id, entity]));

  for (const entity of fallback) {
    if (!entitiesById.has(entity.id)) {
      entitiesById.set(entity.id, entity);
    }
  }

  return Array.from(entitiesById.values());
}

function countPublishedStockProducts(products: readonly Product[]) {
  return products.filter((product) => product.availability === "stock" && product.state === "published").length;
}

function supplementStockProducts(dataset: {
  brands: readonly Brand[];
  categories: readonly Category[];
  products: readonly Product[];
}) {
  if (countPublishedStockProducts(dataset.products) >= MIN_HOMEPAGE_STOCK_PRODUCTS) {
    return {
      brands: [...dataset.brands],
      categories: [...dataset.categories],
      products: [...dataset.products],
    };
  }

  const existingProductIds = new Set(dataset.products.map((product) => product.id));
  const supplementalStockProducts = fallbackData.products.filter(
    (product) => product.availability === "stock" && !existingProductIds.has(product.id),
  );

  const missingProductsCount = MIN_HOMEPAGE_STOCK_PRODUCTS - countPublishedStockProducts(dataset.products);
  const nextProducts = [...dataset.products, ...supplementalStockProducts.slice(0, missingProductsCount)];

  return {
    brands: mergeEntitiesById(dataset.brands, fallbackData.brands),
    categories: mergeEntitiesById(dataset.categories, fallbackData.categories),
    products: nextProducts,
  };
}

function parseManagedImageProvider(value: string | null | undefined): ManagedImageProvider | null {
  return value === "cloudinary" || value === "local" ? value : null;
}

function parseManagedProductImageProvider(value: string | null | undefined): ManagedProductImageProvider | null {
  return value === "cloudinary" || value === "local" ? value : null;
}

function mapManagedBrandImageReference(record: {
  imageUrl?: string | null;
  imageSourceUrl?: string | null;
  imageProvider?: string | null;
  imageAssetKey?: string | null;
}): ManagedBrandImageReference {
  return {
    imageUrl: record.imageUrl ?? null,
    imageSourceUrl: record.imageSourceUrl ?? null,
    imageProvider: parseManagedImageProvider(record.imageProvider),
    imageAssetKey: record.imageAssetKey ?? null,
  };
}

function mapManagedProductImageReference(record: {
  url?: string | null;
  sourceUrl?: string | null;
  provider?: string | null;
  assetKey?: string | null;
  cloudName?: string | null;
}): ManagedProductImageReference {
  return {
    url: record.url ?? undefined,
    sourceUrl: record.sourceUrl ?? null,
    provider: parseManagedProductImageProvider(record.provider),
    assetKey: record.assetKey ?? null,
    cloudName: record.cloudName ?? null,
  };
}

interface BrandRowCompat {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  imageAlt: string;
  imageSourceUrl: string | null;
  imageProvider: string | null;
  imageAssetKey: string | null;
}

interface ProductImageRowCompat {
  id: string;
  productId: string;
  url: string;
  sourceUrl: string | null;
  provider: string | null;
  assetKey: string | null;
  cloudName: string | null;
  variantsManifest: unknown;
  alt: string;
  position: number;
  source: "manual" | "yupoo";
  createdAt: Date;
}

function normalizeVariantsManifest(value: unknown) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  return value as ProductImage["variantsManifest"];
}

interface ProductSizeGuideRowCompat {
  id: string;
  productId: string;
  title: string | null;
  unitLabel: string | null;
  notes: string | null;
  sourceImageUrl: string | null;
  columns: unknown;
  rows: unknown;
}

function normalizeSizeGuideColumns(value: unknown) {
  return Array.isArray(value) ? value.filter((item: unknown): item is string => typeof item === "string") : [];
}

function normalizeSizeGuideRows(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((row) => {
    if (!row || typeof row !== "object") {
      return [];
    }

    const label = "label" in row && typeof row.label === "string" ? row.label : "";
    const values =
      "values" in row && Array.isArray(row.values)
        ? row.values.filter((item: unknown): item is string => typeof item === "string")
        : [];

    return [{ label, values }];
  });
}

function mapProductSizeGuide(record: ProductSizeGuideRowCompat): ProductSizeGuide | undefined {
  const normalizedGuide = normalizeProductSizeGuide({
    title: record.title ?? undefined,
    unitLabel: record.unitLabel ?? undefined,
    notes: record.notes ?? undefined,
    sourceImageUrl: record.sourceImageUrl ?? undefined,
    columns: normalizeSizeGuideColumns(record.columns),
    rows: normalizeSizeGuideRows(record.rows),
  });

  return normalizedGuide ?? undefined;
}

function mergeWarnings(...warnings: Array<string | undefined>) {
  return warnings.filter(Boolean).join(" ") || undefined;
}

function shouldCleanupPreviousManagedProductImage(
  previousImage: ManagedProductImageReference | undefined,
  nextImage: ManagedProductImageRecord,
) {
  if (!previousImage?.provider || !previousImage.assetKey) {
    return false;
  }

  return previousImage.provider !== nextImage.provider || previousImage.assetKey !== nextImage.assetKey;
}

function normalizeProductImageSourceUrls(sourceUrl: string | undefined, imageUrls: string[]) {
  const normalizedUrls = uniqueValues(imageUrls.map((imageUrl) => imageUrl.trim()).filter(Boolean));
  const shouldCanonicalizeYupoo = Boolean(sourceUrl?.includes("yupoo")) || normalizedUrls.some((url) => url.includes("photo.yupoo.com"));
  const canonicalizedUrls = shouldCanonicalizeYupoo ? canonicalizeYupooImageCandidates(normalizedUrls) : normalizedUrls;

  return reorderLikelySizeGuideImageUrls(canonicalizedUrls, { sourcePageUrl: sourceUrl });
}

function shouldCleanupPreviousManagedBrandImage(
  previousImage: ManagedBrandImageReference | undefined,
  nextImage: ManagedBrandImageReference,
) {
  if (!previousImage?.imageProvider || !previousImage.imageAssetKey) {
    return false;
  }

  return previousImage.imageProvider !== nextImage.imageProvider || previousImage.imageAssetKey !== nextImage.imageAssetKey;
}

function normalizeSqlRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) {
    return result as T[];
  }

  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;

    if (Array.isArray(rows)) {
      return rows as T[];
    }
  }

  return [];
}

async function selectBrandRows() {
  const sqlClient = getDbSql();
  const compatibility = await getBrandSchemaCompatibility();

  if (!sqlClient) {
    return [] as BrandRowCompat[];
  }

  const imageSourceUrlSelection = compatibility.hasImageSourceUrl ? "image_source_url" : "image_url";
  const imageProviderSelection = compatibility.hasImageProvider ? "image_provider" : "null::text";
  const imageAssetKeySelection = compatibility.hasImageAssetKey ? "image_asset_key" : "null::text";

  const result = await sqlClient.query(`
    select
      id,
      name,
      slug,
      image_url as "imageUrl",
      image_alt as "imageAlt",
      ${imageSourceUrlSelection} as "imageSourceUrl",
      ${imageProviderSelection} as "imageProvider",
      ${imageAssetKeySelection} as "imageAssetKey"
    from brands
    order by name asc
  `);

  return normalizeSqlRows<BrandRowCompat>(result);
}

async function selectBrandManagedImageState(id: string) {
  const sqlClient = getDbSql();
  const compatibility = await getBrandSchemaCompatibility();

  if (!sqlClient) {
    return null;
  }

  const imageSourceUrlSelection = compatibility.hasImageSourceUrl ? "image_source_url" : "image_url";
  const imageProviderSelection = compatibility.hasImageProvider ? "image_provider" : "null::text";
  const imageAssetKeySelection = compatibility.hasImageAssetKey ? "image_asset_key" : "null::text";
  const result = await sqlClient.query(
    `
      select
        image_url as "imageUrl",
        ${imageSourceUrlSelection} as "imageSourceUrl",
        ${imageProviderSelection} as "imageProvider",
        ${imageAssetKeySelection} as "imageAssetKey"
      from brands
      where id = $1
      limit 1
    `,
    [id],
  );
  const rows = normalizeSqlRows<Pick<BrandRowCompat, "imageUrl" | "imageSourceUrl" | "imageProvider" | "imageAssetKey">>(result);

  return rows[0] ?? null;
}

async function selectProductImageRows() {
  const sqlClient = getDbSql();
  const compatibility = await getProductImagesSchemaCompatibility();

  if (!sqlClient) {
    return {
      rows: [] as ProductImageRowCompat[],
      compatibility,
    };
  }

  const sourceUrlSelection = compatibility.hasSourceUrl ? "source_url" : "url";
  const providerSelection = compatibility.hasProvider ? "provider" : "null::text";
  const assetKeySelection = compatibility.hasAssetKey ? "asset_key" : "null::text";
  const cloudNameSelection = compatibility.hasCloudName ? "cloud_name" : "null::text";
  const variantsManifestSelection = compatibility.hasVariantsManifest ? "variants_manifest" : "null::jsonb";
  const result = await sqlClient.query(`
    select
      id,
      product_id as "productId",
      url,
      ${sourceUrlSelection} as "sourceUrl",
      ${providerSelection} as provider,
      ${assetKeySelection} as "assetKey",
      ${cloudNameSelection} as "cloudName",
      ${variantsManifestSelection} as "variantsManifest",
      alt,
      position,
      source,
      created_at as "createdAt"
    from product_images
    order by position asc, created_at asc
  `);

  return {
    rows: normalizeSqlRows<ProductImageRowCompat>(result),
    compatibility,
  };
}

async function selectProductManagedImageStates(productId: string) {
  const sqlClient = getDbSql();
  const compatibility = await getProductImagesSchemaCompatibility();

  if (!sqlClient) {
    return {
      rows: [] as ProductImageRowCompat[],
      compatibility,
    };
  }

  const sourceUrlSelection = compatibility.hasSourceUrl ? "source_url" : "url";
  const providerSelection = compatibility.hasProvider ? "provider" : "null::text";
  const assetKeySelection = compatibility.hasAssetKey ? "asset_key" : "null::text";
  const cloudNameSelection = compatibility.hasCloudName ? "cloud_name" : "null::text";
  const variantsManifestSelection = compatibility.hasVariantsManifest ? "variants_manifest" : "null::jsonb";
  const result = await sqlClient.query(
    `
      select
        id,
        product_id as "productId",
        url,
        ${sourceUrlSelection} as "sourceUrl",
        ${providerSelection} as provider,
        ${assetKeySelection} as "assetKey",
        ${cloudNameSelection} as "cloudName",
        ${variantsManifestSelection} as "variantsManifest",
        alt,
        position,
        source,
        created_at as "createdAt"
      from product_images
      where product_id = $1
      order by position asc, created_at asc
    `,
    [productId],
  );

  return {
    rows: normalizeSqlRows<ProductImageRowCompat>(result),
    compatibility,
  };
}

const loadBrands = cache(async function loadBrands() {
  const dataset = await getCatalogDataset();

  return dataset.brands;
});

const loadCategories = cache(async function loadCategories() {
  const dataset = await getCatalogDataset();

  return dataset.categories;
});

function mapSizeLabelToAvailability(type: ProductAvailability) {
  return type === "stock" ? "in-stock" : "made-to-order";
}

const loadDatabaseCatalog = cache(async function loadDatabaseCatalog() {
  const db = getDb();

  if (!db) {
    return null;
  }

  try {
    const sizeGuideCompatibility = await getProductSizeGuidesSchemaCompatibility();
    const [brandRows, categoryRows, productRows, productImageSelection, sizeRows, variantRows, sizeGuideRows] = await Promise.all([
      selectBrandRows(),
      db.select().from(categories).orderBy(asc(categories.name)),
      db.select().from(products).orderBy(desc(products.updatedAt), desc(products.createdAt)),
      selectProductImageRows(),
      db.select().from(productSizes).orderBy(asc(productSizes.position), asc(productSizes.createdAt)),
      db.select().from(productVariants).orderBy(asc(productVariants.position), asc(productVariants.createdAt)),
      sizeGuideCompatibility.hasTable
        ? db.select().from(productSizeGuides).orderBy(desc(productSizeGuides.updatedAt), desc(productSizeGuides.createdAt))
        : Promise.resolve([]),
    ]);
    const imageRows = productImageSelection.rows;

    const imagesByProductId = new Map<string, typeof imageRows>();
    const sizesByProductId = new Map<string, typeof sizeRows>();
    const variantsByProductId = new Map<string, typeof variantRows>();
    const sizeGuideByProductId = new Map<string, ProductSizeGuide | undefined>();

    for (const image of imageRows) {
      const images = imagesByProductId.get(image.productId) ?? [];
      images.push(image);
      imagesByProductId.set(image.productId, images);
    }

    for (const size of sizeRows) {
      const sizes = sizesByProductId.get(size.productId) ?? [];
      sizes.push(size);
      sizesByProductId.set(size.productId, sizes);
    }

    for (const variant of variantRows) {
      const variants = variantsByProductId.get(variant.productId) ?? [];
      variants.push(variant);
      variantsByProductId.set(variant.productId, variants);
    }

    for (const sizeGuide of sizeGuideRows as ProductSizeGuideRowCompat[]) {
      sizeGuideByProductId.set(sizeGuide.productId, mapProductSizeGuide(sizeGuide));
    }

    const commercialAvailabilityBySlug = buildEditableCommercialAvailabilityBySlug();

    return {
      brands: brandRows.map((brand) => ({
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        image: brand.imageUrl ?? undefined,
        imageSourceUrl: brand.imageSourceUrl ?? brand.imageUrl ?? undefined,
        imageProvider: brand.imageProvider ?? undefined,
        alt: buildBrandImageAlt(brand.name),
      })) satisfies Brand[],
      categories: categoryRows.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        image: category.imageUrl ?? "/destacada.png",
        alt: buildCategoryImageAlt(category.name),
      })) satisfies Category[],
      products: productRows.map((product) => {
        const productImageRows = imagesByProductId.get(product.id) ?? [];
        const sizeGuide = sizeGuideByProductId.get(product.id);
        const brandName = brandRows.find((brand) => brand.id === product.brandId)?.name;
        const categoryName = categoryRows.find((category) => category.id === product.categoryId)?.name;
        const fallbackImage = defaultProductImage(product.name, brandName, categoryName);
        const fallbackAvailabilityInfo = {
          summary:
            product.type === "stock"
              ? "Coordiná stock y entrega por WhatsApp."
              : "Cotización por encargue con WhatsApp como canal principal.",
        } satisfies ProductAvailabilityInfo;

        const rawGallery =
          productImageRows.length > 0
            ? productImageRows.map((image, index) => ({
                id: image.id,
                src: image.url,
                alt: buildProductImageAlt({
                  productName: product.name,
                  brandName,
                  categoryName,
                  imageIndex: index + 1,
                  totalImages: productImageRows.length,
                  role: index === 0 ? "cover" : "gallery",
                }),
                role: index === 0 ? ("cover" as const) : ("gallery" as const),
                sourceUrl: image.sourceUrl ?? image.url,
                provider: parseManagedProductImageProvider(image.provider) ?? undefined,
                assetKey: image.assetKey ?? undefined,
                cloudName: image.cloudName ?? getCloudinaryConfig()?.cloudName ?? undefined,
                variantsManifest: normalizeVariantsManifest(image.variantsManifest),
              }))
            : [
                {
                  id: `${product.id}-cover`,
                  src: fallbackImage.src,
                  alt: fallbackImage.alt,
                  role: "cover" as const,
                },
              ];

        const displayGallery = getDisplayGalleryImages(rawGallery, sizeGuide, product.sourceUrl ?? undefined);

        return {
          id: product.id,
          slug: product.slug,
          name: product.name,
          brandId: product.brandId,
          categoryId: product.categoryId,
          availability: product.type,
          state: product.state,
          pricing: {
            amount: product.priceArs,
            currency: "ARS" as const,
            display: formatArs(product.priceArs),
          },
           detail: product.description || "",
          note: product.availabilityNote || DEFAULT_PRODUCT_NOTE[product.type],
          whatsappCtaLabel: buildProductWhatsappCta(product.type),
          whatsappMessage: buildProductWhatsappMessage({
            productName: product.name,
            availability: product.type,
          }),
          availabilityInfo: enrichCommercialAvailabilityInfo(
            { slug: product.slug, availability: product.type },
            fallbackAvailabilityInfo,
            commercialAvailabilityBySlug,
          ),
          gallery:
            displayGallery.length > 0
              ? displayGallery
              : [
                  {
                    id: `${product.id}-cover`,
                    src: fallbackImage.src,
                    alt: fallbackImage.alt,
                    role: "cover" as const,
                  },
                ],
          sizes: (sizesByProductId.get(product.id) ?? []).map((size): ProductSize => ({
            id: size.id,
            label: size.label,
            availability: mapSizeLabelToAvailability(product.type),
          })),
          sizeGuide,
          variants: (variantsByProductId.get(product.id) ?? []).map((variant) => ({
            id: variant.id,
            label: variant.label,
          })),
          sourceUrl: product.sourceUrl ?? undefined,
        } satisfies Product;
      }),
    };
  } catch (error) {
    console.warn("Falling back to demo catalog data because the database is unavailable.", error);
    return null;
  }
});

export async function getCatalogDataset() {
  const databaseCatalog = await loadDatabaseCatalog();

  if (!databaseCatalog) {
    return {
      ...fallbackData,
      brands: await resolvePreferredBrandLogos(fallbackData.brands),
    };
  }

  const supplementedCatalog = supplementStockProducts(databaseCatalog);

  return {
    ...supplementedCatalog,
    brands: await resolvePreferredBrandLogos(supplementedCatalog.brands),
  };
}

export async function getBrandsRepository() {
  return loadBrands();
}

export async function getCategoriesRepository() {
  return loadCategories();
}

export async function getProductsRepository(options?: { states?: ProductState[]; availability?: ProductAvailability }) {
  const dataset = await getCatalogDataset();

  return dataset.products.filter((product) => {
    if (options?.availability && product.availability !== options.availability) {
      return false;
    }

    if (options?.states?.length && (!product.state || !options.states.includes(product.state))) {
      return false;
    }

    return true;
  });
}

export interface AdminProductInput {
  id?: string;
  type: ProductAvailability;
  name: string;
  brandId: string;
  categoryId: string;
  priceArs: number;
  description: string;
  availabilityNote: string;
  state: ProductState;
  sourceUrl?: string;
  imageUrls: string[];
  sizes: string[];
  sizeGuide?: ProductSizeGuide | null;
  variants: string[];
}

export async function ensureUniqueSlug(name: string, currentProductId?: string) {
  const db = getDb();
  const baseSlug = slugify(name) || "producto";

  if (!db) {
    return baseSlug;
  }

  let candidate = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await db.query.products.findFirst({
      where: and(eq(products.slug, candidate), currentProductId ? sql`${products.id} <> ${currentProductId}` : undefined),
      columns: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }
}

export async function upsertProduct(input: AdminProductInput) {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is required to create or edit products.");
  }

  const normalizedImageSourceUrls = normalizeProductImageSourceUrls(input.sourceUrl, input.imageUrls);
  const normalizedSizeGuide = normalizeProductSizeGuide(input.sizeGuide);
  const slug = await ensureUniqueSlug(input.name, input.id);
  const productId = input.id ?? createId("product");
  const currentImageSelection = input.id ? await selectProductManagedImageStates(input.id) : null;
  const currentImages = currentImageSelection?.rows ?? [];
  const productImagesCompatibility = currentImageSelection?.compatibility ?? (await getProductImagesSchemaCompatibility());
  const productSizeGuidesCompatibility = await getProductSizeGuidesSchemaCompatibility();

  const productValues = {
    id: productId,
    type: input.type,
    name: input.name,
    slug,
    brandId: input.brandId,
    categoryId: input.categoryId,
    priceArs: input.priceArs,
    description: input.description,
    availabilityNote: input.availabilityNote,
    whatsappCtaLabel: buildProductWhatsappCta(input.type),
    whatsappMessage: buildProductWhatsappMessage({
      productName: input.name,
      availability: input.type,
    }),
    state: input.state,
    sourceUrl: input.sourceUrl || null,
    updatedAt: new Date(),
  };

  if (input.id) {
    await db.update(products).set(productValues).where(eq(products.id, input.id));
    await db.delete(productImages).where(eq(productImages.productId, input.id));
    await db.delete(productSizes).where(eq(productSizes.productId, input.id));
    if (productSizeGuidesCompatibility.hasTable) {
      await db.delete(productSizeGuides).where(eq(productSizeGuides.productId, input.id));
    }
    await db.delete(productVariants).where(eq(productVariants.productId, input.id));
  } else {
    await db.insert(products).values(productValues);
  }

  const currentImageBySourceUrl = new Map(
    currentImages
      .map((image) => [image.sourceUrl ?? image.url, image] as const)
      .filter(([key]) => Boolean(key)),
  );
  const persistedImages: ManagedProductImageRecord[] = [];
  const imageWarnings: Array<string | undefined> = [];

  for (const [index, sourceUrl] of normalizedImageSourceUrls.entries()) {
    const currentImage = currentImageBySourceUrl.get(sourceUrl);
    const persistedImage = await persistManagedProductImage({
      productName: input.name,
      position: index,
      sourceUrl,
      sourcePageUrl: input.sourceUrl,
      currentImage: currentImage ? mapManagedProductImageReference(currentImage) : undefined,
    });

    persistedImages.push(persistedImage.image);
    imageWarnings.push(persistedImage.warning);
  }

  if (persistedImages.length > 0) {
    await db.insert(productImages).values(
      persistedImages.map((image, index) => ({
        id: createId("image"),
        productId,
        url: image.url,
        ...(productImagesCompatibility.hasSourceUrl ? { sourceUrl: image.sourceUrl || image.url } : {}),
        ...(productImagesCompatibility.hasProvider ? { provider: image.provider || null } : {}),
        ...(productImagesCompatibility.hasAssetKey ? { assetKey: image.assetKey || null } : {}),
        ...(productImagesCompatibility.hasCloudName ? { cloudName: image.cloudName || null } : {}),
        ...(productImagesCompatibility.hasVariantsManifest ? { variantsManifest: null } : {}),
        alt: buildProductImageAlt({ productName: input.name, imageIndex: index + 1, totalImages: persistedImages.length }),
        position: index,
        source: input.sourceUrl && input.sourceUrl.includes("yupoo") ? ("yupoo" as const) : ("manual" as const),
      })),
    );
  }

  const cleanupWarnings = await Promise.all(
    currentImages.map(async (image) => {
      const currentReference = mapManagedProductImageReference(image);
      const nextImage = persistedImages.find(
        (candidate) => candidate.sourceUrl === (image.sourceUrl ?? image.url) || candidate.assetKey === image.assetKey,
      );

      if (!nextImage || shouldCleanupPreviousManagedProductImage(currentReference, nextImage)) {
        return cleanupManagedProductImage(currentReference);
      }

      return { warning: undefined as string | undefined };
    }),
  );

  if (input.sizes.length > 0) {
    await db.insert(productSizes).values(
      input.sizes.map((label, index) => ({
        id: createId("size"),
        productId,
        label,
        position: index,
      })),
    );
  }

  if (productSizeGuidesCompatibility.hasTable && normalizedSizeGuide) {
    await db.insert(productSizeGuides).values({
      id: createId("sizeguide"),
      productId,
      title: normalizedSizeGuide.title ?? "",
      unitLabel: normalizedSizeGuide.unitLabel ?? "",
      notes: normalizedSizeGuide.notes ?? "",
      sourceImageUrl: normalizedSizeGuide.sourceImageUrl ?? null,
      columns: normalizedSizeGuide.columns,
      rows: normalizedSizeGuide.rows,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  if (input.variants.length > 0) {
    await db.insert(productVariants).values(
      input.variants.map((label, index) => ({
        id: createId("variant"),
        productId,
        label,
        position: index,
      })),
    );
  }

  return {
    id: productId,
    slug,
    warning: mergeWarnings(
      ...imageWarnings,
      ...cleanupWarnings.map((entry) => entry.warning),
      getProductImagesSchemaCompatibilityWarning(productImagesCompatibility),
      getProductSizeGuidesSchemaCompatibilityWarning(productSizeGuidesCompatibility),
    ),
  };
}

export async function deleteProduct(productId: string) {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is required to delete products.");
  }

  const currentImages = await selectProductManagedImageStates(productId);
  await db.delete(products).where(eq(products.id, productId));

  await Promise.all(currentImages.rows.map((image) => cleanupManagedProductImage(mapManagedProductImageReference(image))));
}

export async function updateProductState(productId: string, state: ProductState) {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is required to update product state.");
  }

  await db.update(products).set({ state, updatedAt: new Date() }).where(eq(products.id, productId));
}

export async function createBrand(input: { name: string; imageUrl?: string; imageAlt?: string }) {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is required to create brands.");
  }

  const compatibility = await getBrandSchemaCompatibility();
  const slug = await ensureUniqueEntitySlug("brand", input.name);
  const persistedImage = await persistManagedBrandImage({
    entity: "brands",
    sourceUrl: input.imageUrl,
    name: input.name,
  });

  const values: typeof brands.$inferInsert = {
    id: createId("brand"),
    name: input.name,
    slug,
    imageUrl: persistedImage.imageUrl || null,
    imageAlt: input.imageAlt || "",
  };

  if (compatibility.hasImageSourceUrl) {
    values.imageSourceUrl = persistedImage.imageSourceUrl || null;
  }

  if (compatibility.hasImageProvider) {
    values.imageProvider = persistedImage.imageProvider || null;
  }

  if (compatibility.hasImageAssetKey) {
    values.imageAssetKey = persistedImage.imageAssetKey || null;
  }

  await db.insert(brands).values(values);

  return {
    ...persistedImage,
    warning: mergeWarnings(persistedImage.warning, getBrandSchemaCompatibilityWarning(compatibility)),
  };
}

export async function updateBrand(id: string, input: { name: string; imageUrl?: string; imageAlt?: string }) {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is required to update brands.");
  }

  const compatibility = await getBrandSchemaCompatibility();
  const slug = await ensureUniqueEntitySlug("brand", input.name, id);
  const currentBrand = await selectBrandManagedImageState(id);

  if (!currentBrand) {
    throw new Error("No encontramos la marca que querés editar.");
  }

  const currentImage = mapManagedBrandImageReference(currentBrand);
  const persistedImage = await persistManagedBrandImage({
    entity: "brands",
    sourceUrl: input.imageUrl,
    name: input.name,
    currentImage,
  });

  await db
    .update(brands)
    .set({
      name: input.name,
      slug,
      imageUrl: persistedImage.imageUrl || null,
      ...(compatibility.hasImageSourceUrl ? { imageSourceUrl: persistedImage.imageSourceUrl || null } : {}),
      ...(compatibility.hasImageProvider ? { imageProvider: persistedImage.imageProvider || null } : {}),
      ...(compatibility.hasImageAssetKey ? { imageAssetKey: persistedImage.imageAssetKey || null } : {}),
      imageAlt: input.imageAlt || "",
      updatedAt: new Date(),
    })
    .where(eq(brands.id, id));

  const cleanup = shouldCleanupPreviousManagedBrandImage(currentImage, persistedImage)
    ? await cleanupManagedBrandImage(currentImage)
    : { warning: undefined as string | undefined };

  return {
    ...persistedImage,
    warning: mergeWarnings(persistedImage.warning, cleanup.warning, getBrandSchemaCompatibilityWarning(compatibility)),
  };
}

export async function deleteBrand(id: string) {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is required to delete brands.");
  }

  const productMatch = await db.query.products.findFirst({
    where: eq(products.brandId, id),
    columns: { id: true },
  });

  if (productMatch) {
    throw new Error("No podés borrar una marca con productos asociados.");
  }

  const currentBrand = await selectBrandManagedImageState(id);
  const currentImage = currentBrand ? mapManagedBrandImageReference(currentBrand) : undefined;

  await db.delete(brands).where(eq(brands.id, id));

  const cleanup = await cleanupManagedBrandImage(currentImage);

  return cleanup;
}

export async function createCategory(input: {
  name: string;
  description: string;
  imageUrl?: string;
  imageAlt?: string;
}) {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is required to create categories.");
  }

  const slug = await ensureUniqueEntitySlug("category", input.name);
  const persistedImage = await persistRemoteImageLocally({
    entity: "categories",
    sourceUrl: input.imageUrl,
    name: input.name,
  });

  await db.insert(categories).values({
    id: createId("category"),
    name: input.name,
    slug,
    description: input.description,
    imageUrl: persistedImage.imageUrl || null,
    imageAlt: input.imageAlt || "",
  });

  return persistedImage;
}

export async function updateCategory(
  id: string,
  input: {
    name: string;
    description: string;
    imageUrl?: string;
    imageAlt?: string;
  },
) {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is required to update categories.");
  }

  const slug = await ensureUniqueEntitySlug("category", input.name, id);
  const persistedImage = await persistRemoteImageLocally({
    entity: "categories",
    sourceUrl: input.imageUrl,
    name: input.name,
  });

  await db
    .update(categories)
    .set({
      name: input.name,
      slug,
      description: input.description,
      imageUrl: persistedImage.imageUrl || null,
      imageAlt: input.imageAlt || "",
      updatedAt: new Date(),
    })
    .where(eq(categories.id, id));

  return persistedImage;
}

export async function deleteCategory(id: string) {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is required to delete categories.");
  }

  const productMatch = await db.query.products.findFirst({
    where: eq(products.categoryId, id),
    columns: { id: true },
  });

  if (productMatch) {
    throw new Error("No podés borrar una categoría con productos asociados.");
  }

  await db.delete(categories).where(eq(categories.id, id));
}

async function ensureUniqueEntitySlug(entity: "brand" | "category", name: string, currentId?: string) {
  const db = getDb();
  const table = entity === "brand" ? brands : categories;
  const baseSlug = slugify(name) || entity;

  if (!db) {
    return baseSlug;
  }

  let candidate = baseSlug;
  let counter = 1;

  while (true) {
    const rows = await db
      .select({ id: table.id })
      .from(table)
      .where(and(eq(table.slug, candidate), currentId ? sql`${table.id} <> ${currentId}` : undefined))
      .limit(1);

    if (rows.length === 0) {
      return candidate;
    }

    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }
}

export async function getAdminProductById(productId: string) {
  const db = getDb();

  if (!db) {
    const product = fallbackData.products.find((item) => item.id === productId || item.slug === productId);

    if (!product) {
      return null;
    }

    return {
      id: product.id,
      type: product.availability,
      name: product.name,
      brandId: product.brandId,
      categoryId: product.categoryId,
      priceArs: product.pricing.amount,
      description: product.detail,
      availabilityNote: product.note,
      state: product.state ?? "published",
      sourceUrl: product.sourceUrl ?? "",
      imageUrls: normalizeProductImageSourceUrls(product.sourceUrl, product.gallery.map((image) => image.src)),
      sizes: product.sizes?.map((size) => size.label) ?? [],
      sizeGuide: product.sizeGuide,
      variants: product.variants?.map((variant) => variant.label) ?? [],
    };
  }

  const productRow = await db.query.products.findFirst({
    where: eq(products.id, productId),
  });

  if (!productRow) {
    return null;
  }

  const productSizeGuidesCompatibility = await getProductSizeGuidesSchemaCompatibility();
  const [productImageSelection, sizeRows, variantRows, sizeGuideRow] = await Promise.all([
    selectProductManagedImageStates(productId),
    db.select().from(productSizes).where(eq(productSizes.productId, productId)).orderBy(asc(productSizes.position)),
    db.select().from(productVariants).where(eq(productVariants.productId, productId)).orderBy(asc(productVariants.position)),
    productSizeGuidesCompatibility.hasTable
      ? db.query.productSizeGuides.findFirst({ where: eq(productSizeGuides.productId, productId) })
      : Promise.resolve(undefined),
  ]);
  const imageRows = productImageSelection.rows;

  return {
    id: productRow.id,
    type: productRow.type,
    name: productRow.name,
    brandId: productRow.brandId,
    categoryId: productRow.categoryId,
    priceArs: productRow.priceArs,
    description: productRow.description,
    availabilityNote: productRow.availabilityNote,
    state: productRow.state,
    sourceUrl: productRow.sourceUrl ?? "",
    imageUrls: normalizeProductImageSourceUrls(
      productRow.sourceUrl ?? undefined,
      imageRows.map((image) => image.sourceUrl ?? image.url),
    ),
    sizes: sizeRows.map((size) => size.label),
    sizeGuide: sizeGuideRow ? mapProductSizeGuide(sizeGuideRow as ProductSizeGuideRowCompat) : undefined,
    variants: variantRows.map((variant) => variant.label),
  };
}

export async function getPublishedEntityIds() {
  const publishedProducts = await getProductsRepository({ states: ["published"] });

  return {
    brandIds: uniqueValues(publishedProducts.map((product) => product.brandId)),
    categoryIds: uniqueValues(publishedProducts.map((product) => product.categoryId)),
  };
}

export async function getEntityCounts() {
  const db = getDb();

  if (!db) {
    return {
      products: fallbackData.products.length,
      brands: fallbackData.brands.length,
      categories: fallbackData.categories.length,
    };
  }

  const [productCount, brandCount, categoryCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(products),
    db.select({ count: sql<number>`count(*)::int` }).from(brands),
    db.select({ count: sql<number>`count(*)::int` }).from(categories),
  ]);

  return {
    products: productCount[0]?.count ?? 0,
    brands: brandCount[0]?.count ?? 0,
    categories: categoryCount[0]?.count ?? 0,
  };
}

export async function getProductsByIds(productIds: string[]) {
  const db = getDb();

  if (!db) {
    return fallbackData.products.filter((product) => productIds.includes(product.id));
  }

  if (productIds.length === 0) {
    return [];
  }

  const rows = await db.select().from(products).where(inArray(products.id, productIds));

  return rows;
}
