import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeaderWithData } from "@/components/layout/public-header-with-data";
import { getPublicNavItems } from "@/components/layout/public-header";
import { compactGhostCtaClassName } from "@/lib/ui";
import Link from "next/link";

const defaultNavItems = getPublicNavItems();

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <PublicHeaderWithData
        navItems={defaultNavItems}
        actions={
          <Link href="/catalogo" className={compactGhostCtaClassName}>
            Ver catálogo
          </Link>
        }
      />
      {children}
      <PublicFooter />
    </div>
  );
}
