import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { HeaderConfigProvider } from "@/components/layout/header-config-context";
import { CustomerProfileExperience } from "@/components/profile/customer-profile-experience";
import { getCustomerProfileById } from "@/lib/auth/customer-profile";
import { getCustomerSession } from "@/lib/auth/session";
import { createPageMetadata } from "@/lib/seo";
import { compactGhostCtaClassName } from "@/lib/ui";
import Link from "next/link";

export const metadata: Metadata = createPageMetadata({
  title: "Perfil",
  description: "Perfil customer de thewestrep para guardar datos de contacto y entrega sin mezclarlo con el historial.",
  path: "/profile",
  keywords: ["perfil", "cuenta customer", "envío", "checkout"],
});

export default async function ProfilePage() {
  const customerSession = await getCustomerSession();

  if (!customerSession?.user?.id) {
    redirect("/login");
  }

  const profile = await getCustomerProfileById(customerSession.user.id);

  if (!profile) {
    redirect("/login");
  }

  return (
    <HeaderConfigProvider
      config={{
        navItems: [
          { href: "/catalogo", label: "Catálogos" },
          { href: "/stock", label: "Stock" },
          { href: "/checkout", label: "Checkout" },
        ],
        actions: (
          <div className="flex flex-wrap gap-3">
            <Link href="/historial" className={compactGhostCtaClassName}>
              Ver historial
            </Link>
            <Link href="/checkout" className={compactGhostCtaClassName}>
              Volver al checkout
            </Link>
          </div>
        ),
      }}
    >
      <CustomerProfileExperience initialProfile={profile} />
    </HeaderConfigProvider>
  );
}
