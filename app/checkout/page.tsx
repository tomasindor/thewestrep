import type { Metadata } from "next";
import Link from "next/link";

import { CheckoutExperience } from "@/components/cart/checkout-experience";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import { getCustomerProfileById } from "@/lib/auth/customer-profile";
import { getCustomerSession } from "@/lib/auth/session";
import { createPageMetadata } from "@/lib/seo";
import { compactGhostCtaClassName } from "@/lib/ui";

export const metadata: Metadata = createPageMetadata({
  title: "Checkout",
  description:
    "Checkout de thewestrep para revisar el carrito, completar tus datos y cerrar la coordinación de compra con una experiencia más clara.",
  path: "/checkout",
  keywords: ["checkout", "carrito", "compra streetwear"],
});

const checkoutNavItems = [
  { href: "/catalogo", label: "Catálogos" },
  { href: "/stock", label: "Stock" },
  { href: "/encargue", label: "Encargue" },
] as const;

export default async function CheckoutPage() {
  const customerSession = await getCustomerSession();
  const customerProfile = customerSession?.user?.id ? await getCustomerProfileById(customerSession.user.id).catch(() => null) : null;

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <PublicHeader
        navItems={checkoutNavItems}
        homeLinkLabel="Volver al inicio de thewestrep"
        actions={
          <Link href="/catalogo" className={compactGhostCtaClassName}>
            Seguir comprando
          </Link>
        }
      />

      <CheckoutExperience
        customerProfile={customerProfile}
        customerAuth={
          customerSession?.user
            ? {
                name: customerSession.user.name ?? "",
                email: customerSession.user.email ?? "",
                authProvider: customerSession.user.authProvider ?? "credentials",
              }
            : null
        }
      />

      <PublicFooter />
    </div>
  );
}
