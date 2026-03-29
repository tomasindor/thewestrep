import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PublicHeader } from "@/components/layout/public-header";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: `Catálogos | ${siteConfig.title}`,
  description:
    "Elegí entre stock y encargues en thewestrep con una portada minimal: logo arriba y dos entradas claras al catálogo.",
};

const catalogEntries = [
  {
    href: "/stock",
    title: "Stock",
    eyebrow: "Disponible ahora",
    summary: "Entrá a lo que ya está publicado, con precio final y salida más directa.",
    fit: "Ideal para resolver compra rápida sin vueltas.",
    cta: "Abrir stock",
    image: "/destacada.png",
    imageAlt: "Selección disponible en stock en thewestrep",
    panelClassName:
      "bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))]",
  },
  {
    href: "/encargue",
    title: "Encargue internacional",
    eyebrow: "Catálogo a pedido",
    summary: "Entrá al catálogo de encargues, elegí el producto y avanzá con una consulta puntual.",
    fit: "Ideal si querés elegir desde el catálogo y seguir la gestión por WhatsApp.",
    cta: "Abrir encargues",
    image: "/cover-corteiz.jpg",
    imageAlt: "Producto de referencia para encargues en thewestrep",
    panelClassName:
      "bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))]",
  },
] as const;

export default function CatalogHubPage() {
  return (
    <main className="flex-1">
      <div className="relative isolate">
        <PublicHeader />

        <section className="py-8 sm:py-10 lg:py-14">
          <Container className="space-y-8 sm:space-y-10">
            <header className="flex justify-center lg:justify-start">
              <Link
                href="/"
                aria-label="Volver al inicio"
                className="block rounded-full transition hover:opacity-90 md:hidden"
              >
                <BrandLogo className="h-11 w-11 sm:h-14 sm:w-14" sizes="56px" priority />
              </Link>
            </header>

            <section className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            {catalogEntries.map((entry) => (
              <Link
                key={entry.href}
                href={entry.href}
                aria-label={entry.cta}
                className={`group relative overflow-hidden rounded-[2rem] border border-white/10 ${entry.panelClassName} transition duration-300 hover:-translate-y-1 hover:border-orange-300/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06070b]`}
              >
                <div className="grid min-h-[30rem] gap-0 sm:min-h-[34rem]">
                  <div className="relative min-h-[14rem] border-b border-white/10">
                    <Image
                      src={entry.image}
                      alt={entry.imageAlt}
                      fill
                      className="object-cover object-center transition duration-700 group-hover:scale-[1.03]"
                      sizes="(max-width: 1024px) 100vw, 46vw"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.74))]" />
                    <div className="absolute left-5 top-5 rounded-full border border-white/12 bg-black/30 px-4 py-2 text-[11px] font-medium tracking-[0.32em] text-orange-100/80 uppercase backdrop-blur-sm sm:left-6 sm:top-6">
                      {entry.eyebrow}
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-6 p-6 sm:p-8">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <h2 className="font-display text-5xl leading-none text-white sm:text-6xl">
                          {entry.title}
                        </h2>
                        <span
                          aria-hidden="true"
                          className="pt-2 text-3xl leading-none text-white/45 transition duration-200 group-hover:text-orange-200"
                        >
                          ↗
                        </span>
                      </div>

                      <p className="max-w-xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
                        {entry.summary}
                      </p>
                      <p className="text-sm font-medium text-white/82 sm:text-base">{entry.fit}</p>
                    </div>

                    <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-4 text-sm text-slate-300 sm:text-base">
                      <span>Entrar al catálogo</span>
                      <span className="text-white transition duration-200 group-hover:text-orange-100">
                        {entry.cta}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            </section>
          </Container>
        </section>
      </div>
    </main>
  );
}
