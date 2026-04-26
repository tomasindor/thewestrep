import type { Metadata } from "next";
import Link from "next/link";

import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import { Container } from "@/components/ui/container";
import { getHomepageComboHighlights } from "@/lib/catalog";
import { createPageMetadata } from "@/lib/seo";
import { compactGhostCtaClassName } from "@/lib/ui";

export const metadata: Metadata = createPageMetadata({
  title: "Combos Encargue | TheWestRep",
  description: "Landing de combos encargue activos en thewestrep con top + bottom, ahorro destacado y acceso directo al look completo.",
  path: "/encargue/combos",
  keywords: ["combos encargue", "look completo", "descuento 30%"],
});

interface EncargueCombosPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function asSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function EncargueCombosPage({ searchParams }: EncargueCombosPageProps) {
  const params = await searchParams;
  const brand = asSingleParam(params.brand)?.trim().toLowerCase();
  const season = asSingleParam(params.season)?.trim().toLowerCase();
  const maxPrice = Number(asSingleParam(params.maxPrice));
  const hasPriceFilter = Number.isFinite(maxPrice) && maxPrice > 0;
  const combos = await getHomepageComboHighlights(24);
  const visibleCombos = combos.filter((combo) => {
    if (brand && combo.top.brand.slug !== brand && combo.bottom.brand.slug !== brand) {
      return false;
    }

    if (season && !combo.comboGroup.toLowerCase().includes(season)) {
      return false;
    }

    if (hasPriceFilter && combo.comboPairAmountArs > maxPrice) {
      return false;
    }

    return true;
  });

  return (
    <main className="flex-1">
      <div className="relative isolate">
        <PublicHeader />

        <section className="py-12 sm:py-18">
          <Container className="space-y-6">
            <p className="font-display text-sm tracking-[0.45em] text-[#f2d4dd]/78 uppercase">Encargue combos</p>
            <h1 className="font-display max-w-5xl text-5xl leading-[0.9] text-white sm:text-7xl">COMBOS ACTIVOS PARA ARMAR EL LOOK COMPLETO.</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-300 sm:text-lg sm:leading-7">
              Filtrá por marca, temporada o precio total y entrá directo a las dos prendas que forman el combo.
            </p>

            <div className="flex flex-wrap gap-2 text-xs text-slate-300">
              <Link href="/encargue/combos" className={compactGhostCtaClassName}>Todo</Link>
              <Link href="/encargue/combos?season=winter" className={compactGhostCtaClassName}>Winter</Link>
              <Link href="/encargue/combos?season=ss" className={compactGhostCtaClassName}>SS</Link>
              <Link href="/encargue/combos?maxPrice=150000" className={compactGhostCtaClassName}>Hasta $150.000</Link>
            </div>
          </Container>
        </section>

        <section className="pb-16 sm:pb-20">
          <Container>
            {visibleCombos.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {visibleCombos.map((combo) => (
                  <article key={`${combo.comboGroup}:${combo.top.id}:${combo.bottom.id}`} className="rounded-[1.85rem] border border-white/10 bg-white/[0.03] p-6">
                    <p className="text-[11px] tracking-[0.24em] text-[#f1d2dc]/75 uppercase">{combo.comboGroup}</p>
                    <h2 className="mt-3 text-2xl font-semibold text-white">{combo.top.name} + {combo.bottom.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Total combo: {`$ ${combo.comboPairAmountArs.toLocaleString("es-AR")}`} · Ahorro: {`$ ${combo.discountAmountArs.toLocaleString("es-AR")}`}.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={`/${combo.top.availability}/${combo.top.slug}`} className={compactGhostCtaClassName}>Ver top</Link>
                      <Link href={`/${combo.bottom.availability}/${combo.bottom.slug}`} className={compactGhostCtaClassName}>Ver bottom</Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-[1.85rem] border border-dashed border-white/12 bg-white/[0.03] p-6 text-slate-300">
                No encontramos combos con esos filtros. Probá otra temporada, marca o rango de precio.
              </div>
            )}
          </Container>
        </section>

        <PublicFooter />
      </div>
    </main>
  );
}
