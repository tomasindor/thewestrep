"use client";

import { solidCtaClassName } from "@/lib/ui";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body className="bg-[#07090e] text-white">
        <div className="flex min-h-screen items-center justify-center px-6 py-12">
          <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,20,28,0.98),rgba(7,9,14,0.99))] p-5 text-center shadow-[0_36px_120px_rgba(0,0,0,0.55)] ring-1 ring-white/8 sm:p-7">
            <h2 className="text-3xl font-semibold text-white sm:text-[2rem]">Error fatal</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Ocurrió un error crítico. Recargá la página o volvé al inicio.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button type="button" onClick={reset} className={solidCtaClassName}>
                Reintentar
              </button>
              <a href="/" className="text-sm text-slate-400 transition hover:text-white">
                Volver al inicio
              </a>
            </div>
          </section>
        </div>
      </body>
    </html>
  );
}
