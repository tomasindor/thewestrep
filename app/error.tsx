"use client";

import { useEffect } from "react";
import Link from "next/link";

import { solidCtaClassName } from "@/lib/ui";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled app error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <main className="flex flex-1 items-center justify-center px-6 py-12 sm:px-8 sm:py-16">
        <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,20,28,0.98),rgba(7,9,14,0.99))] p-5 text-center shadow-[0_36px_120px_rgba(0,0,0,0.55)] ring-1 ring-white/8 sm:p-7">
          <h2 className="text-3xl font-semibold text-white sm:text-[2rem]">Algo salió mal</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Ocurrió un error inesperado. Podés intentar de nuevo o volver al inicio.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button type="button" onClick={reset} className={solidCtaClassName}>
              Reintentar
            </button>
            <Link href="/" className="text-sm text-slate-400 transition hover:text-white">
              Volver al inicio
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
