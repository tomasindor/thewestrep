import type { CatalogProduct } from "@/lib/catalog/models";

import { ProductCard } from "@/components/catalog/product-card";

interface ProductGridProps {
  products: CatalogProduct[];
  cardVariant?: "default" | "home";
  contextAvailability?: CatalogProduct["availability"];
}

function buildComboPairNameByProductId(products: CatalogProduct[]) {
  const byGroup = new Map<string, CatalogProduct[]>();

  for (const product of products) {
    if (!product.comboEligible || !product.comboGroup) {
      continue;
    }

    const groupProducts = byGroup.get(product.comboGroup) ?? [];
    groupProducts.push(product);
    byGroup.set(product.comboGroup, groupProducts);
  }

  const pairById = new Map<string, string>();

  for (const groupProducts of byGroup.values()) {
    for (const product of groupProducts) {
      const pair = groupProducts.find((candidate) => candidate.id !== product.id);
      if (pair) {
        pairById.set(product.id, pair.name);
      }
    }
  }

  return pairById;
}

export function ProductGrid({ products, cardVariant = "default", contextAvailability }: ProductGridProps) {
  const comboPairNameByProductId = buildComboPairNameByProductId(products);
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
          pairedProductName={comboPairNameByProductId.get(product.id)}
        />
      ))}
    </div>
  );
}
