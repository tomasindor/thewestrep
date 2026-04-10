import { getDb } from "@/lib/db/core";
import {
  createImportsCurationServiceFromDb,
  type ApplyImportReviewActionResult,
  type CurationQueuePayload,
} from "@/lib/imports/curation";
import type { ImportReviewAction, ImportReviewState } from "@/lib/imports/curation-state";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

async function defaultRequireAdminSession() {
  const { requireAdminSession } = await import("@/lib/auth/session");
  return requireAdminSession();
}

interface AdminImportsActionBody {
  imageId?: string;
  action?: ImportReviewAction;
  previousState?: ImportReviewState;
}

interface AdminImportsRouteDeps {
  requireAdminSession: () => Promise<unknown>;
  listQueue: (input?: { limit?: number }) => Promise<CurationQueuePayload>;
  applyReviewAction: (input: { imageId: string; action: ImportReviewAction; previousState?: ImportReviewState }) => Promise<ApplyImportReviewActionResult>;
  logError: (event: string, context: Record<string, unknown>) => void;
}

function createDefaultDeps(): AdminImportsRouteDeps | null {
  const db = getDb();

  if (!db) {
    return null;
  }

  const service = createImportsCurationServiceFromDb({ db });

  return {
    requireAdminSession: defaultRequireAdminSession,
    listQueue: service.listQueue,
    applyReviewAction: service.applyReviewAction,
    logError: logger.error,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function parseImportAction(action: unknown): ImportReviewAction | null {
  if (action === "approve" || action === "reject" || action === "restore") {
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
    applyReviewAction: async (input) => {
      if (!defaults) {
        throw new Error("Database not configured. Set DATABASE_URL in your environment.");
      }

      return defaults.applyReviewAction(input);
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

        if (!imageId || !action) {
          return Response.json({ error: "Debés enviar imageId y una acción válida (approve/reject/restore)." }, { status: 400 });
        }

        const result = await deps.applyReviewAction({ imageId, action, previousState });
        return Response.json({ ok: true, data: result });
      } catch (error) {
        deps.logError("admin_imports_action_failed", { error: getErrorMessage(error) });
        return Response.json({ error: getErrorMessage(error) || "No se pudo actualizar el estado de la imagen." }, { status: 500 });
      }
    },
  };
}

const handlers = createAdminImportsRouteHandlers();

export async function GET(request: Request) {
  return handlers.GET(request);
}

export async function POST(request: Request) {
  return handlers.POST(request);
}
