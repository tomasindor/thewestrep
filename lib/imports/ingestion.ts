import { eq } from "drizzle-orm";

import { isLikelySizeGuideImageUrl, reorderLikelySizeGuideImageUrls } from "@/lib/catalog/size-guides";
import { importImages, importItems, importJobs } from "@/lib/db/schema";
import { classifyImportImageCandidate, inferComboMetadata } from "@/lib/imports/heuristics";
import { resolveImportPrices } from "@/lib/imports/price-validator";
import { createId } from "@/lib/utils";
import {
  canonicalizeYupooImageCandidates,
  canonicalizeYupooSourceUrl,
  extractYupooImages,
  getYupooAlbumIdentity,
  getYupooCanonicalKey,
} from "@/lib/yupoo-core";

export type YupooImportSource = "bulk" | "admin";

export interface YupooIngestionInput {
  source: YupooImportSource;
  sourceUrl: string;
  sourceReference?: string;
  productData?: Record<string, unknown>;
  imageUrls?: string[];
  maxImages?: number;
}

export interface DownloadedImage {
  body: Buffer;
  contentType?: string;
}

export interface IngestionImageCandidate {
  url: string;
  previewUrl: string;
}

export interface PreparedR2Write {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl: string;
  metadata?: Record<string, string>;
}

export interface IngestionDependencies {
  db: {
    query?: Record<string, any>;
    insert(table: unknown): { values(values: unknown): Promise<unknown> };
    update(table: unknown): { set(values: unknown): { where(predicate: unknown): Promise<unknown> } };
  };
  now?: () => Date;
  idFactory?: (prefix: string) => string;
  scrapeYupooImages?: (
    sourceUrl: string,
    options?: { maxImages?: number },
  ) => Promise<Array<string | { url: string; previewUrl?: string | null }>>;
  downloadImage?: (url: string) => Promise<DownloadedImage>;
  generateVariants?: (input: { source: Buffer; originalKey: string }) => Promise<unknown>;
  storeInR2?: (write: PreparedR2Write) => Promise<void>;
  findYupooDuplicate?: (identity: YupooSourceIdentity) => Promise<YupooDuplicateLocation | null>;
}

export interface YupooIngestionResult {
  importJobId: string | null;
  importItemId: string | null;
  importItemIds?: string[];
  importedImages: number;
  skippedDuplicateImages: number;
  skippedHeuristicImages?: number;
  plannedR2Writes: number;
  skipped: boolean;
  skipReason?: "missing-price" | "insufficient-useful-images" | "already-exists";
}

export type YupooDuplicateLocation = "catalog" | "staging";

export interface YupooSourceIdentity {
  canonicalSourceUrl: string;
  albumIdentity: string;
  matchCandidates: string[];
}

export interface LegacyBulkAlbumPayload {
  albumUrl: string;
  albumHref: string;
  productData: Record<string, unknown>;
  imageUrls: string[];
}

const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

