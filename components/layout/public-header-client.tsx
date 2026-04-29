"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { CartHeaderButton } from "@/components/cart/cart-header-button";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Container } from "@/components/ui/container";
import { navLinkClassName } from "@/lib/ui";

import { AccountMenu } from "./account-menu";
import { useHeaderConfig } from "./header-config-context";
import { PublicNavLink } from "./public-nav-link";

const publicNavSections = [
  { anchor: "modalidades", label: "Modalidades" },
  { anchor: "categorias", label: "Categorías" },
  { anchor: "seleccion-inmediata", label: "Selección inmediata" },
  { anchor: "consultas", label: "Consultas" },
] as const;

function getPublicNavItems(anchorPrefix = "/") {
  const normalizedPrefix = anchorPrefix === "" ? "/" : anchorPrefix;

  return publicNavSections.map((item) => ({
    href: `${normalizedPrefix}#${item.anchor}`,
    label: item.label,
  }));
}

const defaultNavItems = getPublicNavItems();

interface PublicHeaderClientProps {
  isLoggedIn: boolean;
  greeting: string;
  navItems?: readonly { href: string; label: string }[];
  actions?: ReactNode;
  homeLinkLabel?: string;
}

function HomeLogoLink({ ariaLabel }: { ariaLabel: string }) {
  const pathname = usePathname();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.location.href = "/";
    }
  }

  return (
    <Link href="/" aria-label={ariaLabel} onClick={handleClick} className="flex items-center gap-3 rounded-full px-1 py-1 transition hover:opacity-90">
      <BrandLogo className="h-14 w-14 sm:h-18 sm:w-18" sizes="72px" priority />
    </Link>
  );
}

export function PublicHeaderClient({
  isLoggedIn,
  greeting,
  navItems: propNavItems,
  actions: propActions,
  homeLinkLabel,
}: PublicHeaderClientProps) {
  const config = useHeaderConfig();

  const navItems = propNavItems ?? config?.navItems ?? defaultNavItems;
  const actions = propActions ?? config?.actions;
  const resolvedHomeLinkLabel = homeLinkLabel ?? config?.homeLinkLabel ?? "Volver al inicio";

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
        <HomeLogoLink ariaLabel={resolvedHomeLinkLabel} />

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
