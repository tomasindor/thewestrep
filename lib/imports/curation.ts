import "server-only";

import { asc, desc, eq } from "drizzle-orm";

import { importImages, importItems, importJobs } from "@/lib/db/schema";
import { getDb } from "@/lib/db/core";
import {
  applyReviewAction,
  countActiveImages,
  deriveAutomaticCoverImageId,
  deriveImportItemStatus,
  resolvePromotionEligibility,
  toggleSizeGuide,
  type ImportReviewAction,
  type ImportReviewState,
} from "@/lib/imports/curation-state";

export interface CurationQueueImage {
  id: string;
  importItemId: string;
  sourceUrl: string;
  previewUrl: string | null;
  reviewState: ImportReviewState;
  isSizeGuide: boolean;
  order: number;
}

export interface CurationQueueItem {
  id: string;
  status: "pending" | "approved" | "rejected" | "promoted" | "media_failed";
  mediaStatus: "pending" | "ready" | "failed";
  sourceReference: string | null;
  finalName: string | null;
  finalPrice: number | null;
  brand: string | null;
  activeImageCount: number;
  productName: string | null;
  coverImageId: string | null;
  promotionEligible: boolean;
  promotionBlockedReason: string | null;
  images: CurationQueueImage[];
}

export interface CurationQueuePayload {
  items: CurationQueueItem[];
}

export async function clearImportsQueueFromDb(db: {
  query: {
    importJobs: {
      findMany(input: { columns: { id: true } }): Promise<Array<{ id: string }>>;
    };
  };
  delete(table: unknown): Promise<unknown>;
}) {
  const jobs = await db.query.importJobs.findMany({ columns: { id: true } });
  await db.delete(importJobs);

  return {
    deletedJobs: jobs.length,
  };
}

export async function deleteImportItemFromDb(db: {
  query: {
    importItems: {
      findFirst(input: { where: any }): Promise<{ id: string; importJobId: string } | undefined>;
    };
  };
  delete(table: unknown): { where(predicate: any): Promise<unknown> };
}, importItemId: string) {
  const item = await db.query.importItems.findFirst({
    where: eq(importItems.id, importItemId),
  });

  if (!item) {
    return { deleted: false, reason: "not_found" };
  }

  await db.delete(importItems).where(eq(importItems.id, importItemId));
  await db.delete(importJobs).where(eq(importJobs.id, item.importJobId));

  return { deleted: true, importItemId, importJobId: item.importJobId };
}

export interface UpdateImportItemData {
  finalName?: string;
  finalPrice?: number;
  categoryName?: string;
}

export async function updateImportItemFromDb(db: {
  query: {
    importItems: {
      findFirst(input: { where: any }): Promise<{ id: string; productData: Record<string, unknown> | null; price: number | null } | undefined>;
    };
  };
  update(table: unknown): { set(values: any): { where(predicate: any): Promise<unknown> } };
}, importItemId: string, data: UpdateImportItemData) {
  const item = await db.query.importItems.findFirst({
    where: eq(importItems.id, importItemId),
  });

  if (!item) {
    return { updated: false, reason: "not_found" };
  }

  const updates: any = {};
  const productDataUpdate: Record<string, unknown> = item.productData ?? {};

  if (data.finalName !== undefined) {
    productDataUpdate.finalName = data.finalName;
  }

  if (data.categoryName !== undefined) {
    productDataUpdate.categoryName = data.categoryName;
  }

  if (Object.keys(productDataUpdate).length > 0) {
    updates.productData = productDataUpdate;
  }

  if (data.finalPrice !== undefined) {
    updates.price = data.finalPrice;
  }

  if (Object.keys(updates).length > 0) {
    updates.updatedAt = new Date();
    await db.update(importItems).set(updates).where(eq(importItems.id, importItemId));
  }

  return { updated: true, importItemId, ...data };
}

export interface ApplyImportImageActionInput {
  imageId: string;
  action: ImportReviewAction;
  previousState?: ImportReviewState;
}

export interface ApplyImportImageActionResult {
  importItemId: string;
  imageId: string;
  previousState: ImportReviewState;
  nextState: ImportReviewState;
  nextIsSizeGuide: boolean;
  importItemStatus: "pending" | "approved" | "rejected";
  coverImageId: string | null;
}