function normalizeIdentityCandidate(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizePathIdentity(value: string) {
  const withoutHash = value.split("#", 1)[0] ?? value;
  const withoutQuery = withoutHash.split("?", 1)[0] ?? withoutHash;
  const normalized = withoutQuery.trim().replace(/\/+$/g, "");

  if (!normalized) {
    return "/";
  }

  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function buildYupooSourceIdentity(input: { sourceUrl: string; sourceReference?: string }) {
  const canonicalSourceUrl = canonicalizeYupooSourceUrl(input.sourceUrl);
  const albumIdentity = getYupooAlbumIdentity(canonicalSourceUrl);
  const parsedCanonicalSource = new URL(canonicalSourceUrl);
  const sourcePathIdentity = normalizePathIdentity(parsedCanonicalSource.pathname);

  const rawCandidates = new Set<string>([
    input.sourceUrl,
    canonicalSourceUrl,
    albumIdentity,
    sourcePathIdentity,
  ]);

  const normalizedSourceReference = normalizeIdentityCandidate(input.sourceReference);

  if (normalizedSourceReference) {
    rawCandidates.add(normalizedSourceReference);

    if (/^https?:\/\//i.test(normalizedSourceReference)) {
      try {
        const canonicalReference = canonicalizeYupooSourceUrl(normalizedSourceReference);
        rawCandidates.add(canonicalReference);
        rawCandidates.add(getYupooAlbumIdentity(canonicalReference));
        rawCandidates.add(normalizePathIdentity(new URL(canonicalReference).pathname));
      } catch {
        // Keep raw sourceReference fallback.
      }
    } else {
      rawCandidates.add(normalizePathIdentity(normalizedSourceReference));
    }
  }

  const matchCandidates = Array.from(rawCandidates)
    .map((candidate) => normalizeIdentityCandidate(candidate))
    .filter((candidate): candidate is string => Boolean(candidate));

  return {
    canonicalSourceUrl,
    albumIdentity,
    matchCandidates,
  } satisfies YupooSourceIdentity;
}

async function findYupooDuplicateFromDb(
  db: IngestionDependencies["db"],
  identity: YupooSourceIdentity,
): Promise<YupooDuplicateLocation | null> {
  const query = db.query;

  if (!query) {
    return null;
  }

  for (const candidate of identity.matchCandidates) {
    const catalogMatch = await query.products?.findFirst?.({
      where: (productsTable: typeof import("@/lib/db/schema").products, { sql }: { sql: any }) =>
        sql`lower(${productsTable.sourceUrl}) = lower(${candidate})`,
    });

    if (catalogMatch) {
      return "catalog";
    }

    const stagingMatch = await query.importJobs?.findFirst?.({
      where: (importJobsTable: typeof import("@/lib/db/schema").importJobs, { sql }: { sql: any }) =>
        sql`lower(${importJobsTable.sourceReference}) = lower(${candidate})`,
    });

    if (stagingMatch) {
      return "staging";
    }
  }

  return null;
}

export function parseYupooUrl(value: string) {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error("La URL fuente de importación no es válida.");
  }

  if (!/yupoo\.com$/i.test(parsed.hostname)) {
    throw new Error("La URL fuente debe pertenecer a Yupoo.");
  }

  if (parsed.protocol !== "https:") {
    parsed.protocol = "https:";
  }

  return parsed;
}

export function buildBulkIngestionInput(payload: LegacyBulkAlbumPayload): YupooIngestionInput {
  return {
    source: "bulk",
    sourceUrl: payload.albumUrl,
    sourceReference: payload.albumHref,
    productData: payload.productData,
    imageUrls: payload.imageUrls,
  };
}

export async function downloadImage(url: string): Promise<DownloadedImage> {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; thewestrep-bot/1.0)",
      referer: "https://x.yupoo.com/",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`No se pudo descargar la imagen (${response.status}) ${url}`);
  }

  return {
    body: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") ?? undefined,
  };
}

export function prepareR2Writes(
  original: { key: string; body: Buffer; contentType: string; sourceUrl: string },
  generated: { variants: Record<string, { key: string; buffer: Buffer; contentType: string }> },
) {
  const writes: PreparedR2Write[] = [
    {
      key: original.key,
      body: original.body,
      contentType: original.contentType,
      cacheControl: IMMUTABLE_CACHE_CONTROL,
      metadata: {
        source: "yupoo",
        sourceUrl: original.sourceUrl,
        role: "original",
      },
    },
  ];

  for (const variant of Object.values(generated.variants)) {
    writes.push({
      key: variant.key,
      body: variant.buffer,
      contentType: variant.contentType,
      cacheControl: IMMUTABLE_CACHE_CONTROL,
      metadata: {
        source: "yupoo",
        sourceUrl: original.sourceUrl,
        role: "variant",
      },
    });
  }

  return writes;
}

export async function storeInR2(writes: PreparedR2Write[], persistWrite?: (write: PreparedR2Write) => Promise<void>) {
  if (!persistWrite) {
    return;
  }

  for (const write of writes) {
    await persistWrite(write);
  }
}

