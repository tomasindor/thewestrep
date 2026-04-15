import { eq } from "drizzle-orm";

import { isLikelySizeGuideImageUrl, reorderLikelySizeGuideImageUrls } from "@/lib/catalog/size-guides";
import { importImages, importItems, importJobs } from "@/lib/db/schema";
import { classifyImportImageCandidate } from "@/lib/imports/heuristics";
import { validateImportPrice } from "@/lib/imports/price-validator";
import { createId } from "@/lib/utils";
import { canonicalizeYupooImageCandidates, extractYupooImages, getYupooCanonicalKey } from "@/lib/yupoo-core";

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
}

export interface YupooIngestionResult {
  importJobId: string | null;
  importItemId: string | null;
  importedImages: number;
  skippedDuplicateImages: number;
  skippedHeuristicImages?: number;
  plannedR2Writes: number;
  skipped: boolean;
  skipReason?: "missing-price" | "insufficient-useful-images";
}

export interface LegacyBulkAlbumPayload {
  albumUrl: string;
  albumHref: string;
  productData: Record<string, unknown>;
  imageUrls: string[];
}

const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

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
  const itemId = idFactory("import-item");

  const priceValidation = validateImportPrice(input.productData ?? null);
  if (!priceValidation.valid) {
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

  const productDataWithPrice = {
    ...(input.productData ?? {}),
    finalPrice: priceValidation.price,
    priceArs: priceValidation.price,
  };

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

    await dependencies.db.insert(importItems).values({
      id: itemId,
      importJobId: jobId,
      status: "approved",
      productData: productDataWithPrice,
      price: priceValidation.price,
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
        importItemId: itemId,
        sourceUrl: imageRow.sourceUrl,
        previewUrl: imageRow.previewUrl,
        order: imageRow.order,
        reviewState: "approved",
        isSizeGuide: imageRow.isSizeGuide,
        createdAt: now,
        updatedAt: now,
      });
    }

    await dependencies.db.update(importJobs).set({ status: "completed", updatedAt: now }).where(eq(importJobs.id, jobId));
  } catch (error) {
    await dependencies.db.update(importJobs).set({ status: "failed", updatedAt: now }).where(eq(importJobs.id, jobId));
    throw error;
  }

  return {
    importJobId: jobId,
    importItemId: itemId,
    importedImages: stagedImageRows.length,
    skippedDuplicateImages: Math.max(0, candidates.map((candidate) => candidate.url).length - ordered.length),
    skippedHeuristicImages: Math.max(0, ordered.length - filtered.length),
    plannedR2Writes: 0,
    skipped: false,
  };
}
