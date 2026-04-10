import "server-only";

import { asc, eq } from "drizzle-orm";

import { DEFAULT_PRODUCT_SIZE_GUIDE_COLUMNS, normalizeProductSizeGuide } from "@/lib/catalog/size-guides";
import {
  importImages,
  importItems,
  productImages,
  products,
  productSizeGuides,
} from "@/lib/db/schema";
import type { ImageVariantsManifest } from "@/lib/types/media";
import { createId, slugify } from "@/lib/utils";

type ProductState = "draft" | "published" | "paused";

export interface StagedImportItem {
  id: string;
  status: string;
  productData: Record<string, unknown> | null;
}

export interface StagedImportImage {
  id: string;
  importItemId: string;
  originalUrl: string;
  sourceYupooUrl: string | null;
  r2Key: string;
  variantsManifest: ImageVariantsManifest | null;
  order: number;
  reviewState: string;
  isSizeGuide: boolean;
}

interface PromotionProductInput {
  name: string;
  slug: string;
  brandId: string;
  categoryId: string;
  type: "stock" | "encargue";
  priceArs: number;
  description: string;
  sourceUrl?: string;
  sizeGuide?: {
    title?: string;
    unitLabel?: string;
    notes?: string;
    sourceImageUrl?: string;
    columns: string[];
    rows: Array<{ label: string; values: string[] }>;
  };
}

interface ExistingProduct {
  id: string;
  slug: string;
  state: ProductState;
}

interface ProductIdentity {
  id: string;
  slug: string;
}

interface ProductImageInsertInput {
  id: string;
  productId: string;
  url: string;
  sourceUrl: string;
  provider: "r2";
  assetKey: string;
  variantsManifest: ImageVariantsManifest | null;
  alt: string;
  position: number;
  source: "yupoo";
  createdAt: Date;
}

interface ProductSizeGuideInput {
  productId: string;
  title: string;
  unitLabel: string;
  notes: string;
  sourceImageUrl?: string;
  columns: string[];
  rows: Array<{ label: string; values: string[] }>;
  now: Date;
}

export interface PromotionFoundation {
  now: () => Date;
  idFactory: (prefix: string) => string;
  buildOwnedAssetUrl: (assetKey: string) => string;
  loadImportItemById: (importItemId: string) => Promise<StagedImportItem | null>;
  loadImportImagesByItemId: (importItemId: string) => Promise<StagedImportImage[]>;
  findProductBySlug: (slug: string) => Promise<ExistingProduct | null>;
  createProduct: (values: Record<string, unknown>) => Promise<ProductIdentity>;
  updateProduct: (productId: string, values: Record<string, unknown>) => Promise<void>;
  insertProductImage: (values: ProductImageInsertInput) => Promise<void>;
  upsertProductSizeGuide: (values: ProductSizeGuideInput) => Promise<void>;
}

export interface PromoteImportItemInput {
  importItemId: string;
}

export interface PromoteImportItemResult {
  importItemId: string;
  productId: string;
  productSlug: string;
  createdProduct: boolean;
  imagesInserted: number;
  sizeGuidePreserved: boolean;
}

function toNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return fallback;
}

function requireStringField(productData: Record<string, unknown>, key: string) {
  const value = productData[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`El campo ${key} es obligatorio para promover el item importado.`);
  }

  return value.trim();
}

