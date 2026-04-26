import "server-only";

import { asc, eq, sql } from "drizzle-orm";

import { DEFAULT_PRODUCT_SIZE_GUIDE_COLUMNS, normalizeProductSizeGuide } from "@/lib/catalog/size-guides";
import {
  brands,
  categories,
  importImages,
  importItems,
  productImages,
  productSizes,
  productVariants,
  products,
  productSizeGuides,
} from "@/lib/db/schema";
import { isImageActive, type ImportReviewState } from "@/lib/imports/curation-state";
import {
  generateCatalogVariants,
  mapVariantNameToManifestField,
  type CatalogImageVariantName,
  type GenerateCatalogVariantsResult,
} from "@/lib/media/variants";
import { createR2StorageFromEnv } from "@/lib/media/r2-storage-adapter";
import type { ImageVariantsManifest } from "@/lib/types/media";
import { createId, slugify } from "@/lib/utils";

type ProductState = "draft" | "published" | "paused";

export interface StagedImportItem {
  id: string;
  status: string;
  productData: Record<string, unknown> | null;
  price: number | null;
}

export interface StagedImportImage {
  id: string;
  importItemId: string;
  sourceUrl: string;
  variantsManifest?: ImageVariantsManifest | null;
  order: number;
  reviewState: ImportReviewState;
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
  comboEligible: boolean;
  comboGroup: string | null;
  comboPriority: number;
  comboSourceKey: string | null;
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

type PromotionMetadataContext = {
  importItemId: string;
  productData: Record<string, unknown>;
  importItemPrice: number | null;
};

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

interface ProductVariantInsertInput {
  id: string;
  productId: string;
  label: string;
  position: number;
  createdAt: Date;
}

interface ProductSizeInsertInput {
  id: string;
  productId: string;
  label: string;
  position: number;
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
  listEligibleImportItems?: (input?: { itemIds?: string[] }) => Promise<StagedImportItem[]>;
  findBrandIdByName?: (name: string) => Promise<string | null>;
  findCategoryIdByName?: (name: string) => Promise<string | null>;
  findProductBySlug: (slug: string) => Promise<ExistingProduct | null>;
  createProduct: (values: Record<string, unknown>) => Promise<ProductIdentity>;
  updateProduct: (productId: string, values: Record<string, unknown>) => Promise<void>;
  insertProductImage: (values: ProductImageInsertInput) => Promise<void>;
  insertProductSize: (values: ProductSizeInsertInput) => Promise<void>;
  insertProductVariant: (values: ProductVariantInsertInput) => Promise<void>;
  upsertProductSizeGuide: (values: ProductSizeGuideInput) => Promise<void>;
  markImportItemPromoted: (input: { importItemId: string; promotedAt: Date }) => Promise<void>;
  markImportItemMediaFailed: (input: { importItemId: string; failedAt: Date; reason: string }) => Promise<void>;
  downloadSourceImage: (url: string) => Promise<{ body: Buffer; contentType?: string }>;
  storeOriginalInR2: (write: { key: string; body: Buffer; contentType: string; sourceUrl: string }) => Promise<void>;
  generateCatalogVariants: (input: { source: Buffer; originalKey: string }) => Promise<GenerateCatalogVariantsResult>;
  storeVariantInR2: (write: { key: string; body: Buffer; contentType: string; sourceUrl: string }) => Promise<void>;
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

export interface BulkPromotionResult {
  promotedCount: number;
  promotedItemIds: string[];
  blocked: Array<{ itemId: string; reason: string; mediaStatus?: "failed" }>;
}

const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";
const REQUIRED_CATALOG_VARIANTS: readonly CatalogImageVariantName[] = ["thumb", "cart-thumb", "card", "detail", "lightbox"];
const DEFAULT_IMPORTED_CATEGORY_NAME = "Importados Yupoo";
const IMPORTED_CATEGORY_ALIAS_MAP: Readonly<Record<string, string>> = {
  buzo: "Hoodies",
  buzos: "Hoodies",
  hoodie: "Hoodies",
  hoodies: "Hoodies",
  sweatshirt: "Hoodies",
  sweatshirts: "Hoodies",
  remera: "Remeras",
  remeras: "Remeras",
  tee: "Remeras",
  tees: "Remeras",
  "t-shirt": "Remeras",
  "t-shirts": "Remeras",
  camiseta: "Remeras",
  camisetas: "Remeras",
  campera: "Camperas",
  camperas: "Camperas",
  jacket: "Camperas",
  jackets: "Camperas",
  coat: "Camperas",
  coats: "Camperas",
  windbreaker: "Camperas",
  pantalon: "Pantalones",
  pantalones: "Pantalones",
  pants: "Pantalones",
  jogger: "Pantalones",
  joggers: "Pantalones",
  trouser: "Pantalones",
  trousers: "Pantalones",
  short: "Shorts",
  shorts: "Shorts",
  gorro: "Gorros",
  gorros: "Gorros",
  cap: "Gorros",
  caps: "Gorros",
  hat: "Gorros",
  hats: "Gorros",
  beanie: "Gorros",
  camisa: "Camisas",
  camisas: "Camisas",
  shirt: "Camisas",
  shirts: "Camisas",
  polo: "Polos",
  polos: "Polos",
};

function resolveImageExtension(sourceUrl: string, contentType?: string) {
  if (contentType?.includes("png")) return ".png";
  if (contentType?.includes("webp")) return ".webp";
  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) return ".jpg";

