import Link from "next/link";
import type { ReactNode } from "react";

import { Container } from "@/components/ui/container";
import { BrandLogo } from "@/components/ui/brand-logo";
import { navLinkClassName } from "@/lib/ui";

const defaultNavItems = [
  { href: "/#modalidades", label: "Modalidades" },
  { href: "/#categorias", label: "Categorías" },
  { href: "/#consultas", label: "Consultas" },
] as const;

interface PublicHeaderProps {
  actions?: ReactNode;
  homeLinkHref?: string;
  homeLinkLabel?: string;
  navItems?: readonly { href: string; label: string }[];
}

export function PublicHeader({
  actions,
  homeLinkHref = "/",
  homeLinkLabel = "Volver al inicio",
  navItems = defaultNavItems,
}: PublicHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-black/70 backdrop-blur-xl">
      <Container className="flex items-center justify-between gap-4 py-3 sm:gap-6 sm:py-4">
        <Link href={homeLinkHref} aria-label={homeLinkLabel} className="flex items-center gap-3 rounded-full px-1 py-1 transition hover:opacity-90">
          <BrandLogo className="h-11 w-11 sm:h-14 sm:w-14" sizes="56px" priority />
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={navLinkClassName}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">{actions}</div>
      </Container>
    </header>
  );
}
