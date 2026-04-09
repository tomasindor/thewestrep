import Link from "next/link";

import type { ProductAvailability } from "@/lib/catalog/types";

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
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-300 sm:text-xs">
      <Link href="/catalogo" className="rounded-full px-1 py-0.5 transition hover:text-[#f6dbe4] focus-visible:text-[#f6dbe4] focus-visible:outline-none">
        Catálogos
      </Link>
      <span aria-hidden="true" className="text-white/25">/</span>
      <Link
        href={`/${availability}`}
        className="rounded-full px-1 py-0.5 transition hover:text-[#f6dbe4] focus-visible:text-[#f6dbe4] focus-visible:outline-none"
      >
        {availabilityLabel[availability]}
      </Link>
      <span aria-hidden="true" className="text-white/25">/</span>
      <span className="rounded-full px-1 py-0.5 text-white">{productName}</span>
    </nav>
  );
}
