"use client";

import Link from "next/link";

import { ghostCtaClassName, solidCtaClassName } from "@/lib/ui";

const accentEyebrowClassName = "text-[#f1d2dc]/72";

export function CheckoutEmptyState() {
  return (
    <section className="rounded-[1.75rem] border border-dashed border-white/12 bg-white/[0.03] p-6 sm:p-8">
      <p className={`text-xs font-medium tracking-[0.28em] uppercase ${accentEyebrowClassName}`}>Checkout vacío</p>
      <h2 className="mt-3 text-3xl font-semibold text-white">Todavía no hay productos para cerrar.</h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
        Sumá productos desde stock o encargue y después volvés acá para confirmar tu compra.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/stock" className={solidCtaClassName}>
          Explorar stock
        </Link>
        <Link href="/catalogo" className={ghostCtaClassName}>
          Ver catálogos
        </Link>
      </div>
    </section>
  );
}
