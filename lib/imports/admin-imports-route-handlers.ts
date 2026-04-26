import { getDb } from "@/lib/db/core";
import {
  clearImportsQueueFromDb,
  createImportsCurationServiceFromDb,
  deleteImportItemFromDb,
  updateImportItemFromDb,
  type ApplyImportImageActionResult,
  type CurationQueuePayload,
  type UpdateImportItemData,
} from "@/lib/imports/curation";
import { createPromotionFoundationFromDb, type BulkPromotionResult, promoteEligibleImportItems } from "@/lib/imports/promotion";
import type { ImportReviewAction, ImportReviewState } from "@/lib/imports/curation-state";
import { logger } from "@/lib/logger";

async function defaultRequireAdminSession() {
  const { requireAdminSession } = await import("@/lib/auth/session");
  return requireAdminSession();
}

interface AdminImportsActionBody {
  imageId?: string;
  itemId?: string;
  itemIds?: string[];
  action?: ImportReviewAction | "bulk-promote" | "promote-item" | "clear-queue" | "approve" | "delete-item" | "update-item";
  previousState?: ImportReviewState;
  updateData?: UpdateImportItemData;
}

interface AdminImportsRouteDeps {
  requireAdminSession: () => Promise<unknown>;
  listQueue: (input?: { limit?: number }) => Promise<CurationQueuePayload>;
  applyImageAction: (input: { imageId: string; action: ImportReviewAction; previousState?: ImportReviewState }) => Promise<ApplyImportImageActionResult>;
  promoteEligibleItems: (input: { itemIds?: string[] }) => Promise<BulkPromotionResult>;
  clearImportsQueue: () => Promise<{ deletedJobs: number }>;
  deleteImportItem: (importItemId: string) => Promise<{ deleted: boolean; importItemId?: string; importJobId?: string; reason?: string }>;
  updateImportItem: (importItemId: string, data: UpdateImportItemData) => Promise<{ updated: boolean; importItemId?: string; reason?: string }>;
  logError: (event: string, context: Record<string, unknown>) => void;
}

