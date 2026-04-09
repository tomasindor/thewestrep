import Link from "next/link";

import { PublicHeader } from "@/components/layout/public-header";
import { compactGhostCtaClassName } from "@/lib/ui";

export function CatalogHeader() {
  return (
    <PublicHeader
      actions={(
        <Link href="/catalogo" className={compactGhostCtaClassName}>
          Ver catálogo
        </Link>
      )}
    />
  );
}
