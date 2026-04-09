import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import { OrderHistorySection } from "@/components/profile/order-history-section";
import { getCustomerSession } from "@/lib/auth/session";
import { getCustomerOrderHistory } from "@/lib/orders/repository";
import { createPageMetadata } from "@/lib/seo";
import { compactGhostCtaClassName } from "@/lib/ui";

export const metadata: Metadata = createPageMetadata({
  title: "Historial",
  description: "Historial de pedidos customer de thewestrep con referencias y resúmenes de compra.",
  path: "/historial",
  keywords: ["historial", "pedidos", "cuenta customer"],
});

const historyNavItems = [
  { href: "/catalogo", label: "Catálogos" },
  { href: "/stock", label: "Stock" },
  { href: "/checkout", label: "Checkout" },
] as const;

export default async function OrderHistoryPage() {
  const customerSession = await getCustomerSession();

  if (!customerSession?.user?.id) {
    redirect("/login");
  }

  const orders = await getCustomerOrderHistory(customerSession.user.id);

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <PublicHeader
        navItems={historyNavItems}
        homeLinkLabel="Volver al inicio de thewestrep"
        actions={
          <Link href="/profile" className={compactGhostCtaClassName}>
            Ir al perfil
          </Link>
        }
      />

      <main className="flex-1 py-10 sm:py-14">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 lg:px-8">
          <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,15,23,0.96),rgba(6,7,11,0.96))] p-6 sm:p-8">
            <p className="text-xs font-medium tracking-[0.32em] uppercase text-[#f1d2dc]/72">Historial customer</p>
            <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl space-y-3">
                <h1 className="font-display text-4xl leading-none text-white sm:text-6xl">Tus pedidos, limpios y a mano.</h1>
                <p className="text-sm leading-6 text-slate-300 sm:text-base">
                  Revisá lo que ya compraste y retomá cualquier conversación con contexto real, sin perder el tono premium del sitio.
                </p>
              </div>

              <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-left text-xs text-slate-300">
                <span className="block tracking-[0.22em] uppercase text-[#f1d2dc]/70">Pedidos</span>
                <span className="mt-1 block text-sm font-semibold text-white">
                  {orders.length === 0 ? "Sin pedidos todavía" : `${orders.length} pedido${orders.length === 1 ? "" : "s"} guardado${orders.length === 1 ? "" : "s"}`}
                </span>
              </div>
            </div>
          </section>

          <OrderHistorySection orders={orders} />
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
