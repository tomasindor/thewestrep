"use client";

import { useCart } from "@/components/cart/cart-provider";

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2v4" />
      <path d="M18 2v4" />
      <path d="M3 6h18l-2 14H5L3 6z" />
      <path d="M3 6h18" />
      <circle cx="9" cy="14" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="15" cy="14" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CartHeaderButton() {
  const { itemCount, openCart } = useCart();

  return (
    <button type="button" onClick={openCart} className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] text-[#f4d7e0] shadow-[0_12px_34px_rgba(0,0,0,0.22)] transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(210,138,163,0.34)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(210,138,163,0.62)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06070b]" aria-label="Abrir carrito">
      <CartIcon />
      {itemCount > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[rgba(210,138,163,0.85)] px-1 text-[10px] font-semibold text-white">
          {itemCount}
        </span>
      ) : null}
    </button>
  );
}
