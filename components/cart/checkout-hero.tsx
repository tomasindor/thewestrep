"use client";

import { eyebrowAccentClassName } from "@/lib/ui";

interface CheckoutHeroProps {
  isHydrated: boolean;
  itemsCount: number;
  unitCount: number;
}

const accentEyebrowClassName = "text-[#f1d2dc]/72";

export function CheckoutHero({ isHydrated, itemsCount, unitCount }: CheckoutHeroProps) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,15,23,0.96),rgba(6,7,11,0.96))] p-6 sm:p-8">
      <p className={`text-xs font-medium tracking-[0.32em] uppercase ${accentEyebrowClassName}`}>Checkout thewestrep</p>
      <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <h1 className="font-display text-4xl leading-none text-white sm:text-6xl">Revisá tu pedido y coordiná la entrega.</h1>
          <p className="text-sm leading-6 text-slate-300 sm:text-base">
            Completá tus datos, definí la entrega y revisá el resumen antes de confirmar.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-slate-300">
          <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-white">
            {isHydrated ? `${itemsCount} productos` : "Cargando carrito"}
          </span>
          <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-white">{unitCount} unidades</span>
        </div>
      </div>
    </section>
  );
}
