import type { Metadata } from "next";
import Link from "next/link";

import { CartHeaderButton } from "@/components/cart/cart-header-button";
import { CheckoutExperience } from "@/components/cart/checkout-experience";
import { PublicHeader } from "@/components/layout/public-header";
import { siteConfig } from "@/lib/site";
import { compactGhostCtaClassName } from "@/lib/ui";

export const metadata: Metadata = {
  title: `Checkout | ${siteConfig.title}`,
  description: "Checkout client-side de thewestrep con datos del comprador, modalidad de entrega, resumen estimado y confirmación simulada.",
};

const checkoutNavItems = [
  { href: "/catalogo", label: "Catálogos" },
  { href: "/stock", label: "Stock" },
  { href: "/encargue", label: "Encargue" },
] as const;

export default function CheckoutPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <PublicHeader
        navItems={checkoutNavItems}
        homeLinkLabel="Volver al inicio de thewestrep"
        actions={
          <>
            <Link href="/catalogo" className={compactGhostCtaClassName}>
              Seguir comprando
            </Link>
            <CartHeaderButton />
          </>
        }
      />

      <CheckoutExperience />
    </div>
  );
}
