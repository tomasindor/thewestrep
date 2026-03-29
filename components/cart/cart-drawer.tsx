"use client";

import Link from "next/link";

import { useCart } from "@/components/cart/cart-provider";
import { compactGhostCtaClassName, solidCtaClassName } from "@/lib/ui";

function getSelectionCopy(variantLabel?: string, sizeLabel?: string) {
  return [variantLabel, sizeLabel].filter(Boolean).join(" · ");
}

function getProductHref(availability: "stock" | "encargue", productSlug: string) {
  return `/${availability}/${productSlug}`;
}

export function CartDrawer() {
  const { closeCart, clearCart, isHydrated, isOpen, itemCount, items, removeItem, updateQuantity } = useCart();

  const handleClose = () => {
    closeCart();
  };

  const handleClear = () => {
    clearCart();
  };

  const handleRemoveItem = (itemId: string) => {
    removeItem(itemId);
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    updateQuantity(itemId, quantity);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/55 backdrop-blur-sm">
      <button type="button" aria-label="Cerrar carrito" className="flex-1" onClick={handleClose} />

      <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-[#090b11] text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-medium tracking-[0.28em] text-orange-200/70 uppercase">Checkout</p>
            <h2 className="mt-1 text-2xl font-semibold">Carrito</h2>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 ? (
              <button type="button" onClick={handleClear} className={compactGhostCtaClassName}>
                Vaciar
              </button>
            ) : null}
            <button type="button" onClick={handleClose} className={compactGhostCtaClassName}>
              Cerrar
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          {!isHydrated ? (
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-300">
              Cargando carrito...
            </div>
          ) : null}

          {isHydrated && items.length === 0 ? (
            <div className="space-y-4 rounded-[1.5rem] border border-dashed border-white/12 bg-white/[0.03] p-5 text-sm leading-6 text-slate-300">
              <p>Tu carrito está vacío. Sumá productos y dejá el checkout listo para terminar la compra.</p>
              <Link href="/catalogo" onClick={handleClose} className={compactGhostCtaClassName}>
                Explorar catálogo
              </Link>
            </div>
          ) : null}

          {items.length > 0 ? (
            <section className="flex items-center justify-between rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-white">{items.length} productos</p>
                <p className="text-sm text-slate-400">{itemCount} unidades en este checkout</p>
              </div>
              <Link href="/checkout" onClick={handleClose} className="text-sm text-slate-300 transition hover:text-white">
                Abrir checkout
              </Link>
            </section>
          ) : null}

          {items.length > 0 ? (
            <div className="space-y-3">
              {items.map((item) => {
                const selectionCopy = getSelectionCopy(item.variantLabel, item.sizeLabel);
                const productHref = getProductHref(item.availability, item.productSlug);

                return (
                  <article key={item.id} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <p className="text-base font-semibold text-white">{item.productName}</p>
                        <p className="text-sm text-orange-100">{item.priceDisplay}</p>
                        {selectionCopy ? <p className="text-xs uppercase tracking-[0.18em] text-white/60">{selectionCopy}</p> : null}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <Link href={productHref} onClick={handleClose} className="text-sm text-slate-300 transition hover:text-white">
                          Ver producto
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-sm text-slate-300 transition hover:text-white"
                        >
                          Remover
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        className={compactGhostCtaClassName}
                        aria-label={`Bajar cantidad de ${item.productName}`}
                      >
                        −
                      </button>
                      <span className="min-w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        className={compactGhostCtaClassName}
                        aria-label={`Subir cantidad de ${item.productName}`}
                      >
                        +
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}

          {items.length > 0 ? (
            <section className="space-y-4 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
              <div>
                <p className="text-xs font-medium tracking-[0.28em] text-orange-200/75 uppercase">Siguiente paso</p>
                <h3 className="mt-1 text-xl font-semibold text-white">Pasá a la ruta dedicada del checkout.</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  El drawer queda para edición rápida del carrito. El checkout ahora tiene su propia pantalla base para seguir creciendo fuera del panel lateral.
                </p>
              </div>

              <Link href="/checkout" onClick={handleClose} className={`${solidCtaClassName} w-full`}>
                Ir al checkout
              </Link>

              <p className="text-xs leading-5 text-slate-400">
                Por ahora sólo separamos navegación y estructura. Pago, validaciones y cierre final quedan para una siguiente tanda.
              </p>
            </section>
          ) : null}
        </div>

        <div className="border-t border-white/10 px-5 py-4 sm:px-6">
          <Link href={items.length > 0 ? "/checkout" : "/catalogo"} onClick={handleClose} className={`${solidCtaClassName} w-full`}>
            {items.length === 0 ? "Explorar catálogo" : "Abrir checkout completo"}
          </Link>

          <p className="mt-3 text-xs leading-5 text-slate-400">
            {items.length === 0
              ? "El carrito todavía está vacío."
              : "El carrito sigue editable acá, pero el cierre del pedido ahora vive en una ruta dedicada."}
          </p>
        </div>
      </aside>
    </div>
  );
}
