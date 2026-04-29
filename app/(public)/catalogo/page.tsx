import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Catálogo",
  description:
    "Elegí entre stock inmediato y encargue internacional asistido en thewestrep con dos entradas claras al catálogo y navegación directa hacia cada modalidad.",
  path: "/catalogo",
  keywords: ["catálogo", "stock inmediato", "encargue internacional asistido"],
});

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
    imageClassName: "",
    imageOverlayClassName:
      "bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.74))]",
    panelClassName:
      "bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))]",
  },
  {
    href: "/encargue",
    title: "Encargue internacional asistido",
    eyebrow: "Puerta a puerta",
    summary: "Entrá al catálogo, elegí el producto y avanzá con un proceso asistido desde la selección hasta la entrega.",
    fit: "Ideal si querés que encarguemos a proveedores y te acompañemos durante todo el recorrido.",
    cta: "Abrir encargues",
    image: "/cover-corteiz.jpg",
    imageAlt: "Producto de referencia para encargues en thewestrep",
    imageClassName: "brightness-[0.88] contrast-[1.08] saturate-[0.96]",
    imageOverlayClassName:
      "bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.12),transparent_42%),linear-gradient(180deg,rgba(0,0,0,0.18),rgba(0,0,0,0.82))]",
    panelClassName:
      "bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))]",
  },
] as const;

export default function CatalogHubPage() {
  return (
    <div className="relative isolate">
      <section className="py-8 sm:py-10 lg:py-14">
        <Container className="space-y-8 sm:space-y-10">
          <div className="space-y-3">
            <p className="text-xs font-medium tracking-[0.32em] text-[#f1d2dc]/72 uppercase">
              Catálogo
            </p>
            <h1 className="font-display text-5xl leading-[0.92] text-white sm:text-6xl">
              Catálogo
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
              Elegí si querés resolver rápido con stock o avanzar con un encargue internacional asistido puerta a puerta.
            </p>
          </div>

          <section className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            {catalogEntries.map((entry) => (
              <Link
                key={entry.href}
                href={entry.href}
                aria-label={entry.cta}
                className={`group relative overflow-hidden rounded-[2rem] border border-white/10 ${entry.panelClassName} shadow-[0_24px_60px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-1 hover:border-[rgba(210,138,163,0.42)] hover:shadow-[0_28px_72px_rgba(0,0,0,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(210,138,163,0.6)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06070b]`}
              >
                <div className="grid min-h-[30rem] gap-0 sm:min-h-[34rem]">
                  <div className="relative min-h-[14rem] overflow-hidden border-b border-white/10 bg-black">
                    <div className="absolute -inset-px transform-gpu overflow-hidden [transform:translateZ(0)] transition duration-700 will-change-transform group-hover:scale-[1.03]">
                      <Image
                        src={entry.image}
                        alt={entry.imageAlt}
                        fill
                        className={`object-cover object-center [transform:translateZ(0)_scale(1.004)] ${entry.imageClassName}`}
                        sizes="(max-width: 1024px) 100vw, 46vw"
                      />
                    </div>
                    <div className={`absolute inset-0 ${entry.imageOverlayClassName}`} />
                    <div className="absolute left-5 top-5 rounded-full border border-white/12 bg-black/30 px-4 py-2 text-[11px] font-medium tracking-[0.32em] text-[#f2d4dd]/82 uppercase backdrop-blur-sm sm:left-6 sm:top-6">
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
                          className="pt-2 text-3xl leading-none text-white/45 transition duration-200 group-hover:text-[#f3d4de]"
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
                        <span className="text-white transition duration-200 group-hover:text-[#f6dbe4]">
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
  );
}
