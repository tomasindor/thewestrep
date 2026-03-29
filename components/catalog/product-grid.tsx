import type { CatalogProduct } from "@/lib/catalog";

import { ProductCard } from "@/components/catalog/product-card";

interface ProductGridProps {
  products: CatalogProduct[];
  cardVariant?: "default" | "home";
}

export function ProductGrid({ products, cardVariant = "default" }: ProductGridProps) {
  return (
    <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} variant={cardVariant} />
      ))}
    </div>
  );
}
