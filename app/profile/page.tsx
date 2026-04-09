import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import { CustomerProfileExperience } from "@/components/profile/customer-profile-experience";
import { getCustomerProfileById } from "@/lib/auth/customer-profile";
import { getCustomerSession } from "@/lib/auth/session";
import { createPageMetadata } from "@/lib/seo";
import { compactGhostCtaClassName } from "@/lib/ui";

export const metadata: Metadata = createPageMetadata({
  title: "Perfil",
  description: "Perfil customer de thewestrep para guardar datos de contacto y entrega sin mezclarlo con el historial.",
  path: "/profile",
  keywords: ["perfil", "cuenta customer", "envío", "checkout"],
});

const profileNavItems = [
  { href: "/catalogo", label: "Catálogos" },
  { href: "/stock", label: "Stock" },
  { href: "/checkout", label: "Checkout" },
] as const;

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
    <div className="flex min-h-screen flex-1 flex-col">
      <PublicHeader
        navItems={profileNavItems}
        homeLinkLabel="Volver al inicio de thewestrep"
        actions={
          <div className="flex flex-wrap gap-3">
            <Link href="/historial" className={compactGhostCtaClassName}>
              Ver historial
            </Link>
            <Link href="/checkout" className={compactGhostCtaClassName}>
              Volver al checkout
            </Link>
          </div>
        }
      />

      <CustomerProfileExperience initialProfile={profile} />

      <PublicFooter />
    </div>
  );
}
