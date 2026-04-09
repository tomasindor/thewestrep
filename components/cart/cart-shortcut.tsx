"use client";

import { usePathname } from "next/navigation";

import { useCart } from "@/components/cart/cart-provider";

const visiblePathPrefixes = ["/catalogo", "/stock", "/encargue"];

export function CartShortcut() {
  const pathname = usePathname();
  const { itemCount, openCart } = useCart();

  if (!pathname || !visiblePathPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={openCart}
      className="fixed right-4 bottom-4 z-40 inline-flex min-h-11 items-center gap-3 rounded-full border border-white/12 bg-[#0d1016]/88 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(0,0,0,0.42)] backdrop-blur md:right-6 md:bottom-6"
      aria-label="Abrir carrito flotante"
    >
      <span>{itemCount > 0 ? "Checkout" : "Carrito"}</span>
      <span className="rounded-full border border-white/10 bg-white/8 px-2 py-0.5 text-xs text-[#f4d7e0]">
        {itemCount}
      </span>
    </button>
  );
}
