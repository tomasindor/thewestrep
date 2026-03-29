import "server-only";

import { cache } from "react";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb, getDbSql } from "@/lib/db/client";
import { getBrandSchemaCompatibility, getBrandSchemaCompatibilityWarning } from "@/lib/db/brands-schema-compat";
import { brands, categories, productImages, products, productSizes, productVariants } from "@/lib/db/schema";
import { buildEditableCommercialAvailabilityBySlug, enrichCommercialAvailabilityInfo } from "@/lib/catalog/commercial-availability";
import {
  cleanupManagedBrandImage,
  type ManagedBrandImageReference,
  type ManagedImageProvider,
  persistManagedBrandImage,
} from "@/lib/media/brand-images";
import { persistRemoteImageLocally } from "@/lib/media/persistence";
import type {
  Brand,
  Category,
  Product,
  ProductAvailability,
  ProductAvailabilityInfo,
  ProductSize,
  ProductState,
} from "@/lib/catalog/types";
import { catalogInventorySource } from "@/lib/catalog/data/inventory";
import { buildProductWhatsappCta, buildProductWhatsappMessage } from "@/lib/catalog/whatsapp";
import { createId, defaultProductImage, formatArs, slugify, uniqueValues } from "@/lib/utils";

const DEFAULT_PRODUCT_NOTE: Record<ProductAvailability, string> = {
  stock: "Consultá disponibilidad y coordinamos por WhatsApp.",
  encargue: "Pedilo por encargue y te pasamos precio final por WhatsApp.",
};

function mapFallbackBrands() {
  return catalogInventorySource.brands.map((brand) => ({
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    image: brand.image,
    imageSourceUrl: brand.image,
    alt: brand.alt,
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
    alt: category.alt,
    featuredOnHomepage: category.featuredOnHomepage,
    featuredOnHero: category.featuredOnHero,
  })) satisfies Category[];
}

function mapFallbackProducts() {
  return catalogInventorySource.products.map((product) => ({
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
  })) satisfies Product[];
}

const fallbackData = {
  brands: mapFallbackBrands(),
  categories: mapFallbackCategories(),
  products: mapFallbackProducts(),
};

function parseManagedImageProvider(value: string | null | undefined): ManagedImageProvider | null {
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

function mergeWarnings(...warnings: Array<string | undefined>) {
  return warnings.filter(Boolean).join(" ") || undefined;
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
    const [brandRows, categoryRows, productRows, imageRows, sizeRows, variantRows] = await Promise.all([
      selectBrandRows(),
      db.select().from(categories).orderBy(asc(categories.name)),
      db.select().from(products).orderBy(desc(products.updatedAt), desc(products.createdAt)),
      db.select().from(productImages).orderBy(asc(productImages.position), asc(productImages.createdAt)),
      db.select().from(productSizes).orderBy(asc(productSizes.position), asc(productSizes.createdAt)),
      db.select().from(productVariants).orderBy(asc(productVariants.position), asc(productVariants.createdAt)),
    ]);

    const imagesByProductId = new Map<string, typeof imageRows>();
    const sizesByProductId = new Map<string, typeof sizeRows>();
    const variantsByProductId = new Map<string, typeof variantRows>();

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

    const commercialAvailabilityBySlug = buildEditableCommercialAvailabilityBySlug();

    return {
      brands: brandRows.map((brand) => ({
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        image: brand.imageUrl ?? undefined,
        imageSourceUrl: brand.imageSourceUrl ?? brand.imageUrl ?? undefined,
        imageProvider: brand.imageProvider ?? undefined,
        alt: brand.imageAlt || `Imagen de ${brand.name}`,
      })) satisfies Brand[],
      categories: categoryRows.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        image: category.imageUrl ?? "/destacada.png",
        alt: category.imageAlt || `Imagen de ${category.name}`,
      })) satisfies Category[],
      products: productRows.map((product) => {
        const productImageRows = imagesByProductId.get(product.id) ?? [];
        const fallbackImage = defaultProductImage(product.name);
        const fallbackAvailabilityInfo = {
          summary:
            product.type === "stock"
              ? "Coordiná stock y entrega por WhatsApp."
              : "Cotización por encargue con WhatsApp como canal principal.",
        } satisfies ProductAvailabilityInfo;

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
          detail: product.description || "Pieza curada por thewestrep.",
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
            productImageRows.length > 0
              ? productImageRows.map((image, index) => ({
                  id: image.id,
                  src: image.url,
                  alt: image.alt || `Imagen ${index + 1} de ${product.name}`,
                  role: index === 0 ? ("cover" as const) : ("gallery" as const),
                }))
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
  return (await loadDatabaseCatalog()) ?? fallbackData;
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

  const slug = await ensureUniqueSlug(input.name, input.id);
  const productId = input.id ?? createId("product");

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
    await db.delete(productVariants).where(eq(productVariants.productId, input.id));
  } else {
    await db.insert(products).values(productValues);
  }

  if (input.imageUrls.length > 0) {
    await db.insert(productImages).values(
      input.imageUrls.map((url, index) => ({
        id: createId("image"),
        productId,
        url,
        alt: `${input.name} ${index + 1}`,
        position: index,
        source: input.sourceUrl && input.sourceUrl.includes("yupoo") ? ("yupoo" as const) : ("manual" as const),
      })),
    );
  }

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

  return { id: productId, slug };
}

export async function deleteProduct(productId: string) {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is required to delete products.");
  }

  await db.delete(products).where(eq(products.id, productId));
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

  const persistedImage = await persistManagedBrandImage({
    entity: "brands",
    sourceUrl: input.imageUrl,
    name: input.name,
    currentImage: mapManagedBrandImageReference(currentBrand),
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

  return {
    ...persistedImage,
    warning: mergeWarnings(persistedImage.warning, getBrandSchemaCompatibilityWarning(compatibility)),
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

  const cleanup = await cleanupManagedBrandImage(currentBrand ? mapManagedBrandImageReference(currentBrand) : undefined);

  await db.delete(brands).where(eq(brands.id, id));

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
      imageUrls: product.gallery.map((image) => image.src),
      sizes: product.sizes?.map((size) => size.label) ?? [],
      variants: product.variants?.map((variant) => variant.label) ?? [],
    };
  }

  const productRow = await db.query.products.findFirst({
    where: eq(products.id, productId),
  });

  if (!productRow) {
    return null;
  }

  const [imageRows, sizeRows, variantRows] = await Promise.all([
    db.select().from(productImages).where(eq(productImages.productId, productId)).orderBy(asc(productImages.position)),
    db.select().from(productSizes).where(eq(productSizes.productId, productId)).orderBy(asc(productSizes.position)),
    db.select().from(productVariants).where(eq(productVariants.productId, productId)).orderBy(asc(productVariants.position)),
  ]);

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
    imageUrls: imageRows.map((image) => image.url),
    sizes: sizeRows.map((size) => size.label),
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
