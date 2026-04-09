import Link from "next/link";

import {
  formatOrderHistoryDate,
  formatOrderHistoryItemLabel,
  formatOrderHistoryStatus,
  type OrderHistoryEntrySnapshot,
} from "@/lib/orders/history";
import { compactGhostCtaClassName, surfaceClassName } from "@/lib/ui";
import { formatArs } from "@/lib/utils";

type OrderHistorySectionProps = {
  orders: OrderHistoryEntrySnapshot[];
};

export function OrderHistorySection({ orders }: OrderHistorySectionProps) {
  return (
    <section className={surfaceClassName}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.28em] uppercase text-[#f1d2dc]/72">Historial</p>
          <h2 className="text-2xl font-semibold text-white">Tus pedidos guardados</h2>
          <p className="text-sm leading-6 text-slate-300">
            Referencias, totales y un resumen corto para retomar la conversación sin revolver WhatsApp.
          </p>
        </div>

        <Link href="/checkout" className={compactGhostCtaClassName}>
          Hacer otro pedido
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-white/10 bg-black/20 px-5 py-6 text-sm leading-6 text-slate-300">
          Todavía no tenés pedidos vinculados a esta cuenta. Cuando cierres un checkout autenticado, te va a quedar guardado acá.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {orders.map((order) => {
            const visibleItems = order.items.slice(0, 3);
            const hiddenItemsCount = Math.max(order.items.length - visibleItems.length, 0);

            return (
              <article
                key={order.id}
                className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.18)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-medium tracking-[0.24em] uppercase text-[#f1d2dc]/72">Pedido {order.reference}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{formatOrderHistoryDate(order.createdAtIso)}</span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{formatOrderHistoryStatus(order.status)}</span>
                      {order.containsEncargueItems ? (
                        <span className="rounded-full border border-[rgba(210,138,163,0.2)] bg-[#d28aa3]/10 px-3 py-1 text-[#f4d7e0]">Incluye encargue</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-medium tracking-[0.24em] uppercase text-slate-400">Total</p>
                    <p className="mt-1 text-xl font-semibold text-white">{formatArs(order.totalAmountArs)}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {order.unitCount} unidad{order.unitCount === 1 ? "" : "es"} · {order.lineItemCount} ítem{order.lineItemCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-[1.2rem] border border-white/8 bg-black/20 p-4">
                  <p className="text-xs font-medium tracking-[0.22em] uppercase text-slate-400">Resumen de productos</p>

                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-200">
                    {visibleItems.map((item) => (
                      <li key={item.id} className="flex items-start justify-between gap-4">
                        <span className="min-w-0 flex-1 truncate">{formatOrderHistoryItemLabel(item)}</span>
                        <span className="shrink-0 text-slate-400">x{item.quantity}</span>
                      </li>
                    ))}
                  </ul>

                  {hiddenItemsCount > 0 ? (
                    <p className="mt-3 text-xs text-slate-400">+ {hiddenItemsCount} producto{hiddenItemsCount === 1 ? "" : "s"} más en el pedido.</p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
