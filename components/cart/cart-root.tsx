"use client";

import type { ReactNode } from "react";

import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartProvider } from "@/components/cart/cart-provider";
import { CartShortcut } from "@/components/cart/cart-shortcut";

export function CartRoot({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      {children}
      <CartShortcut />
      <CartDrawer />
    </CartProvider>
  );
}
