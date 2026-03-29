"use client";

import { useEffect, useState } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { buildProductWhatsappMessage } from "@/lib/catalog/whatsapp";
import type { CatalogProduct } from "@/lib/catalog/selectors";
import { siteConfig } from "@/lib/site";
import { ghostCtaClassName, solidCtaClassName } from "@/lib/ui";

interface ProductWhatsappCtaProps {
  product: CatalogProduct;
}

function getSizeToneClassName(size: NonNullable<CatalogProduct["sizes"]>[number], isSelected: boolean) {
  const baseClassName = "rounded-[1.25rem] border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200/80";

  if (size.availability === "in-stock") {
    return `${baseClassName} ${isSelected ? "border-emerald-300/60 bg-emerald-500/18 text-emerald-50" : "border-emerald-400/25 bg-emerald-500/12 text-emerald-50"}`;
  }

  if (size.availability === "low-stock") {
    return `${baseClassName} ${isSelected ? "border-amber-200/60 bg-amber-500/18 text-amber-50" : "border-amber-300/30 bg-amber-500/12 text-amber-50"}`;
  }

  if (size.availability === "made-to-order") {
    return `${baseClassName} ${isSelected ? "border-orange-200/60 bg-orange-500/18 text-orange-50" : "border-orange-300/25 bg-orange-500/12 text-orange-50"}`;
  }

  return `${baseClassName} ${isSelected ? "border-white/25 bg-white/10 text-white" : "border-white/12 bg-white/6 text-white/72"}`;
}

export function ProductWhatsappCta({ product }: ProductWhatsappCtaProps) {
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState("");
  const [wasAdded, setWasAdded] = useState(false);

  const requiresSize = Boolean(product.sizes?.length);
  const missingRequiredSelection = requiresSize && !selectedSize;
  const whatsappHref = `${siteConfig.whatsappUrl}${encodeURIComponent(
    buildProductWhatsappMessage({
      productName: product.name,
      availability: product.availability,
      sizeLabel: selectedSize,
    }),
  )}`;

  useEffect(() => {
    if (!wasAdded) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setWasAdded(false);
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [wasAdded]);

  return (
    <div className="space-y-4">
      {product.sizes?.length ? (
        <div className="space-y-2">
          <span className="text-xs font-medium tracking-[0.28em] text-orange-200/70 uppercase">Talle</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {product.sizes.map((size) => {
              const isSelected = selectedSize === size.label;

              return (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => {
                    setSelectedSize((currentValue) => (currentValue === size.label ? "" : size.label));
                  }}
                  className={getSizeToneClassName(size, isSelected)}
                  aria-pressed={isSelected}
                >
                  <span className="flex items-center justify-between gap-3 text-sm font-semibold tracking-[0.18em] uppercase">
                    <span>{size.label}</span>
                    <span aria-hidden="true">{isSelected ? "✓" : "+"}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => {
            addItem({
              productId: product.id,
              productSlug: product.slug,
              productName: product.name,
              availability: product.availability,
              availabilityLabel: product.availabilityLabel,
              priceDisplay: product.pricing.display,
              sizeLabel: selectedSize,
            });
            setWasAdded(true);
          }}
          disabled={missingRequiredSelection}
          className={`${solidCtaClassName} ${missingRequiredSelection ? "cursor-not-allowed opacity-60" : ""}`}
        >
          {wasAdded ? "Agregado al carrito" : "Agregar al carrito"}
        </button>

        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          className={ghostCtaClassName}
        >
          {product.whatsappCtaLabel ?? "Consultar por WhatsApp"}
        </a>
      </div>
    </div>
  );
}