interface DbImportImage {
  id: string;
  importItemId: string;
  sourceUrl: string;
  previewUrl: string | null;
  reviewState: ImportReviewState;
  isSizeGuide: boolean;
  order: number;
}

function resolveMediaStatus(item: { status: string; productData: Record<string, unknown> | null }, images: readonly DbImportImage[]): "pending" | "ready" | "failed" {
  if (item.status === "media_failed") {
    return "failed";
  }

  if (item.status === "promoted") {
    return "ready";
  }

  return "pending";
}

function resolveProductName(productData: Record<string, unknown> | null) {
  if (!productData) return null;

  const value = productData.finalName ?? productData.name ?? productData.productName;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function resolveFinalPrice(productData: Record<string, unknown> | null) {
  if (!productData) return null;

  const raw = productData.finalPrice ?? productData.priceArs;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

function resolveBrand(productData: Record<string, unknown> | null) {
  if (!productData) return null;

  const raw = productData.brand ?? productData.brandName;
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
}

function isConsumedImportItem(productData: Record<string, unknown> | null) {
  if (!productData) {
    return false;
  }

  return typeof productData._promotionConsumedAt === "string" && productData._promotionConsumedAt.trim().length > 0;
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
        if (item.status === "promoted") {
          continue;
        }

        if (isConsumedImportItem(item.productData)) {
          continue;
        }

        const images = await options.db.query.importImages.findMany({
          where: eq(importImages.importItemId, item.id),
          orderBy: [asc(importImages.order)],
        });

        const job = await options.db.query.importJobs.findFirst({ where: eq(importJobs.id, item.importJobId) });

        const queueImages: CurationQueueImage[] = images.map((image) => ({
          id: image.id,
          importItemId: image.importItemId,
          sourceUrl: image.sourceUrl,
          previewUrl: image.previewUrl ?? null,
          reviewState: image.reviewState,
          isSizeGuide: image.isSizeGuide,
          order: image.order,
        }));
        const promotion = resolvePromotionEligibility(queueImages);

        normalizedItems.push({
          id: item.id,
          status: item.status,
          mediaStatus: resolveMediaStatus(item, images),
          sourceReference: job?.sourceReference ?? null,
          finalName: resolveProductName(item.productData),
          finalPrice: resolveFinalPrice(item.productData),
          brand: resolveBrand(item.productData),
          activeImageCount: countActiveImages(queueImages),
          productName: resolveProductName(item.productData),
          coverImageId: deriveAutomaticCoverImageId(queueImages),
          promotionEligible: promotion.eligible,
          promotionBlockedReason: promotion.reason,
          images: queueImages,
        });
      }

      return {
        items: normalizedItems,
      };
    },

    async applyImageAction(input: ApplyImportImageActionInput): Promise<ApplyImportImageActionResult> {
      const row = await options.db.query.importImages.findFirst({ where: eq(importImages.id, input.imageId) });

      if (!row) {
        throw new Error("No se encontró la imagen importada para revisión.");
      }

      const previousState = row.reviewState;
      const nextState = input.action === "toggle-size-guide"
        ? row.reviewState
        : applyReviewAction(input.action, input.previousState);
      const nextIsSizeGuide = input.action === "toggle-size-guide"
        ? toggleSizeGuide(row.isSizeGuide)
        : row.isSizeGuide;
      const at = now();

      await options.db.update(importImages).set({
        reviewState: nextState,
        isSizeGuide: nextIsSizeGuide,
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
            sourceUrl: image.sourceUrl,
            previewUrl: image.previewUrl ?? null,
            reviewState: image.reviewState,
            isSizeGuide: image.isSizeGuide,
            order: image.order,
          };
        }

        return {
          id: image.id,
          importItemId: image.importItemId,
          sourceUrl: image.sourceUrl,
          previewUrl: image.previewUrl ?? null,
          reviewState: nextState,
          isSizeGuide: nextIsSizeGuide,
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
        nextIsSizeGuide,
        importItemStatus,
        coverImageId,
      };
    },
  };
}
