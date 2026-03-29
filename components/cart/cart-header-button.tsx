"use client";

import { useCart } from "@/components/cart/cart-provider";
import { compactGhostCtaClassName } from "@/lib/ui";

export function CartHeaderButton() {
  const { itemCount, openCart } = useCart();

  return (
    <button type="button" onClick={openCart} className={compactGhostCtaClassName} aria-label="Abrir carrito">
      {itemCount > 0 ? `Checkout (${itemCount})` : "Carrito"}
    </button>
  );
}
