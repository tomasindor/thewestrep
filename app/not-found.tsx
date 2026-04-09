import Link from "next/link";
import type { Metadata } from "next";

import { solidCtaClassName } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Página no encontrada",
};

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <main className="flex flex-1 items-center justify-center px-6 py-12 sm:px-8 sm:py-16">
        <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,20,28,0.98),rgba(7,9,14,0.99))] p-5 text-center shadow-[0_36px_120px_rgba(0,0,0,0.55)] ring-1 ring-white/8 sm:p-7">
          <p className="text-xs font-medium tracking-[0.32em] text-[#f1d2dc]/72 uppercase">Error 404</p>
          <h1 className="mt-3 text-3xl font-semibold text-white sm:text-[2rem]">Página no encontrada</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            La página que buscás no existe o fue movida.
          </p>
          <div className="mt-6">
            <Link href="/" className={`${solidCtaClassName} block text-center`}>
              Volver al inicio
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