  const extension = sourceUrl.match(/\.(jpe?g|png|webp)(?:$|[?#])/i)?.[1]?.toLowerCase();
  if (extension === "jpeg") return ".jpg";
  if (extension === "jpg" || extension === "png" || extension === "webp") return `.${extension}`;

  return ".jpg";
}

function buildPromotionOriginalKey(importItemId: string, order: number, sourceUrl: string, contentType?: string) {
  const extension = resolveImageExtension(sourceUrl, contentType);
  return `imports/promoted/${importItemId}/${String(order).padStart(3, "0")}/original${extension}`;
}

function toPositiveNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/\./g, "").replace(",", ".").trim();
    const parsed = Number(normalized);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function toIntegerOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }

  return null;
}

function asTrimmedString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function readStringFallback(productData: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys) {
    const value = asTrimmedString(productData[key]);
    if (value) {
      return value;
    }
  }

  return null;
}

function normalizeCategoryAliasKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();
}

function resolveImportedCategoryAlias(categoryName: string) {
  return IMPORTED_CATEGORY_ALIAS_MAP[normalizeCategoryAliasKey(categoryName)] ?? null;
}

function normalizeVariantLabel(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeVariantDedupKey(value: string) {
  return normalizeVariantLabel(value)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase();
}

function normalizeSizeLabel(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim().toUpperCase();
  if (!normalized) {
    return "";
  }

  if (normalized === "XXL") return "2XL";
  if (normalized === "XXXL") return "3XL";
  if (normalized === "XXXXL") return "4XL";

  return normalized;
}

function normalizeSizeDedupKey(value: string) {
  return normalizeSizeLabel(value)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase();
}

function extractProductSizeLabels(productData: Record<string, unknown>) {
  const raw = productData.sizes;
  const sourceValues = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(/\r?\n|,/)
      : [];

  const labels: string[] = [];
  const seen = new Set<string>();

  for (const entry of sourceValues) {
    if (typeof entry !== "string") {
      continue;
    }

    const normalized = normalizeSizeLabel(entry);
    if (!normalized) {
      continue;
    }

    const key = normalizeSizeDedupKey(normalized);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    labels.push(normalized);
  }

  return labels;
}

function extractProductVariantLabels(productData: Record<string, unknown>) {
  const raw = productData.variants;
  const sourceValues = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(/\r?\n|,/)
      : [];

  const labels: string[] = [];
  const seen = new Set<string>();

  for (const entry of sourceValues) {
    if (typeof entry !== "string") {
      continue;
    }

    const normalized = normalizeVariantLabel(entry);
    if (!normalized) {
      continue;
    }

    const key = normalizeVariantDedupKey(normalized);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    labels.push(normalized);
  }

  return labels;
}

function buildPromotionCategoryCandidates(categoryName: string | null) {
  const candidates: string[] = [];
  const pushCandidate = (value: string | null) => {
    const normalized = asTrimmedString(value);
    if (!normalized) {
      return;
    }

    if (!candidates.some((entry) => entry.toLocaleLowerCase() === normalized.toLocaleLowerCase())) {
      candidates.push(normalized);
    }
  };

  pushCandidate(categoryName);
  if (categoryName) {
    pushCandidate(resolveImportedCategoryAlias(categoryName));
  }
  pushCandidate(DEFAULT_IMPORTED_CATEGORY_NAME);
  return candidates;
}

function readPromotionConsumedAt(productData: Record<string, unknown> | null) {
  if (!productData) {
    return null;
  }

  const consumedAt = productData._promotionConsumedAt;
  return typeof consumedAt === "string" && consumedAt.trim().length > 0 ? consumedAt : null;
}

function isImportItemConsumed(productData: Record<string, unknown> | null) {
  return Boolean(readPromotionConsumedAt(productData));
}

function requireResolvedStringField(value: string | null, key: string) {
  if (!value) {
    throw new Error(`El campo ${key} es obligatorio para promover el item importado.`);
  }

  return value;
}

async function resolveBrandId(context: PromotionMetadataContext, foundation: PromotionFoundation) {
  const direct = asTrimmedString(context.productData.brandId);
  if (direct) {
    return direct;
  }

  const brandName = readStringFallback(context.productData, ["brandName", "brand"]);
  if (!brandName || !foundation.findBrandIdByName) {
    return null;
  }

  return foundation.findBrandIdByName(brandName);
}

async function resolveCategoryId(context: PromotionMetadataContext, foundation: PromotionFoundation) {
  const direct = asTrimmedString(context.productData.categoryId);
  if (direct) {
    return direct;
  }

  if (!foundation.findCategoryIdByName) {
    return null;
  }

  const categoryName = readStringFallback(context.productData, ["categoryName", "category"]);
  const candidates = buildPromotionCategoryCandidates(categoryName);
  for (const candidate of candidates) {
    const categoryId = await foundation.findCategoryIdByName(candidate);
    if (categoryId) {
      return categoryId;
    }
  }

  return null;
}

async function parsePromotionProductInput(
  importItem: StagedImportItem,
  foundation: PromotionFoundation,
): Promise<PromotionProductInput> {
  if (!importItem.productData) {
    throw new Error("El item importado no tiene productData para promoción.");
  }

  const context: PromotionMetadataContext = {
    importItemId: importItem.id,
    productData: importItem.productData,
    importItemPrice: importItem.price,
  };

  const name = requireResolvedStringField(
    readStringFallback(context.productData, ["finalName", "name", "productName", "rawName"]),
    "name",
  );

  const slugCandidate = readStringFallback(context.productData, ["slug"]);
  const slugValue = slugCandidate ?? slugify(name);

  const brandId = requireResolvedStringField(await resolveBrandId(context, foundation), "brandId");
  const categoryId = requireResolvedStringField(await resolveCategoryId(context, foundation), "categoryId");

  const resolvedPrice = toPositiveNumber(context.productData.finalPrice)
    ?? toPositiveNumber(context.productData.priceArs)
    ?? toPositiveNumber(context.productData.price)
    ?? toPositiveNumber(context.importItemPrice);
  const priceArs = requireResolvedStringField(
    resolvedPrice !== null ? String(Math.round(resolvedPrice)) : null,
    "priceArs",
  );

  const type = context.productData.type === "stock" ? "stock" : "encargue";
  const comboGroup = asTrimmedString(context.productData.comboGroup);
  const comboEligible = context.productData.comboEligible === true && Boolean(comboGroup);
  const comboPriority = comboEligible
    ? (toIntegerOrNull(context.productData.comboPriority) ?? 0)
    : 0;
  const comboSourceKey = comboEligible ? asTrimmedString(context.productData.comboSourceKey) : null;
  const sourceUrl = typeof context.productData.sourceUrl === "string" && context.productData.sourceUrl.trim().length > 0
    ? context.productData.sourceUrl
    : undefined;
  const description = typeof context.productData.description === "string" ? context.productData.description : "";
  const sizeGuideCandidate = context.productData.sizeGuide;
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
    priceArs: Number(priceArs),
    description,
    comboEligible,
    comboGroup,
    comboPriority,
    comboSourceKey,
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
      ?? "";

    return {
      id: input.idFactory("product-image"),
      productId: input.productId,
      url: input.buildOwnedAssetUrl(preferredAssetKey),
      sourceUrl: image.sourceUrl,
      provider: "r2" as const,
      assetKey: preferredAssetKey,
      variantsManifest: image.variantsManifest ?? null,
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

export async function createProductVariants(
  foundation: PromotionFoundation,
  input: {
    productId: string;
    labels: readonly string[];
    now: Date;
  },
) {
  for (const [index, label] of input.labels.entries()) {
    await foundation.insertProductVariant({
      id: foundation.idFactory("variant"),
      productId: input.productId,
      label,
      position: index,
      createdAt: input.now,
    });
  }
}

export async function createProductSizes(
  foundation: PromotionFoundation,
  input: {
    productId: string;
    labels: readonly string[];
    now: Date;
  },
) {
  for (const [index, label] of input.labels.entries()) {
    await foundation.insertProductSize({
      id: foundation.idFactory("size"),
      productId: input.productId,
      label,
      position: index,
      createdAt: input.now,
    });
  }
}

function normalizeVariantManifestForStaging(manifest: ImageVariantsManifest | null, fallbackOriginal: string): ImageVariantsManifest {
  return {
    original: manifest?.original ?? fallbackOriginal,
    stage: manifest?.stage ?? "staged-preview",
    catalogStatus: manifest?.catalogStatus ?? "pending",
    missingCatalogVariants: manifest?.missingCatalogVariants ?? ["thumb", "cartThumb", "card", "detail", "lightbox"],
    lastCatalogError: manifest?.lastCatalogError,
    variants: {
      thumb: manifest?.variants?.thumb,
      cartThumb: manifest?.variants?.cartThumb,
      card: manifest?.variants?.card,
      detail: manifest?.variants?.detail,
      lightbox: manifest?.variants?.lightbox,
      adminPreview: manifest?.variants?.adminPreview,
    },
    width: manifest?.width ?? 0,
    height: manifest?.height ?? 0,
  };
}

function extractErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isStoragePermissionFailure(error: unknown, message: string) {
  const candidate = message.toLowerCase();
  if (/(access denied|accessdenied|forbidden|permission|403)/i.test(candidate)) {
    return true;
  }

  if (!error || typeof error !== "object") {
    return false;
  }

  const withCode = error as {
    code?: string;
    Code?: string;
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };

  const code = withCode.code ?? withCode.Code ?? withCode.name ?? "";
  if (/(access.?denied|forbidden)/i.test(code)) {
    return true;
  }

  return withCode.$metadata?.httpStatusCode === 403;
}

function formatDeferredMediaOperationError(input: {
  operation: "download-source" | "store-original" | "generate-variants" | "store-variant";
  sourceUrl: string;
  assetKey?: string;
  variantName?: CatalogImageVariantName;
  error: unknown;
}) {
  const message = extractErrorMessage(input.error);
  const operationLabel =
    input.operation === "download-source"
      ? "descargar imagen de origen"
      : input.operation === "store-original"
        ? "guardar original en R2"
        : input.operation === "generate-variants"
          ? "generar variantes de catálogo"
          : `guardar variante \"${input.variantName ?? "desconocida"}\" en R2`;
  const keyHint = input.assetKey ? ` (key: ${input.assetKey})` : "";

  if (isStoragePermissionFailure(input.error, message)) {
    return `Fallo de permisos en almacenamiento durante ${operationLabel}${keyHint}. Operación bloqueada por Access Denied/403. Verificá credenciales R2 (R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY), bucket configurado y permiso PutObject sobre el prefijo imports/promoted/. Detalle: ${message}`;
  }

  return `Falló ${operationLabel}${keyHint} para ${input.sourceUrl}: ${message}`;
}

async function ensureCatalogVariantsForImage(
  image: StagedImportImage,
  foundation: PromotionFoundation,
): Promise<ImageVariantsManifest> {
  let sourceObject: { body: Buffer; contentType?: string };
  try {
    sourceObject = await foundation.downloadSourceImage(image.sourceUrl);
  } catch (error) {
    throw new Error(formatDeferredMediaOperationError({
      operation: "download-source",
      sourceUrl: image.sourceUrl,
      error,
    }));
  }

  const originalKey = buildPromotionOriginalKey(image.importItemId, image.order, image.sourceUrl, sourceObject.contentType);

  try {
    await foundation.storeOriginalInR2({
      key: originalKey,
      body: sourceObject.body,
      contentType: sourceObject.contentType ?? "image/jpeg",
      sourceUrl: image.sourceUrl,
    });
  } catch (error) {
    throw new Error(formatDeferredMediaOperationError({
      operation: "store-original",
      sourceUrl: image.sourceUrl,
      assetKey: originalKey,
      error,
    }));
  }

  const current = normalizeVariantManifestForStaging(image.variantsManifest ?? null, originalKey);
  const missing = REQUIRED_CATALOG_VARIANTS.filter((variantName) => {
    const field = mapVariantNameToManifestField(variantName);
    return !current.variants[field];
  });

  let generated: GenerateCatalogVariantsResult;
  try {
    generated = await foundation.generateCatalogVariants({
      source: sourceObject.body,
      originalKey,
    });
  } catch (error) {
    throw new Error(formatDeferredMediaOperationError({
      operation: "generate-variants",
      sourceUrl: image.sourceUrl,
      assetKey: originalKey,
      error,
    }));
  }

  for (const variantName of missing) {
    const variant = generated.variants[variantName];
    try {
      await foundation.storeVariantInR2({
        key: variant.key,
        body: variant.buffer,
        contentType: variant.contentType,
        sourceUrl: image.sourceUrl,
      });
    } catch (error) {
      throw new Error(formatDeferredMediaOperationError({
        operation: "store-variant",
        sourceUrl: image.sourceUrl,
        assetKey: variant.key,
        variantName,
        error,
      }));
    }

    const field = mapVariantNameToManifestField(variantName);
    current.variants[field] = variant.key;
  }

  return {
    ...current,
    original: originalKey,
    width: generated.original.width,
    height: generated.original.height,
    stage: "catalog-ready",
    catalogStatus: "ready",
    missingCatalogVariants: [],
    lastCatalogError: undefined,
  };
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
      comboEligible: productInput.comboEligible,
      comboGroup: productInput.comboGroup,
      comboPriority: productInput.comboPriority,
      comboSourceKey: productInput.comboSourceKey,
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
    comboEligible: productInput.comboEligible,
    comboGroup: productInput.comboGroup,
    comboPriority: productInput.comboPriority,
    comboSourceKey: productInput.comboSourceKey,
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
    ?? input.approvedImages.find((image) => image.isSizeGuide)?.sourceUrl;

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

  if (importItem.status === "rejected") {
    throw new Error("Solo se pueden promover items en estado approved.");
  }

  if (importItem.status !== "approved") {
    throw new Error("Solo se pueden promover items en estado approved.");
  }

  if (isImportItemConsumed(importItem.productData)) {
    throw new Error("El item importado ya fue promovido y consumido.");
  }

  const productInput = await parsePromotionProductInput(importItem, foundation);

  const activeImages = (await foundation.loadImportImagesByItemId(importItem.id))
    .filter((image) => isImageActive(image.reviewState))
    .sort((left, right) => left.order - right.order);

  const galleryImages = activeImages.filter((image) => !image.isSizeGuide);

  if (galleryImages.length < 2) {
    throw new Error("insufficient useful images");
  }

  const now = foundation.now();
  const galleryImagesWithCatalogManifest: StagedImportImage[] = [];

  try {
    for (const image of galleryImages) {
      const variantsManifest = await ensureCatalogVariantsForImage(image, foundation);
      galleryImagesWithCatalogManifest.push({
        ...image,
        variantsManifest,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await foundation.markImportItemMediaFailed({
      importItemId: importItem.id,
      failedAt: now,
      reason: message,
    });
    throw new Error(`Falló la generación de variantes diferidas: ${message}`);
  }

  const { product, created } = await copyToProducts(foundation, productInput, now);
  const imageRows = updateProductImageUrls({
    productId: product.id,
    productName: productInput.name,
    approvedImages: galleryImagesWithCatalogManifest,
    idFactory: foundation.idFactory,
    now,
    buildOwnedAssetUrl: foundation.buildOwnedAssetUrl,
  });

  await createProductImages(foundation, imageRows);

  const sizeGuidePreserved = await preserveSizeGuides({
    foundation,
    productId: product.id,
    productSizeGuide: productInput.sizeGuide,
    approvedImages: activeImages,
    now,
  });

  const sizeLabels = extractProductSizeLabels(importItem.productData ?? {});
  await createProductSizes(foundation, {
    productId: product.id,
    labels: sizeLabels,
    now,
  });

  const variantLabels = extractProductVariantLabels(importItem.productData ?? {});
  await createProductVariants(foundation, {
    productId: product.id,
    labels: variantLabels,
    now,
  });

  await foundation.markImportItemPromoted({
    importItemId: input.importItemId,
    promotedAt: now,
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

export async function promoteEligibleImportItems(
  input: { itemIds?: string[] },
  foundation: PromotionFoundation,
): Promise<BulkPromotionResult> {
  if (!foundation.listEligibleImportItems) {
    throw new Error("listEligibleImportItems no configurado.");
  }

  const candidates = await foundation.listEligibleImportItems({ itemIds: input.itemIds });
  const candidateIds = new Set(candidates.map((item) => item.id));
  const result: BulkPromotionResult = {
    promotedCount: 0,
    promotedItemIds: [],
    blocked: [],
  };

  if (input.itemIds?.length) {
    for (const itemId of input.itemIds) {
      if (!candidateIds.has(itemId)) {
        result.blocked.push({
          itemId,
          reason: "El item no es elegible para promoción (estado inválido o ya consumido).",
        });
      }
    }
  }

  for (const item of candidates) {
    try {
      await promoteImportItem({ importItemId: item.id }, foundation);
      result.promotedCount += 1;
      result.promotedItemIds.push(item.id);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      result.blocked.push({
        itemId: item.id,
        reason,
        mediaStatus: /variantes diferidas/i.test(reason) ? "failed" : undefined,
      });
    }
  }

  return result;
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
    async listEligibleImportItems() {
      throw new Error("listEligibleImportItems no configurado.");
    },
    async findBrandIdByName() {
      return null;
    },
    async findCategoryIdByName() {
      return null;
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
    async insertProductSize() {
      throw new Error("insertProductSize no configurado.");
    },
    async insertProductVariant() {
      throw new Error("insertProductVariant no configurado.");
    },
    async upsertProductSizeGuide() {
      throw new Error("upsertProductSizeGuide no configurado.");
    },
    async markImportItemPromoted() {
      throw new Error("markImportItemPromoted no configurado.");
    },
    async markImportItemMediaFailed() {
      throw new Error("markImportItemMediaFailed no configurado.");
    },
    async downloadSourceImage() {
      throw new Error("downloadSourceImage no configurado.");
    },
    async storeOriginalInR2() {
      throw new Error("storeOriginalInR2 no configurado.");
    },
    async generateCatalogVariants() {
      throw new Error("generateCatalogVariants no configurado.");
    },
    async storeVariantInR2() {
      throw new Error("storeVariantInR2 no configurado.");
    },
    ...overrides,
  };
}

export function createPromotionFoundationFromDb(options: {
  db: {
    query: Record<string, unknown>;
    insert(table: unknown): { values(values: unknown): Promise<unknown> };
    update(table: unknown): { set(values: unknown): { where(predicate: unknown): Promise<unknown> } };
  };
  now?: () => Date;
  idFactory?: (prefix: string) => string;
  buildOwnedAssetUrl?: (assetKey: string) => string;
  createStorage?: () => Pick<ReturnType<typeof createR2StorageFromEnv>, "putObject">;
}): PromotionFoundation {
  const now = options.now ?? (() => new Date());
  const idFactory = options.idFactory ?? createId;
  const createStorage = options.createStorage ?? createR2StorageFromEnv;
  const query = options.db.query as {
    importItems: {
      findFirst: (config: { where: unknown }) => Promise<{ id: string; status: string; productData: Record<string, unknown> | null; price: number | null } | undefined>;
      findMany: (config: { orderBy: unknown[] }) => Promise<Array<{ id: string; status: string; productData: Record<string, unknown> | null; price: number | null }>>;
    };
    importImages: {
      findMany: (config: { where: unknown; orderBy: unknown[] }) => Promise<Array<{
        id: string;
        importItemId: string;
        sourceUrl: string;
        order: number;
        reviewState: ImportReviewState;
        isSizeGuide: boolean;
      }>>;
    };
    brands: {
      findFirst: (config: { where: unknown }) => Promise<{ id: string } | undefined>;
    };
    categories: {
      findFirst: (config: { where: unknown }) => Promise<{ id: string } | undefined>;
    };
    products: {
      findFirst: (config: { where: unknown }) => Promise<{ id: string; slug: string; state: ProductState } | undefined>;
    };
    productSizeGuides: {
      findFirst: (config: { where: unknown }) => Promise<{ productId: string } | undefined>;
    };
  };

  return createPromotionFoundation({
    now,
    idFactory,
    buildOwnedAssetUrl: options.buildOwnedAssetUrl ?? ((assetKey) => `r2://${assetKey}`),
    loadImportItemById: async (importItemId) => {
      const row = await query.importItems.findFirst({ where: eq(importItems.id, importItemId) });
      if (!row) return null;
      return {
        id: row.id,
        status: row.status,
        productData: row.productData,
        price: row.price,
      };
    },
    loadImportImagesByItemId: async (importItemId) => {
      const rows = await query.importImages.findMany({
        where: eq(importImages.importItemId, importItemId),
        orderBy: [asc(importImages.order)],
      });

      return rows.map((row) => ({
        id: row.id,
        importItemId: row.importItemId,
        sourceUrl: row.sourceUrl,
        variantsManifest: null,
        order: row.order,
        reviewState: row.reviewState,
        isSizeGuide: row.isSizeGuide,
      }));
    },
    listEligibleImportItems: async ({ itemIds } = {}) => {
      const rows = await query.importItems.findMany({
        orderBy: [asc(importItems.createdAt)],
      });

      const allowedIds = itemIds ? new Set(itemIds) : null;

      return rows
        .filter((row: { id: string; status: string; productData: Record<string, unknown> | null; price: number | null }) => row.status === "approved" || row.status === "media_failed")
        .filter((row: { id: string; status: string; productData: Record<string, unknown> | null; price: number | null }) => !isImportItemConsumed(row.productData))
        .filter((row: { id: string }) => (allowedIds ? allowedIds.has(row.id) : true))
        .map((row: { id: string; status: string; productData: Record<string, unknown> | null; price: number | null }) => ({
          id: row.id,
          status: row.status,
          productData: row.productData,
          price: row.price,
        }));
    },
    findBrandIdByName: async (name) => {
      const normalizedName = name.trim();
      if (!normalizedName) {
        return null;
      }

      const row = await query.brands.findFirst({
        where: sql`lower(${brands.name}) = lower(${normalizedName})`,
      });
      return row?.id ?? null;
    },
    findCategoryIdByName: async (name) => {
      const normalizedName = name.trim();
      if (!normalizedName) {
        return null;
      }

      const row = await query.categories.findFirst({
        where: sql`lower(${categories.name}) = lower(${normalizedName})`,
      });
      return row?.id ?? null;
    },
    findProductBySlug: async (slug) => {
      const row = await query.products.findFirst({ where: eq(products.slug, slug) });
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
    insertProductSize: async (values) => {
      await options.db.insert(productSizes).values(values);
    },
    insertProductVariant: async (values) => {
      await options.db.insert(productVariants).values(values);
    },
    upsertProductSizeGuide: async (values) => {
      const existing = await query.productSizeGuides.findFirst({
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
    markImportItemPromoted: async ({ importItemId, promotedAt }) => {
      const consumedAtIso = promotedAt.toISOString();
      await options.db.update(importItems).set({
        status: "promoted",
        productData: sql`jsonb_set(COALESCE(${importItems.productData}, '{}'::jsonb), '{_promotionConsumedAt}', to_jsonb(${consumedAtIso}::text), true)`,
        updatedAt: promotedAt,
      }).where(eq(importItems.id, importItemId));
    },
    markImportItemMediaFailed: async ({ importItemId, failedAt, reason }) => {
      await options.db.update(importItems).set({
        status: "media_failed",
        productData: sql`
          jsonb_set(
            jsonb_set(
              COALESCE(${importItems.productData}, '{}'::jsonb),
              '{_deferredMediaStatus}',
              to_jsonb('failed'::text),
              true
            ),
            '{_deferredMediaError}',
            to_jsonb(${reason}::text),
            true
          )
        `,
        updatedAt: failedAt,
      }).where(eq(importItems.id, importItemId));
    },
    downloadSourceImage: async (sourceUrl) => {
      const response = await fetch(sourceUrl, {
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; thewestrep-bot/1.0)",
          referer: "https://x.yupoo.com/",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`No se pudo descargar la imagen de origen (${response.status}) ${sourceUrl}`);
      }

      return {
        body: Buffer.from(await response.arrayBuffer()),
        contentType: response.headers.get("content-type") ?? undefined,
      };
    },
    storeOriginalInR2: async (write) => {
      const storage = createStorage();
      await storage.putObject({
        key: write.key,
        body: write.body,
        contentType: write.contentType,
        cacheControl: IMMUTABLE_CACHE_CONTROL,
        metadata: {
          source: "yupoo",
          sourceUrl: write.sourceUrl,
          role: "original",
        },
      });
    },
    generateCatalogVariants,
    storeVariantInR2: async (write) => {
      const storage = createStorage();
      await storage.putObject({
        key: write.key,
        body: write.body,
        contentType: write.contentType,
        cacheControl: IMMUTABLE_CACHE_CONTROL,
        metadata: {
          source: "yupoo",
          sourceUrl: write.sourceUrl,
          role: "variant",
        },
      });
    },
  });
}