function parsePromotionProductInput(productData: Record<string, unknown> | null): PromotionProductInput {
  if (!productData) {
    throw new Error("El item importado no tiene productData para promoción.");
  }

  const name = requireStringField(productData, "name");
  const slugValue = typeof productData.slug === "string" && productData.slug.trim().length > 0
    ? productData.slug
    : slugify(name);
  const brandId = requireStringField(productData, "brandId");
  const categoryId = requireStringField(productData, "categoryId");
  const type = productData.type === "stock" ? "stock" : "encargue";
  const sourceUrl = typeof productData.sourceUrl === "string" && productData.sourceUrl.trim().length > 0
    ? productData.sourceUrl
    : undefined;
  const description = typeof productData.description === "string" ? productData.description : "";
  const sizeGuideCandidate = productData.sizeGuide;
  const sizeGuideRecord = sizeGuideCandidate && typeof sizeGuideCandidate === "object"
    ? sizeGuideCandidate as Record<string, unknown>
    : null;
  const normalizedGuide = normalizeProductSizeGuide(
    sizeGuideRecord
      ? {
        title: typeof sizeGuideRecord.title === "string" ? sizeGuideRecord.title : "",
        unitLabel: typeof sizeGuideRecord.unitLabel === "string" ? sizeGuideRecord.unitLabel : "",
        notes: typeof sizeGuideRecord.notes === "string" ? sizeGuideRecord.notes : "",
        sourceImageUrl: typeof sizeGuideRecord.sourceImageUrl === "string" ? sizeGuideRecord.sourceImageUrl : "",
        columns: Array.isArray(sizeGuideRecord.columns)
          ? sizeGuideRecord.columns.filter((entry): entry is string => typeof entry === "string")
          : [],
        rows: Array.isArray(sizeGuideRecord.rows)
          ? sizeGuideRecord.rows
            .filter((entry): entry is { label?: unknown; values?: unknown } => Boolean(entry && typeof entry === "object"))
            .map((entry) => ({
              label: typeof entry.label === "string" ? entry.label : "",
              values: Array.isArray(entry.values) ? entry.values.filter((value): value is string => typeof value === "string") : [],
            }))
          : [],
      }
      : null,
  );

  return {
    name,
    slug: slugify(slugValue),
    brandId,
    categoryId,
    type,
    priceArs: toNumber(productData.priceArs, 0),
    description,
    sourceUrl,
    sizeGuide: normalizedGuide
      ? {
        title: normalizedGuide.title,
        unitLabel: normalizedGuide.unitLabel,
        notes: normalizedGuide.notes,
        sourceImageUrl: normalizedGuide.sourceImageUrl,
        columns: normalizedGuide.columns,
        rows: normalizedGuide.rows,
      }
      : undefined,
  };
}

export function updateProductImageUrls(input: {
  productId: string;
  productName: string;
  approvedImages: readonly StagedImportImage[];
  idFactory: (prefix: string) => string;
  now: Date;
  buildOwnedAssetUrl: (assetKey: string) => string;
}) {
  return input.approvedImages.map((image, index) => {
    const preferredAssetKey = image.variantsManifest?.variants?.detail
      ?? image.variantsManifest?.original
      ?? image.r2Key;

    return {
      id: input.idFactory("product-image"),
      productId: input.productId,
      url: input.buildOwnedAssetUrl(preferredAssetKey),
      sourceUrl: image.originalUrl,
      provider: "r2" as const,
      assetKey: preferredAssetKey,
      variantsManifest: image.variantsManifest,
      alt: `${input.productName} ${index + 1}`,
      position: index,
      source: "yupoo" as const,
      createdAt: input.now,
    } satisfies ProductImageInsertInput;
  });
}

export async function createProductImages(
  foundation: PromotionFoundation,
  rows: readonly ProductImageInsertInput[],
) {
  for (const row of rows) {
    await foundation.insertProductImage(row);
  }
}

