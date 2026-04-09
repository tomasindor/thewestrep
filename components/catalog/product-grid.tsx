import type { CatalogProduct } from "@/lib/catalog/models";

import { ProductCard } from "@/components/catalog/product-card";

interface ProductGridProps {
  products: CatalogProduct[];
  cardVariant?: "default" | "home";
  contextAvailability?: CatalogProduct["availability"];
}

export function ProductGrid({ products, cardVariant = "default", contextAvailability }: ProductGridProps) {
  const gridClassName =
    cardVariant === "default"
      ? "grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      : "grid gap-6 sm:gap-7 md:grid-cols-2 xl:grid-cols-3";

  return (
    <div className={gridClassName}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          variant={cardVariant}
          contextAvailability={contextAvailability}
        />
      ))}
    </div>
  );
}
