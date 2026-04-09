import type { CartItem } from "@/lib/cart/types";

export const CORREO_ARGENTINO_FEE = 7600;

export function hasEncargueItems(items: CartItem[]) {
  return items.some((item) => item.availability === "encargue");
}

export function getCorreoArgentinoFeeTotal(items: CartItem[]) {
  return hasEncargueItems(items) ? CORREO_ARGENTINO_FEE : 0;
}
