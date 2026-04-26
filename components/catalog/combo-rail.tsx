import Link from "next/link";

import { ComboAddToCartButton } from "@/components/catalog/combo-add-to-cart-button";
import { ProductCard } from "@/components/catalog/product-card";
import { getCatalogProducts, type CatalogProduct } from "@/lib/catalog";

interface ComboRailProps {
  product: CatalogProduct;
  comboGroup: string;
  availability: "encargue" | "stock";
}

export async function ComboRail({ product, comboGroup, availability }: ComboRailProps) {
  const candidates = await getCatalogProducts({ availability, states: ["published"] });
  const related = candidates
    .filter((candidate) => candidate.id !== product.id)
    .filter((candidate) => candidate.comboEligible)
    .filter((candidate) => candidate.comboGroup === comboGroup)
    .slice(0, 4);
  const pairedProduct = related[0];

  if (related.length === 0) {
    return null;
  }

  const originalPairAmountArs = product.pricing.amount + pairedProduct.pricing.amount;
  const comboDiscountAmountArs = Math.round(Math.min(product.pricing.amount, pairedProduct.pricing.amount) * 0.3);
  const comboPairAmountArs = originalPairAmountArs - comboDiscountAmountArs;

  return (
    <section className="space-y-4 rounded-[1.9rem] border border-[rgba(210,138,163,0.22)] bg-[rgba(210,138,163,0.06)] p-5">
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-[0.28em] text-[#f1d2dc]/78 uppercase">Completá el look</p>
        <p className="text-sm text-[#f7dfe6]">✨ Este producto forma parte de un look. Ahorrá 30% en la prenda más barata.</p>
      </div>

      <div className="rounded-[1.2rem] border border-[rgba(210,138,163,0.22)] bg-[rgba(210,138,163,0.08)] p-4">
        <p className="text-xs tracking-[0.22em] text-[#f1d2dc]/78 uppercase">Combo sugerido</p>
        <p className="mt-2 text-sm text-[#f7dfe6]">
          {product.name} + {pairedProduct.name}
        </p>
        <p className="mt-1 text-xs text-slate-300">
          Antes: {`$ ${originalPairAmountArs.toLocaleString("es-AR")}`} · Combo: {`$ ${comboPairAmountArs.toLocaleString("es-AR")}`} · Ahorro: {`$ ${comboDiscountAmountArs.toLocaleString("es-AR")}`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {related.map((candidate) => (
          <ProductCard
            key={candidate.id}
            product={candidate}
            variant="related"
            contextAvailability={availability}
            pairedProductName={candidate.id === pairedProduct.id ? product.name : pairedProduct.name}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <ComboAddToCartButton currentProduct={product} pairedProduct={pairedProduct} />
        <Link
          href="/encargue/combos"
          className="inline-flex items-center rounded-full border border-[rgba(210,138,163,0.42)] bg-[rgba(210,138,163,0.12)] px-4 py-2 text-xs font-medium tracking-[0.2em] text-[#f6dbe4] uppercase transition hover:border-[rgba(210,138,163,0.72)]"
        >
          Ver look completo
        </Link>
      </div>
    </section>
  );
}
