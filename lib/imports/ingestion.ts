import "server-only";

import { eq } from "drizzle-orm";

import { isLikelySizeGuideImageUrl, reorderLikelySizeGuideImageUrls } from "@/lib/catalog/size-guides";
import { importImages, importItems, importJobs } from "@/lib/db/schema";
import { generateImageVariants, mapVariantNameToManifestField, type GenerateImageVariantsResult } from "@/lib/media/variants";
import type { ImageVariantsManifest } from "@/lib/types/media";
import { createId } from "@/lib/utils";
import { canonicalizeYupooImageCandidates, extractYupooImages } from "@/lib/yupoo-core";

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
  scrapeYupooImages?: (sourceUrl: string, options?: { maxImages?: number }) => Promise<string[]>;
  downloadImage?: (url: string) => Promise<DownloadedImage>;
  generateVariants?: (input: { source: Buffer; originalKey: string }) => Promise<GenerateImageVariantsResult>;
  storeInR2?: (write: PreparedR2Write) => Promise<void>;
}

export interface YupooIngestionResult {
  importJobId: string;
  importItemId: string;
  importedImages: number;
  skippedDuplicateImages: number;
  plannedR2Writes: number;
}

export interface LegacyBulkAlbumPayload {
  albumUrl: string;
  albumHref: string;
  productData: Record<string, unknown>;
  imageUrls: string[];
}

const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

function resolveImageExtension(originalUrl: string, contentType?: string) {
  if (contentType?.includes("png")) return ".png";
  if (contentType?.includes("webp")) return ".webp";
  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) return ".jpg";

  const pathname = new URL(originalUrl).pathname;
  const extension = pathname.match(/\.(jpe?g|png|webp)(?:$|[?#])/i)?.[1]?.toLowerCase();
  if (extension === "jpeg") return ".jpg";
  if (extension === "jpg" || extension === "png" || extension === "webp") return `.${extension}`;

  return ".jpg";
}

function buildOriginalR2Key(jobId: string, itemId: string, order: number, originalUrl: string, contentType?: string) {
  const extension = resolveImageExtension(originalUrl, contentType);
  return `imports/${jobId}/${itemId}/${String(order).padStart(3, "0")}/original${extension}`;
}

function buildVariantsManifest(generated: GenerateImageVariantsResult): ImageVariantsManifest {
  const manifestVariants: ImageVariantsManifest["variants"] = {};

  for (const [variantName, variant] of Object.entries(generated.variants)) {
    manifestVariants[mapVariantNameToManifestField(variantName as keyof typeof generated.variants)] = variant.key;
  }

  return {
    original: generated.original.key,
    variants: manifestVariants,
    width: generated.original.width,
    height: generated.original.height,
  };
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
  generated: GenerateImageVariantsResult,
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
    originalUrl: string;
    sourceYupooUrl: string;
    r2Key: string;
    variantsManifest: ImageVariantsManifest;
    order: number;
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
    status: "pending",
    productData: input.productData ?? null,
    createdAt: now,
    updatedAt: now,
  });

  for (const row of imageRows) {
    await dependencies.db.insert(importImages).values({
      id: (dependencies.idFactory ?? createId)("import-image"),
      importItemId: itemId,
      originalUrl: row.originalUrl,
      sourceYupooUrl: row.sourceYupooUrl,
      r2Key: row.r2Key,
      variantsManifest: row.variantsManifest,
      order: row.order,
      reviewState: "pending",
      isSizeGuide: row.isSizeGuide,
      similarityMetadata: null,
      createdAt: now,
      updatedAt: now,
    });
  }
}

async function resolveCandidateImageUrls(input: YupooIngestionInput, dependencies: IngestionDependencies) {
  if (input.imageUrls?.length) {
    return input.imageUrls;
  }

  const scraper = dependencies.scrapeYupooImages
    ?? (async (sourceUrl: string, options?: { maxImages?: number }) => {
      const extracted = await extractYupooImages(sourceUrl, options);
      return extracted.images;
    });

  return scraper(input.sourceUrl, { maxImages: input.maxImages });
}

export async function ingestYupooSource(input: YupooIngestionInput, dependencies: IngestionDependencies): Promise<YupooIngestionResult> {
  const sourceUrl = parseYupooUrl(input.sourceUrl);
  const now = dependencies.now?.() ?? new Date();
  const idFactory = dependencies.idFactory ?? createId;
  const runGenerateVariants = dependencies.generateVariants ?? generateImageVariants;
  const runDownloadImage = dependencies.downloadImage ?? downloadImage;
  const jobId = idFactory("import-job");
  const itemId = idFactory("import-item");

  const candidates = await resolveCandidateImageUrls({ ...input, sourceUrl: sourceUrl.href }, dependencies);
  const deduplicated = canonicalizeYupooImageCandidates(candidates);
  const ordered = reorderLikelySizeGuideImageUrls(deduplicated, { sourcePageUrl: sourceUrl.href });

  if (ordered.length === 0) {
    throw new Error("No se encontraron imágenes válidas para ingestión.");
  }

  const stagedImageRows: Array<{
    originalUrl: string;
    sourceYupooUrl: string;
    r2Key: string;
    variantsManifest: ImageVariantsManifest;
    order: number;
    isSizeGuide: boolean;
  }> = [];

  const allWrites: PreparedR2Write[] = [];

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
      status: "pending",
      productData: input.productData ?? null,
      createdAt: now,
      updatedAt: now,
    });

    for (const [order, imageUrl] of ordered.entries()) {
      const downloaded = await runDownloadImage(imageUrl);
      const originalKey = buildOriginalR2Key(jobId, itemId, order, imageUrl, downloaded.contentType);
      const generated = await runGenerateVariants({
        source: downloaded.body,
        originalKey,
      });
      const writes = prepareR2Writes(
        {
          key: originalKey,
          body: downloaded.body,
          contentType: downloaded.contentType ?? "image/jpeg",
          sourceUrl: imageUrl,
        },
        generated,
      );

      await storeInR2(writes, dependencies.storeInR2);
      allWrites.push(...writes);

      const variantsManifest = buildVariantsManifest(generated);

      const imageRow = {
        originalUrl: imageUrl,
        sourceYupooUrl: sourceUrl.href,
        r2Key: originalKey,
        variantsManifest,
        order,
        isSizeGuide: isLikelySizeGuideImageUrl(imageUrl, { index: order, sourcePageUrl: sourceUrl.href }),
      };

      stagedImageRows.push(imageRow);

      await dependencies.db.insert(importImages).values({
        id: idFactory("import-image"),
        importItemId: itemId,
        originalUrl: imageRow.originalUrl,
        sourceYupooUrl: imageRow.sourceYupooUrl,
        r2Key: imageRow.r2Key,
        variantsManifest: imageRow.variantsManifest,
        order: imageRow.order,
        reviewState: "pending",
        isSizeGuide: imageRow.isSizeGuide,
        similarityMetadata: null,
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
    skippedDuplicateImages: Math.max(0, candidates.length - ordered.length),
    plannedR2Writes: allWrites.length,
  };
}
