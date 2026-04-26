import { getDb } from "@/lib/db/core";
import { createBulkIngestionDependencies } from "@/lib/imports/bulk-r2-wiring";
import { ingestYupooSource, type YupooIngestionResult } from "@/lib/imports/ingestion";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

async function defaultRequireAdminSession() {
  const { requireAdminSession } = await import("@/lib/auth/session");
  return requireAdminSession();
}

interface SingleItemImportBody {
  url?: string;
  sourceReference?: string;
  productData?: Record<string, unknown>;
  maxImages?: number;
}

interface AdminSingleItemImportDeps {
  requireAdminSession: () => Promise<unknown>;
  ingestYupooSource: (input: {
    source: "admin";
    sourceUrl: string;
    sourceReference?: string;
    productData?: Record<string, unknown>;
    maxImages?: number;
  }, dependencies: Parameters<typeof ingestYupooSource>[1]) => Promise<YupooIngestionResult>;
  getIngestionDependencies: () => Parameters<typeof ingestYupooSource>[1] | null;
  logError: (event: string, context: Record<string, unknown>) => void;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function createAdminSingleItemImportHandler(overrides: Partial<AdminSingleItemImportDeps> = {}) {
  const dependencies: AdminSingleItemImportDeps = {
    requireAdminSession: defaultRequireAdminSession,
    ingestYupooSource,
    getIngestionDependencies: () => {
      const db = getDb();
      return db ? createBulkIngestionDependencies(db) : null;
    },
    logError: logger.error,
    ...overrides,
  };

  return async function handleAdminSingleItemImport(request: Request) {
    await dependencies.requireAdminSession();

    try {
      const body = (await request.json()) as SingleItemImportBody;
      const url = typeof body.url === "string" ? body.url.trim() : "";

      if (!url) {
        return Response.json({ error: "Falta la URL de Yupoo." }, { status: 400 });
      }

      const ingestionDeps = dependencies.getIngestionDependencies();

      if (!ingestionDeps) {
        return Response.json({ error: "Database not configured. Set DATABASE_URL in your environment." }, { status: 500 });
      }

      const result = await dependencies.ingestYupooSource(
        {
          source: "admin",
          sourceUrl: url,
          sourceReference: body.sourceReference,
          productData: body.productData,
          maxImages: body.maxImages,
        },
        ingestionDeps,
      );

      return Response.json({ ok: true, data: result });
    } catch (error) {
      dependencies.logError("admin_single_item_import_failed", {
        error: getErrorMessage(error),
      });

      return Response.json(
        {
          error: getErrorMessage(error) || "No se pudo importar el item de Yupoo.",
        },
        { status: 500 },
      );
    }
  };
}

const handler = createAdminSingleItemImportHandler();

export async function POST(request: Request) {
  return handler(request);
}