export async function copyToProducts(
  foundation: PromotionFoundation,
  productInput: PromotionProductInput,
  now: Date,
) {
  const existing = await foundation.findProductBySlug(productInput.slug);

  if (existing && existing.state !== "draft") {
    throw new Error("Solo se puede promover sobre productos en estado draft.");
  }

  if (existing) {
    await foundation.updateProduct(existing.id, {
      type: productInput.type,
      name: productInput.name,
      brandId: productInput.brandId,
      categoryId: productInput.categoryId,
      priceArs: productInput.priceArs,
      description: productInput.description,
      sourceUrl: productInput.sourceUrl ?? null,
      updatedAt: now,
    });

    return {
      product: { id: existing.id, slug: existing.slug },
      created: false,
    };
  }

  const created = await foundation.createProduct({
    id: foundation.idFactory("product"),
    type: productInput.type,
    name: productInput.name,
    slug: productInput.slug,
    brandId: productInput.brandId,
    categoryId: productInput.categoryId,
    priceArs: productInput.priceArs,
    description: productInput.description,
    availabilityNote: "",
    whatsappCtaLabel: "",
    whatsappMessage: "",
    state: "draft",
    sourceUrl: productInput.sourceUrl ?? null,
    createdAt: now,
    updatedAt: now,
  });

  return {
    product: created,
    created: true,
  };
}

export async function preserveSizeGuides(input: {
  foundation: PromotionFoundation;
  productId: string;
  productSizeGuide: PromotionProductInput["sizeGuide"];
  approvedImages: readonly StagedImportImage[];
  now: Date;
}) {
  const sourceImageUrl = input.productSizeGuide?.sourceImageUrl
    ?? input.approvedImages.find((image) => image.isSizeGuide)?.originalUrl;

  if (!input.productSizeGuide && !sourceImageUrl) {
    return false;
  }

  await input.foundation.upsertProductSizeGuide({
    productId: input.productId,
    title: input.productSizeGuide?.title ?? "",
    unitLabel: input.productSizeGuide?.unitLabel ?? "",
    notes: input.productSizeGuide?.notes ?? "",
    sourceImageUrl,
    columns: input.productSizeGuide?.columns ?? [...DEFAULT_PRODUCT_SIZE_GUIDE_COLUMNS],
    rows: input.productSizeGuide?.rows ?? [],
    now: input.now,
  });

  return true;
}

export async function promoteImportItem(
  input: PromoteImportItemInput,
  foundation: PromotionFoundation,
): Promise<PromoteImportItemResult> {
  const importItem = await foundation.loadImportItemById(input.importItemId);

  if (!importItem) {
    throw new Error("No se encontró el import_item solicitado.");
  }

  if (importItem.status !== "approved") {
    throw new Error("Solo se pueden promover items en estado approved.");
  }

  const approvedImages = (await foundation.loadImportImagesByItemId(importItem.id))
    .filter((image) => image.reviewState === "approved")
    .sort((left, right) => left.order - right.order);

  if (approvedImages.length === 0) {
    throw new Error("No hay imágenes aprobadas para promover.");
  }

  const now = foundation.now();
  const productInput = parsePromotionProductInput(importItem.productData);
  const { product, created } = await copyToProducts(foundation, productInput, now);
  const imageRows = updateProductImageUrls({
    productId: product.id,
    productName: productInput.name,
    approvedImages,
    idFactory: foundation.idFactory,
    now,
    buildOwnedAssetUrl: foundation.buildOwnedAssetUrl,
  });

  await createProductImages(foundation, imageRows);

  const sizeGuidePreserved = await preserveSizeGuides({
    foundation,
    productId: product.id,
    productSizeGuide: productInput.sizeGuide,
    approvedImages,
    now,
  });

  return {
    importItemId: input.importItemId,
    productId: product.id,
    productSlug: product.slug,
    createdProduct: created,
    imagesInserted: imageRows.length,
    sizeGuidePreserved,
  };
}

export function createPromotionFoundation(overrides: Partial<PromotionFoundation>): PromotionFoundation {
  return {
    now: () => new Date(),
    idFactory: createId,
    buildOwnedAssetUrl: (assetKey) => `r2://${assetKey}`,
    async loadImportItemById() {
      throw new Error("loadImportItemById no configurado.");
    },
    async loadImportImagesByItemId() {
      throw new Error("loadImportImagesByItemId no configurado.");
    },
    async findProductBySlug() {
      throw new Error("findProductBySlug no configurado.");
    },
    async createProduct() {
      throw new Error("createProduct no configurado.");
    },
    async updateProduct() {
      throw new Error("updateProduct no configurado.");
    },
    async insertProductImage() {
      throw new Error("insertProductImage no configurado.");
    },
    async upsertProductSizeGuide() {
      throw new Error("upsertProductSizeGuide no configurado.");
    },
    ...overrides,
  };
}

