import type { Metadata } from "next";
import Link from "next/link";

import { FaqAccordion } from "@/components/ui/faq-accordion";
import { Container } from "@/components/ui/container";
import { faqItems } from "@/lib/faq";
import { createPageMetadata, sanitizeJsonLd } from "@/lib/seo";
import { compactGhostCtaClassName, solidCtaClassName } from "@/lib/ui";

export const metadata: Metadata = createPageMetadata({
  title: "Consultas frecuentes",
  description:
    "Preguntas frecuentes sobre stock, encargue internacional asistido, precios, entregas y cómo avanzar desde el catálogo de thewestrep.",
  path: "/consultas",
  keywords: ["preguntas frecuentes", "consultas", "envíos", "precios"],
});

const processSteps = [
  {
    title: "Elegí el camino",
    description: "Entrá por stock si querés resolver rápido o por encargues si buscás un servicio internacional asistido.",
  },
  {
    title: "Encontrá el producto",
    description: "En encargues, ubicás el artículo dentro del catálogo para avanzar con una referencia clara desde el inicio.",
  },
  {
    title: "Seguimos por WhatsApp",
    description: "Con esa referencia confirmamos disponibilidad, tiempos estimados y cómo sigue el proceso hasta la entrega.",
  },
];

const keyPoints = [
  "precio claro desde el arranque",
  "encargue asistido puerta a puerta",
  "consulta puntual desde cada producto",
];

export default function ConsultasPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <div className="relative isolate">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: sanitizeJsonLd(faqJsonLd),
        }}
      />

      <Container className="space-y-8 py-12 sm:space-y-10 sm:py-16">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className={compactGhostCtaClassName}>
            Volver al inicio
          </Link>
          <Link href="/catalogo" className={compactGhostCtaClassName}>
            Ver catálogo
          </Link>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(210,138,163,0.18),rgba(8,10,16,0.98)_44%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.018))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.26)] sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
            <div className="space-y-5">
              <p className="text-xs font-medium tracking-[0.32em] text-[#f1d2dc]/75 uppercase">Consultas</p>
              <h1 className="font-display max-w-4xl text-5xl leading-[0.95] text-white sm:text-6xl">
                Todo más claro antes de escribirnos.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
                En encargues trabajamos con una lógica simple: encontrás el producto, encargamos a nuestros proveedores y te acompañamos durante todo el proceso hasta la entrega en tu domicilio.
              </p>

              <div className="flex flex-wrap gap-2 text-[11px] font-medium tracking-[0.24em] text-white/75 uppercase">
                {keyPoints.map((point) => (
                  <span key={point} className="rounded-full border border-white/10 bg-black/18 px-3 py-2">
                    {point}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-3 rounded-[1.75rem] border border-white/10 bg-black/28 p-4 sm:p-5">
              {processSteps.map((step, index) => (
                <article
                  key={step.title}
                  className="rounded-[1.4rem] border border-white/8 bg-white/[0.035] p-4 sm:p-5"
                >
                  <div className="flex items-start gap-4">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(210,138,163,0.35)] bg-[rgba(210,138,163,0.14)] text-sm font-semibold text-[#f4d7e0]">
                      0{index + 1}
                    </span>
                    <div className="space-y-1.5">
                      <h2 className="text-base font-semibold text-white sm:text-lg">{step.title}</h2>
                      <p className="text-sm leading-6 text-slate-300">{step.description}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-start"
          data-page-section="faq-accordion"
        >
          <div className="space-y-4 lg:sticky lg:top-24">
            <p className="text-xs font-medium tracking-[0.32em] text-[#f1d2dc]/70 uppercase">Preguntas frecuentes</p>
            <h2 className="font-display text-4xl leading-[0.95] text-white sm:text-5xl">
              Abrí solo lo que necesitás ver.
            </h2>
            <p className="max-w-md text-sm leading-6 text-slate-300 sm:text-base">
              Ordenamos las respuestas para que entiendas rápido cómo funciona el stock y qué implica el encargue internacional asistido, sin promesas confusas ni letra chica.
            </p>
          </div>

          <FaqAccordion items={faqItems} defaultOpenIndex={0} />
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)] sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">¿Ya viste lo que querés?</h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Entrá al catálogo, ubicá el producto y avanzá con esa referencia para que podamos asistirte en todo el proceso.
              </p>
            </div>

            <Link href="/catalogo" className={solidCtaClassName}>
              Ver catálogo
            </Link>
          </div>
        </section>
      </Container>
    </div>
  );
}