export async function createStagingRecords(
  dependencies: IngestionDependencies,
  input: YupooIngestionInput,
  itemId: string,
  jobId: string,
  imageRows: Array<{
    sourceUrl: string;
    previewUrl: string;
    order: number;
    reviewState: "approved";
    isSizeGuide: boolean;
  }>,
) {
  const now = dependencies.now?.() ?? new Date();

  await dependencies.db.insert(importJobs).values({
    id: jobId,
    status: "running",
    source: input.source,
    sourceReference: input.sourceReference ?? input.sourceUrl,
    createdAt: now,
    updatedAt: now,
  });

  await dependencies.db.insert(importItems).values({
    id: itemId,
    importJobId: jobId,
    status: "approved",
    productData: input.productData ?? null,
    price: typeof input.productData?.priceArs === "number" ? input.productData.priceArs : null,
    createdAt: now,
    updatedAt: now,
  });

  for (const row of imageRows) {
    await dependencies.db.insert(importImages).values({
      id: (dependencies.idFactory ?? createId)("import-image"),
        importItemId: itemId,
        sourceUrl: row.sourceUrl,
        previewUrl: row.previewUrl,
        order: row.order,
        reviewState: row.reviewState,
        isSizeGuide: row.isSizeGuide,
      createdAt: now,
      updatedAt: now,
    });
  }
}

function normalizeCandidateImage(input: string | { url: string; previewUrl?: string | null }): IngestionImageCandidate | null {
  if (typeof input === "string") {
    const trimmed = input.trim();

    if (!trimmed) {
      return null;
    }

    return {
      url: trimmed,
      previewUrl: trimmed,
    };
  }

  const url = typeof input.url === "string" ? input.url.trim() : "";

  if (!url) {
    return null;
  }

  const previewUrl = typeof input.previewUrl === "string" && input.previewUrl.trim().length > 0
    ? input.previewUrl.trim()
    : url;

  return {
    url,
    previewUrl,
  };
}

function readImportDisplayName(productData: Record<string, unknown> | null | undefined) {
  const candidates = [productData?.finalName, productData?.productName, productData?.name, productData?.rawName];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return "";
}

function readImportAlbumTitle(input: YupooIngestionInput) {
  const sourceReference = typeof input.sourceReference === "string" ? input.sourceReference.trim() : "";

  if (sourceReference) {
    return sourceReference;
  }

  return readImportDisplayName(input.productData ?? null);
}

function inferTopGarmentKind(value: string) {
  const normalized = value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

  if (/(campera|camperas|jacket|jackets|coat|coats|parka|parkas|windbreaker|anorak|chaqueta|chaquetas)/.test(normalized)) {
    return { label: "Campera", categoryName: "Camperas" };
  }

  return { label: "Buzo", categoryName: "Buzos" };
}

