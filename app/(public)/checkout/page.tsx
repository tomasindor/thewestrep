import type { Metadata } from "next";
import Link from "next/link";

import { CheckoutExperienceV2 } from "@/components/checkout/checkout-experience-v2";
import { HeaderConfigProvider } from "@/components/layout/header-config-context";
import { fetchProvincias } from "@/lib/address/georef";
import { createPageMetadata } from "@/lib/seo";
import { compactGhostCtaClassName } from "@/lib/ui";

export const metadata: Metadata = createPageMetadata({
  title: "Checkout",
  description:
    "Checkout de thewestrep para revisar el carrito, completar tus datos y cerrar la coordinación de compra con una experiencia más clara.",
  path: "/checkout",
  keywords: ["checkout", "carrito", "compra streetwear"],
});

export default async function CheckoutPage() {
  const provinces = await fetchProvincias();

  return (
    <HeaderConfigProvider
      config={{
        navItems: [
          { href: "/catalogo", label: "Catálogos" },
          { href: "/stock", label: "Stock" },
          { href: "/encargue", label: "Encargue" },
        ],
        actions: (
          <Link href="/catalogo" className={compactGhostCtaClassName}>
            Seguir comprando
          </Link>
        ),
      }}
    >
      <CheckoutExperienceV2 provinces={provinces} />
    </HeaderConfigProvider>
  );
}
