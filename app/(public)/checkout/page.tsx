import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CheckoutExperience } from "@/components/cart/checkout-experience";
import { HeaderConfigProvider } from "@/components/layout/header-config-context";
import { getCustomerProfileById } from "@/lib/auth/customer-profile";
import { getCustomerSession } from "@/lib/auth/session";
import { shouldRedirectCheckoutToVerifyEmail } from "@/lib/orders/checkout-verification-gate";
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
  const customerSession = await getCustomerSession();

  const verifyRedirect = customerSession?.user
    ? shouldRedirectCheckoutToVerifyEmail({
      checkoutMode: "account",
      emailVerified: customerSession.user.emailVerified,
      returnUrl: "/checkout",
    })
    : null;

  if (verifyRedirect) {
    redirect(verifyRedirect);
  }

  const customerProfile = customerSession?.user?.id ? await getCustomerProfileById(customerSession.user.id).catch(() => null) : null;

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
      <CheckoutExperience
        customerProfile={customerProfile}
        customerAuth={
          customerSession?.user
            ? {
                name: customerSession.user.name ?? "",
                email: customerSession.user.email ?? "",
                authProvider: customerSession.user.authProvider ?? "credentials",
                emailVerified: customerSession.user.emailVerified ?? null,
              }
            : null
        }
      />
    </HeaderConfigProvider>
  );
}
