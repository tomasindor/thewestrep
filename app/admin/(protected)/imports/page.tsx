import { connection } from "next/server";

import { ImportsReviewClient } from "@/components/admin/imports-review-client";
import { getDb } from "@/lib/db/core";
import { createImportsCurationServiceFromDb } from "@/lib/imports/curation";

export default async function AdminImportsPage() {
  await connection();

  const db = getDb();

  if (!db) {
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
  const queue = await service.listQueue({ limit: 48 });

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-medium tracking-[0.32em] text-[#f1d2dc]/70 uppercase">Importaciones</p>
        <h1 className="font-display text-5xl text-white">Curación rápida de imágenes</h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-300">
          Aprobar, rechazar o restaurar candidatos de Yupoo sin editar cover manualmente: el cover se deriva en la lógica de datos.
        </p>
      </div>

      <ImportsReviewClient initialItems={queue.items} />
    </section>
  );
}
