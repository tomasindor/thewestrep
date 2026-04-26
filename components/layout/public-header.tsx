import type { ReactNode } from "react";

import { getCustomerProfileById } from "@/lib/auth/customer-profile";
import { getCustomerSession } from "@/lib/auth/session";
import { navLinkClassName } from "@/lib/ui";
import { CartHeaderButton } from "@/components/cart/cart-header-button";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Container } from "@/components/ui/container";

import { AccountMenu } from "./account-menu";
import { PublicNavLink } from "./public-nav-link";

const publicNavSections = [
  { anchor: "modalidades", label: "Modalidades" },
  { anchor: "categorias", label: "Categorías" },
  { anchor: "seleccion-inmediata", label: "Selección inmediata" },
  { anchor: "consultas", label: "Consultas" },
] as const;

export function getPublicNavItems(anchorPrefix = "/") {
  const normalizedPrefix = anchorPrefix === "" ? "/" : anchorPrefix;

  return publicNavSections.map((item) => ({
    href: `${normalizedPrefix}#${item.anchor}`,
    label: item.label,
  }));
}

const defaultNavItems = getPublicNavItems();

interface PublicHeaderProps {
  actions?: ReactNode;
  homeLinkHref?: string;
  homeLinkLabel?: string;
  navItems?: readonly { href: string; label: string }[];
}

function getCustomerGreeting(name?: string | null) {
  const firstName = name?.trim().split(/\s+/)[0];

  return firstName ? `Hola, ${firstName}` : "Mi cuenta";
}

export async function PublicHeader({
  actions,
  homeLinkHref = "/",
  homeLinkLabel = "Volver al inicio",
  navItems = defaultNavItems,
}: PublicHeaderProps) {
  const customerSession = await getCustomerSession();
  const isLoggedIn = Boolean(customerSession?.user);
  const customerProfile = customerSession?.user?.id ? await getCustomerProfileById(customerSession.user.id).catch(() => null) : null;
  const greeting = getCustomerGreeting(customerProfile?.name ?? customerSession?.user?.name);

  const actionsSlot = (
    <div className="flex items-center justify-end gap-3">
      {actions}
      <AccountMenu isLoggedIn={isLoggedIn} greeting={greeting} />
      <CartHeaderButton />
    </div>
  );

  return (
    <header data-public-header className="sticky top-0 z-30 border-b border-white/8 bg-black/70 backdrop-blur-xl">
      <Container className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-3 sm:gap-6 sm:py-4">
        <PublicNavLink href={homeLinkHref} aria-label={homeLinkLabel} className="flex items-center gap-3 rounded-full px-1 py-1 transition hover:opacity-90">
          <BrandLogo className="h-14 w-14 sm:h-18 sm:w-18" sizes="72px" priority />
        </PublicNavLink>

        <nav className="hidden items-center justify-center gap-6 text-sm text-slate-300 md:flex">
          {navItems.map((item) => (
            <PublicNavLink key={item.href} href={item.href} className={navLinkClassName}>
              {item.label}
            </PublicNavLink>
          ))}
        </nav>

        {actionsSlot}
      </Container>
    </header>
  );
}
