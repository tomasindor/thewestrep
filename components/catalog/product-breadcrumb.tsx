import Link from "next/link";

import type { ProductAvailability } from "@/lib/catalog";

const availabilityLabel: Record<ProductAvailability, string> = {
  stock: "Stock",
  encargue: "Encargue",
};

interface ProductBreadcrumbProps {
  availability: ProductAvailability;
  productName: string;
}

export function ProductBreadcrumb({ availability, productName }: ProductBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
      <Link href="/catalogo" className="transition hover:text-orange-100">
        Catálogos
      </Link>
      <span aria-hidden="true" className="text-white/25">/</span>
      <Link href={`/${availability}`} className="transition hover:text-orange-100">
        {availabilityLabel[availability]}
      </Link>
      <span aria-hidden="true" className="text-white/25">/</span>
      <span className="text-white">{productName}</span>
    </nav>
  );
}