function buildSplitProductName(label: string, fallbackName: string, brandName: string | null) {
  const cleaned = fallbackName
    .replace(/[¥￥]\s*\d+(?:[.,]\d+)?/g, " ")
    .replace(/\b(?:set|combo|conjunto|tracksuit|track suit)\b/gi, " ")
    .replace(/\b(?:campera|camperas|jacket|jackets|coat|coats|parka|parkas|buzo|buzos|hoodie|hoodies|sweatshirt|sweatshirts|pantalon|pantalones|pants|trouser|trousers|jogger|joggers)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const descriptor = cleaned || brandName || "Importado";
  return `${label} ${descriptor}`.replace(/\s+/g, " ").trim();
}

function shouldSplitBulkSet(input: YupooIngestionInput, resolvedPrices: { prices: number[] }) {
  if (input.source !== "bulk") {
    return false;
  }

  if (resolvedPrices.prices.length !== 2) {
    return false;
  }

  return input.productData?.importerDetectedTwoTitlePrices === true
    && input.productData?.detectedPricesSource === "title";
}

function buildImportItemSpecs(input: YupooIngestionInput, resolvedPrices: { prices: number[]; primaryPrice: number }) {
  const baseProductData = { ...(input.productData ?? {}) };
  const albumTitle = readImportAlbumTitle(input);
  const displayName = readImportDisplayName(baseProductData);
  const brandName = typeof baseProductData.brandName === "string" && baseProductData.brandName.trim().length > 0
    ? baseProductData.brandName.trim()
    : typeof baseProductData.brand === "string" && baseProductData.brand.trim().length > 0
      ? baseProductData.brand.trim()
      : null;
  const comboMetadata = inferComboMetadata({
    albumTitle,
    sourceUrl: input.sourceUrl,
    productData: {
      ...baseProductData,
      priceArs: resolvedPrices.primaryPrice,
    },
    productCount: resolvedPrices.prices.length,
    detectedPrices: resolvedPrices.prices,
  });

  if (shouldSplitBulkSet(input, resolvedPrices)) {
    const topGarment = inferTopGarmentKind(`${albumTitle} ${displayName}`);
    const bottomGarment = { label: "Pantalón", categoryName: "Pantalones" };
    const comboGroup = comboMetadata.comboGroup ?? `importer-two-prices-${Date.now()}`;

    return [topGarment, bottomGarment].map((garment, index) => {
      const price = resolvedPrices.prices[index] ?? resolvedPrices.primaryPrice;
      const productName = buildSplitProductName(garment.label, displayName || albumTitle, brandName);

      return {
        price,
        productData: {
          ...baseProductData,
          productName,
          finalName: productName,
          categoryName: garment.categoryName,
          finalPrice: price,
          priceArs: price,
          detectedPrices: resolvedPrices.prices,
          importerSplitByTwoPrices: true,
          importerSplitRole: index === 0 ? "top" : "bottom",
          comboEligible: true,
          comboGroup,
          comboPriority: 0,
          comboSourceKey: comboMetadata.comboSourceKey ?? "importer-two-prices",
          comboScore: comboMetadata.comboScore,
        },
      };
    });
  }

  return [{
    price: resolvedPrices.primaryPrice,
    productData: {
      ...baseProductData,
      finalPrice: resolvedPrices.primaryPrice,
      priceArs: resolvedPrices.primaryPrice,
      ...(comboMetadata.comboEligible
        ? {
          comboEligible: comboMetadata.comboEligible,
          comboGroup: comboMetadata.comboGroup,
          comboPriority: comboMetadata.comboPriority,
          comboSourceKey: comboMetadata.comboSourceKey,
        }
        : {}),
      comboScore: comboMetadata.comboScore,
    },
  }];
}

async function resolveCandidateImageUrls(input: YupooIngestionInput, dependencies: IngestionDependencies) {
  if (input.imageUrls?.length) {
    return input.imageUrls
      .map((url) => normalizeCandidateImage(url))
      .filter((candidate): candidate is IngestionImageCandidate => Boolean(candidate));
  }

  const scraper = dependencies.scrapeYupooImages
    ?? (async (sourceUrl: string, options?: { maxImages?: number }) => {
      const extracted = await extractYupooImages(sourceUrl, options);
      return extracted.imageCandidates.length > 0 ? extracted.imageCandidates : extracted.images;
    });

  const scraped = await scraper(input.sourceUrl, { maxImages: input.maxImages });

  return scraped
    .map((candidate) => normalizeCandidateImage(candidate))
    .filter((candidate): candidate is IngestionImageCandidate => Boolean(candidate));
}

export async function ingestYupooSource(input: YupooIngestionInput, dependencies: IngestionDependencies): Promise<YupooIngestionResult> {
  const sourceUrl = parseYupooUrl(input.sourceUrl);
  const now = dependencies.now?.() ?? new Date();
  const idFactory = dependencies.idFactory ?? createId;
  const jobId = idFactory("import-job");

  const resolvedPrices = resolveImportPrices(input.productData ?? null);
  if (!resolvedPrices.valid) {
    return {
      importJobId: null,
      importItemId: null,
      importedImages: 0,
      skippedDuplicateImages: 0,
      skippedHeuristicImages: 0,
      plannedR2Writes: 0,
      skipped: true,
      skipReason: "missing-price",
    };
  }

  const itemSpecs = buildImportItemSpecs({ ...input, sourceUrl: sourceUrl.href }, resolvedPrices)
    .map((spec) => ({
      itemId: idFactory("import-item"),
      price: spec.price,
      productData: spec.productData,
    }));

  const identity = buildYupooSourceIdentity({
    sourceUrl: sourceUrl.href,
    sourceReference: input.sourceReference,
  });

  const duplicateLocation = dependencies.findYupooDuplicate
    ? await dependencies.findYupooDuplicate(identity)
    : await findYupooDuplicateFromDb(dependencies.db, identity);

  if (duplicateLocation) {
    return {
      importJobId: null,
      importItemId: null,
      importedImages: 0,
      skippedDuplicateImages: 0,
      skippedHeuristicImages: 0,
      plannedR2Writes: 0,
      skipped: true,
      skipReason: "already-exists",
    };
  }

  const candidates = await resolveCandidateImageUrls({ ...input, sourceUrl: sourceUrl.href }, dependencies);
  const deduplicated = canonicalizeYupooImageCandidates(candidates.map((candidate) => candidate.url));
  const ordered = reorderLikelySizeGuideImageUrls(deduplicated, { sourcePageUrl: sourceUrl.href });
  const filtered = ordered.filter((imageUrl) => classifyImportImageCandidate(imageUrl).decision !== "auto-reject");

  const previewBySourceUrl = new Map<string, string>();
  const previewByCanonicalKey = new Map<string, string>();

  for (const candidate of candidates) {
    if (!previewBySourceUrl.has(candidate.url)) {
      previewBySourceUrl.set(candidate.url, candidate.previewUrl);
    }

    try {
      const key = getYupooCanonicalKey(candidate.url);

      if (!previewByCanonicalKey.has(key)) {
        previewByCanonicalKey.set(key, candidate.previewUrl);
      }
    } catch {
      // Keep source fallback only.
    }
  }

  const usefulImagesCount = filtered.reduce((count, imageUrl, index) => {
    const isSizeGuide = isLikelySizeGuideImageUrl(imageUrl, { index, sourcePageUrl: sourceUrl.href });
    return isSizeGuide ? count : count + 1;
  }, 0);

  if (usefulImagesCount < 2) {
    return {
      importJobId: null,
      importItemId: null,
      importedImages: 0,
      skippedDuplicateImages: Math.max(0, candidates.map((candidate) => candidate.url).length - ordered.length),
      skippedHeuristicImages: Math.max(0, ordered.length - filtered.length),
      plannedR2Writes: 0,
      skipped: true,
      skipReason: "insufficient-useful-images",
    };
  }

  if (filtered.length === 0) {
    throw new Error("No se encontraron imágenes válidas para ingestión.");
  }

  const stagedImageRows: Array<{
    sourceUrl: string;
    previewUrl: string;
    order: number;
    reviewState: "approved";
    isSizeGuide: boolean;
  }> = [];

  try {
    await dependencies.db.insert(importJobs).values({
      id: jobId,
      status: "running",
      source: input.source,
      sourceReference: input.sourceReference ?? sourceUrl.href,
      createdAt: now,
      updatedAt: now,
    });

    for (const itemSpec of itemSpecs) {
      await dependencies.db.insert(importItems).values({
        id: itemSpec.itemId,
        importJobId: jobId,
        status: "approved",
        productData: itemSpec.productData,
        price: itemSpec.price,
        createdAt: now,
        updatedAt: now,
      });

      for (const [order, imageUrl] of filtered.entries()) {
        const imageRow = {
          sourceUrl: imageUrl,
          previewUrl: (() => {
            const directPreview = previewBySourceUrl.get(imageUrl);

            if (directPreview) {
              return directPreview;
            }

            try {
              const key = getYupooCanonicalKey(imageUrl);
              return previewByCanonicalKey.get(key) ?? imageUrl;
            } catch {
              return imageUrl;
            }
          })(),
          order,
          reviewState: "approved" as const,
          isSizeGuide: isLikelySizeGuideImageUrl(imageUrl, { index: order, sourcePageUrl: sourceUrl.href }),
        };

        stagedImageRows.push(imageRow);

        await dependencies.db.insert(importImages).values({
          id: idFactory("import-image"),
          importItemId: itemSpec.itemId,
          sourceUrl: imageRow.sourceUrl,
          previewUrl: imageRow.previewUrl,
          order: imageRow.order,
          reviewState: "approved",
          isSizeGuide: imageRow.isSizeGuide,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    await dependencies.db.update(importJobs).set({ status: "completed", updatedAt: now }).where(eq(importJobs.id, jobId));
  } catch (error) {
    await dependencies.db.update(importJobs).set({ status: "failed", updatedAt: now }).where(eq(importJobs.id, jobId));
    throw error;
  }

  return {
    importJobId: jobId,
    importItemId: itemSpecs[0]?.itemId ?? null,
    importItemIds: itemSpecs.map((itemSpec) => itemSpec.itemId),
    importedImages: stagedImageRows.length,
    skippedDuplicateImages: Math.max(0, candidates.map((candidate) => candidate.url).length - ordered.length),
    skippedHeuristicImages: Math.max(0, ordered.length - filtered.length),
    plannedR2Writes: 0,
    skipped: false,
  };
}
