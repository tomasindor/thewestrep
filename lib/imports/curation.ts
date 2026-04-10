import "server-only";

import { asc, desc, eq } from "drizzle-orm";

import { importImages, importItems, importJobs } from "@/lib/db/schema";
import { getDb } from "@/lib/db/core";
import {
  applyReviewAction,
  deriveAutomaticCoverImageId,
  deriveImportItemStatus,
  type ImportReviewAction,
  type ImportReviewState,
} from "@/lib/imports/curation-state";
import type { ImageVariantsManifest } from "@/lib/types/media";

export interface CurationQueueImage {
  id: string;
  importItemId: string;
  originalUrl: string;
  previewUrl: string;
  reviewState: ImportReviewState;
  isSizeGuide: boolean;
  order: number;
}

export interface CurationQueueItem {
  id: string;
  status: "pending" | "approved" | "rejected";
  sourceReference: string | null;
  productName: string | null;
  coverImageId: string | null;
  images: CurationQueueImage[];
}

export interface CurationQueuePayload {
  items: CurationQueueItem[];
}

export interface ApplyImportReviewActionInput {
  imageId: string;
  action: ImportReviewAction;
  previousState?: ImportReviewState;
}

export interface ApplyImportReviewActionResult {
  importItemId: string;
  imageId: string;
  previousState: ImportReviewState;
  nextState: ImportReviewState;
  importItemStatus: "pending" | "approved" | "rejected";
  coverImageId: string | null;
}

interface DbImportImage {
  id: string;
  importItemId: string;
  originalUrl: string;
  variantsManifest: ImageVariantsManifest | null;
  reviewState: ImportReviewState;
  isSizeGuide: boolean;
  order: number;
}

function resolvePreviewUrl(image: { originalUrl: string; variantsManifest: ImageVariantsManifest | null }) {
  const adminPreview = image.variantsManifest?.variants?.adminPreview;

  if (typeof adminPreview === "string" && /^https?:\/\//i.test(adminPreview)) {
    return adminPreview;
  }

  return image.originalUrl;
}

function resolveProductName(productData: Record<string, unknown> | null) {
  if (!productData) return null;

  const value = productData.name;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function createImportsCurationServiceFromDb(options: {
  db: Pick<NonNullable<ReturnType<typeof getDb>>, "query" | "update">;
  now?: () => Date;
}) {
  const now = options.now ?? (() => new Date());

  return {
    async listQueue(input: { limit?: number } = {}): Promise<CurationQueuePayload> {
      const items = await options.db.query.importItems.findMany({
        orderBy: [desc(importItems.updatedAt)],
        limit: input.limit ?? 20,
      });

      const normalizedItems: CurationQueueItem[] = [];

      for (const item of items) {
        const images = await options.db.query.importImages.findMany({
          where: eq(importImages.importItemId, item.id),
          orderBy: [asc(importImages.order)],
        });

        const job = await options.db.query.importJobs.findFirst({ where: eq(importJobs.id, item.importJobId) });

        const queueImages: CurationQueueImage[] = images.map((image) => ({
          id: image.id,
          importItemId: image.importItemId,
          originalUrl: image.originalUrl,
          previewUrl: resolvePreviewUrl(image),
          reviewState: image.reviewState,
          isSizeGuide: image.isSizeGuide,
          order: image.order,
        }));

        normalizedItems.push({
          id: item.id,
          status: item.status,
          sourceReference: job?.sourceReference ?? null,
          productName: resolveProductName(item.productData),
          coverImageId: deriveAutomaticCoverImageId(queueImages),
          images: queueImages,
        });
      }

      return {
        items: normalizedItems,
      };
    },

    async applyReviewAction(input: ApplyImportReviewActionInput): Promise<ApplyImportReviewActionResult> {
      const row = await options.db.query.importImages.findFirst({ where: eq(importImages.id, input.imageId) });

      if (!row) {
        throw new Error("No se encontró la imagen importada para revisión.");
      }

      const previousState = row.reviewState;
      const nextState = applyReviewAction(input.action, input.previousState);
      const at = now();

      await options.db.update(importImages).set({
        reviewState: nextState,
        updatedAt: at,
      }).where(eq(importImages.id, row.id));

      const allRows = await options.db.query.importImages.findMany({
        where: eq(importImages.importItemId, row.importItemId),
        orderBy: [asc(importImages.order)],
      });

      const updatedRows: DbImportImage[] = allRows.map((image) => {
        if (image.id !== row.id) {
          return {
            id: image.id,
            importItemId: image.importItemId,
            originalUrl: image.originalUrl,
            variantsManifest: image.variantsManifest,
            reviewState: image.reviewState,
            isSizeGuide: image.isSizeGuide,
            order: image.order,
          };
        }

        return {
          id: image.id,
          importItemId: image.importItemId,
          originalUrl: image.originalUrl,
          variantsManifest: image.variantsManifest,
          reviewState: nextState,
          isSizeGuide: image.isSizeGuide,
          order: image.order,
        };
      });

      const importItemStatus = deriveImportItemStatus(updatedRows);
      const coverImageId = deriveAutomaticCoverImageId(updatedRows);

      await options.db.update(importItems).set({
        status: importItemStatus,
        updatedAt: at,
      }).where(eq(importItems.id, row.importItemId));

      return {
        importItemId: row.importItemId,
        imageId: row.id,
        previousState,
        nextState,
        importItemStatus,
        coverImageId,
      };
    },
  };
}
