import { connection } from "next/server";
import { headers } from "next/headers";

import { ImportsReviewClient } from "@/components/admin/imports-review-client";
import { getDb } from "@/lib/db/core";
import { createImportsCurationServiceFromDb } from "@/lib/imports/curation";
import { buildPlaywrightImportsQueueFixture, resolveImportsQueueForRender } from "@/lib/imports/e2e-fixtures";
import { isPlaywrightRuntime } from "@/lib/testing/playwright-runtime";

export default async function AdminImportsPage() {
  await connection();
  const requestHeaders = await headers();
  const isPlaywrightRequest = isPlaywrightRuntime({
    playwrightEnv: process.env.PLAYWRIGHT,
    requestHeader: requestHeaders.get("x-playwright-admin"),
  });

  const db = getDb();

  if (!db) {
    if (isPlaywrightRequest) {
      const queue = buildPlaywrightImportsQueueFixture();

      return (
        <section className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-medium tracking-[0.32em] text-[#f1d2dc]/70 uppercase">Importaciones</p>
            <h1 className="font-display text-5xl text-white">Curación rápida de imágenes</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-300">
              Curación por producto con carrusel: rechazá/restaurá por excepción, marcá size-guide y promové en bloque desde esta misma cola.
            </p>
          </div>

          <ImportsReviewClient initialItems={queue.items} />
        </section>
      );
    }

    return (
      <section className="space-y-6">
        <div className="space-y-3">
          <p className="text-xs font-medium tracking-[0.32em] text-[#f1d2dc]/70 uppercase">Importaciones</p>
          <h1 className="font-display text-5xl text-white">Curación rápida de imágenes</h1>
        </div>

        <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          Database not configured. Set DATABASE_URL in your environment.
        </p>
      </section>
    );
  }

  const service = createImportsCurationServiceFromDb({ db });
  let queue = buildPlaywrightImportsQueueFixture();

  try {
    queue = await service.listQueue({ limit: 48 });
  } catch {
    if (!isPlaywrightRequest) {
      throw new Error("No se pudo cargar la cola de importaciones.");
    }
  }

  const queueForRender = resolveImportsQueueForRender({
    isPlaywrightRuntime: isPlaywrightRequest,
    liveQueue: queue,
  });

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-medium tracking-[0.32em] text-[#f1d2dc]/70 uppercase">Importaciones</p>
        <h1 className="font-display text-5xl text-white">Curación rápida de imágenes</h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-300">
          Curación por producto con carrusel: rechazá/restaurá por excepción, marcá size-guide y promové en bloque desde esta misma cola.
        </p>
      </div>

      <ImportsReviewClient initialItems={queueForRender.items} />
    </section>
  );
}