function createDefaultDeps(): AdminImportsRouteDeps | null {
  const db = getDb();

  if (!db) {
    return null;
  }

  const service = createImportsCurationServiceFromDb({ db });
  const promotionFoundation = createPromotionFoundationFromDb({ db });

  return {
    requireAdminSession: defaultRequireAdminSession,
    listQueue: service.listQueue,
    applyImageAction: service.applyImageAction,
    promoteEligibleItems: (input) => promoteEligibleImportItems(input, promotionFoundation),
    clearImportsQueue: async () => clearImportsQueueFromDb(db),
    deleteImportItem: async (importItemId: string) => deleteImportItemFromDb(db, importItemId),
    updateImportItem: async (importItemId: string, data: UpdateImportItemData) => updateImportItemFromDb(db, importItemId, data),
    logError: logger.error,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function parseImportAction(action: unknown): ImportReviewAction | null {
  if (action === "reject" || action === "restore" || action === "toggle-size-guide") {
    return action;
  }

  return null;
}

function parseImportReviewState(candidate: unknown): ImportReviewState | undefined {
  if (candidate === "pending" || candidate === "approved" || candidate === "rejected") {
    return candidate;
  }

  return undefined;
}

export function createAdminImportsRouteHandlers(overrides: Partial<AdminImportsRouteDeps> = {}) {
  const defaults = createDefaultDeps();

  const deps: AdminImportsRouteDeps = {
    requireAdminSession: defaultRequireAdminSession,
    listQueue: async () => {
      if (!defaults) {
        throw new Error("Database not configured. Set DATABASE_URL in your environment.");
      }

      return defaults.listQueue();
    },
    applyImageAction: async (input) => {
      if (!defaults) {
        throw new Error("Database not configured. Set DATABASE_URL in your environment.");
      }

      return defaults.applyImageAction(input);
    },
    promoteEligibleItems: async (input) => {
      if (!defaults) {
        throw new Error("Database not configured. Set DATABASE_URL in your environment.");
      }

      return defaults.promoteEligibleItems(input);
    },
  clearImportsQueue: async () => {
    if (!defaults) {
      throw new Error("Database not configured. Set DATABASE_URL in your environment.");
    }

    return defaults.clearImportsQueue();
  },
  deleteImportItem: async (importItemId: string) => {
    if (!defaults) {
      throw new Error("Database not configured. Set DATABASE_URL in your environment.");
    }

    return defaults.deleteImportItem(importItemId);
  },
  updateImportItem: async (importItemId: string, data: UpdateImportItemData) => {
    if (!defaults) {
      throw new Error("Database not configured. Set DATABASE_URL in your environment.");
    }

    return defaults.updateImportItem(importItemId, data);
  },
  logError: logger.error,
  ...overrides,
};

  return {
    async GET(request: Request) {
      await deps.requireAdminSession();

      try {
        const { searchParams } = new URL(request.url);
        const limitCandidate = Number(searchParams.get("limit") ?? "20");
        const limit = Number.isFinite(limitCandidate) && limitCandidate > 0
          ? Math.min(100, Math.trunc(limitCandidate))
          : 20;
        const payload = await deps.listQueue({ limit });

        return Response.json({ ok: true, data: payload });
      } catch (error) {
        deps.logError("admin_imports_queue_failed", { error: getErrorMessage(error) });
        return Response.json({ error: getErrorMessage(error) || "No se pudo cargar la cola de importaciones." }, { status: 500 });
      }
    },

    async POST(request: Request) {
      await deps.requireAdminSession();

      try {
        const body = (await request.json()) as AdminImportsActionBody;
        const imageId = typeof body.imageId === "string" ? body.imageId.trim() : "";
        const action = parseImportAction(body.action);
        const previousState = parseImportReviewState(body.previousState);

        if (body.action === "approve") {
          return Response.json({ error: "La acción approve ya no existe: usá reject/restore/toggle-size-guide." }, { status: 400 });
        }

        if (body.action === "bulk-promote" || body.action === "promote-item") {
          const promotedItemId = typeof body.itemId === "string" && body.itemId.trim().length > 0
            ? body.itemId.trim()
            : null;
          const itemIds = body.action === "promote-item"
            ? (promotedItemId ? [promotedItemId] : [])
            : Array.isArray(body.itemIds)
            ? body.itemIds.filter((itemId): itemId is string => typeof itemId === "string" && itemId.trim().length > 0)
            : undefined;

          if (body.action === "promote-item" && (!itemIds || itemIds.length === 0)) {
            return Response.json({ error: "Debés enviar itemId para promover un producto puntual." }, { status: 400 });
          }

          const result = await deps.promoteEligibleItems({ itemIds });
          return Response.json({ ok: true, data: result });
        }

if (body.action === "clear-queue") {
  const result = await deps.clearImportsQueue();
  return Response.json({ ok: true, data: result });
}

if (body.action === "delete-item") {
  const itemId = typeof body.itemId === "string" && body.itemId.trim().length > 0
    ? body.itemId.trim()
    : null;

  if (!itemId) {
    return Response.json({ error: "Debés enviar itemId para eliminar el producto." }, { status: 400 });
  }

  const result = await deps.deleteImportItem(itemId);
  return Response.json({ ok: true, data: result });
}

if (body.action === "update-item") {
  const itemId = typeof body.itemId === "string" && body.itemId.trim().length > 0
    ? body.itemId.trim()
    : null;

  if (!itemId) {
    return Response.json({ error: "Debés enviar itemId para actualizar el producto." }, { status: 400 });
  }

  const updateData: UpdateImportItemData = {};
  if (typeof body.updateData?.finalName === "string") {
    updateData.finalName = body.updateData.finalName;
  }
  if (typeof body.updateData?.finalPrice === "number") {
    updateData.finalPrice = body.updateData.finalPrice;
  }
  if (typeof body.updateData?.categoryName === "string") {
    updateData.categoryName = body.updateData.categoryName;
  }
  if (typeof body.updateData?.comboEligible === "boolean") {
    updateData.comboEligible = body.updateData.comboEligible;
  }
  if (typeof body.updateData?.comboGroup === "string") {
    updateData.comboGroup = body.updateData.comboGroup;
  }

  const result = await deps.updateImportItem(itemId, updateData);
  return Response.json({ ok: true, data: result });
}

if (!imageId || !action) {
  return Response.json({ error: "Debés enviar imageId y una acción válida (reject/restore/toggle-size-guide o bulk-promote)." }, { status: 400 });
}

        const result = await deps.applyImageAction({ imageId, action, previousState });
        return Response.json({ ok: true, data: result });
      } catch (error) {
        deps.logError("admin_imports_action_failed", { error: getErrorMessage(error) });
        return Response.json({ error: getErrorMessage(error) || "No se pudo actualizar el estado de la imagen." }, { status: 500 });
      }
    },
  };
}