export function createPromotionFoundationFromDb(options: {
  db: {
    query: {
      importItems: { findFirst(input: { where: unknown }): Promise<typeof importItems.$inferSelect | undefined> };
      importImages: { findMany(input: { where: unknown; orderBy?: unknown[] }): Promise<Array<typeof importImages.$inferSelect>> };
      products: { findFirst(input: { where: unknown }): Promise<typeof products.$inferSelect | undefined> };
      productSizeGuides: { findFirst(input: { where: unknown }): Promise<typeof productSizeGuides.$inferSelect | undefined> };
    };
    insert(table: unknown): { values(values: unknown): Promise<unknown> };
    update(table: unknown): { set(values: unknown): { where(predicate: unknown): Promise<unknown> } };
  };
  now?: () => Date;
  idFactory?: (prefix: string) => string;
  buildOwnedAssetUrl?: (assetKey: string) => string;
}): PromotionFoundation {
  const now = options.now ?? (() => new Date());
  const idFactory = options.idFactory ?? createId;

  return createPromotionFoundation({
    now,
    idFactory,
    buildOwnedAssetUrl: options.buildOwnedAssetUrl ?? ((assetKey) => `r2://${assetKey}`),
    loadImportItemById: async (importItemId) => {
      const row = await options.db.query.importItems.findFirst({ where: eq(importItems.id, importItemId) });
      if (!row) return null;
      return {
        id: row.id,
        status: row.status,
        productData: row.productData,
      };
    },
    loadImportImagesByItemId: async (importItemId) => {
      const rows = await options.db.query.importImages.findMany({
        where: eq(importImages.importItemId, importItemId),
        orderBy: [asc(importImages.order)],
      });

      return rows.map((row) => ({
        id: row.id,
        importItemId: row.importItemId,
        originalUrl: row.originalUrl,
        sourceYupooUrl: row.sourceYupooUrl,
        r2Key: row.r2Key,
        variantsManifest: row.variantsManifest,
        order: row.order,
        reviewState: row.reviewState,
        isSizeGuide: row.isSizeGuide,
      }));
    },
    findProductBySlug: async (slug) => {
      const row = await options.db.query.products.findFirst({ where: eq(products.slug, slug) });
      if (!row) return null;
      return {
        id: row.id,
        slug: row.slug,
        state: row.state,
      };
    },
    createProduct: async (values) => {
      await options.db.insert(products).values(values);
      return {
        id: String(values.id),
        slug: String(values.slug),
      };
    },
    updateProduct: async (productId, values) => {
      await options.db.update(products).set(values).where(eq(products.id, productId));
    },
    insertProductImage: async (values) => {
      await options.db.insert(productImages).values(values);
    },
    upsertProductSizeGuide: async (values) => {
      const existing = await options.db.query.productSizeGuides.findFirst({
        where: eq(productSizeGuides.productId, values.productId),
      });

      if (existing) {
        await options.db.update(productSizeGuides).set({
          title: values.title,
          unitLabel: values.unitLabel,
          notes: values.notes,
          sourceImageUrl: values.sourceImageUrl ?? null,
          columns: values.columns,
          rows: values.rows,
          updatedAt: values.now,
        }).where(eq(productSizeGuides.productId, values.productId));
        return;
      }

      await options.db.insert(productSizeGuides).values({
        id: idFactory("product-size-guide"),
        productId: values.productId,
        title: values.title,
        unitLabel: values.unitLabel,
        notes: values.notes,
        sourceImageUrl: values.sourceImageUrl ?? null,
        columns: values.columns,
        rows: values.rows,
        createdAt: values.now,
        updatedAt: values.now,
      });
    },
  });
}
