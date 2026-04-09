"use client";

import { useEffect, useState } from "react";

import { useCart } from "@/components/cart/cart-provider";

import type { CatalogProduct } from "@/lib/catalog/models";
import type { ProductSize } from "@/lib/catalog/types";
import { siteConfig } from "@/lib/site";
import { solidCtaClassName } from "@/lib/ui";

interface ProductWhatsappCtaProps {
  product: CatalogProduct;
  visibleVariants: string[];
}

function getOptionChipClassName({
  isSelected,
  isDisabled = false,
}: {
  isSelected: boolean;
  isDisabled?: boolean;
}) {
  const baseClassName =
    "group inline-flex min-h-[2.9rem] items-center justify-center rounded-full border px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.16em] uppercase transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(210,138,163,0.7)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06070b] sm:text-xs";

  if (isDisabled) {
    return `${baseClassName} cursor-not-allowed border-white/8 bg-white/[0.02] text-white/30`;
  }

  if (isSelected) {
    return `${baseClassName} border-[rgba(210,138,163,0.7)] bg-[linear-gradient(180deg,rgba(210,138,163,0.18),rgba(210,138,163,0.08)),rgba(255,255,255,0.03)] text-white shadow-[0_14px_32px_rgba(210,138,163,0.12)] ring-1 ring-[rgba(210,138,163,0.22)]`;
  }

  return `${baseClassName} border-white/10 bg-white/[0.03] text-white/80 hover:border-white/24 hover:bg-white/[0.06] hover:text-white`;
}

function getSizeStatusLabel(size: ProductSize) {
  if (size.availability === "in-stock") {
    return null;
  }

  if (size.availability === "low-stock") {
    return "Últimas unidades";
  }

  if (size.availability === "made-to-order") {
    return null;
  }

  return "Sin stock";
}

function normalizeProductCode(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function getProductCode(product: CatalogProduct) {
  return normalizeProductCode(product.sku) ?? normalizeProductCode(product.slug) ?? product.id;
}

function buildSizeGuideWhatsappMessage(product: CatalogProduct, variantLabel?: string, sizeLabel?: string) {
  const productCode = getProductCode(product);
  const normalizedVariant = variantLabel?.trim();
  const normalizedSize = sizeLabel?.trim();
  const variantDetail = normalizedVariant ? ` Variante: ${normalizedVariant}.` : "";
  const sizeDetail = normalizedSize ? ` Talle de referencia: ${normalizedSize}.` : "";

  return `Hola, quiero consultar las medidas de ${product.name}. Código: ${productCode}.${variantDetail}${sizeDetail}`;
}

export function ProductWhatsappCta({ product, visibleVariants }: ProductWhatsappCtaProps) {
  const { addItem } = useCart();
  const [selectedVariant, setSelectedVariant] = useState(() => (visibleVariants.length === 1 ? visibleVariants[0] : ""));
  const [selectedSize, setSelectedSize] = useState("");
  const [showSelectionHint, setShowSelectionHint] = useState(false);
  const [wasAdded, setWasAdded] = useState(false);

  const hasSizes = Boolean(product.sizes?.length);
  const requiresSize = hasSizes;
  const singleVisibleVariant = visibleVariants.length === 1 ? visibleVariants[0] : "";
  const hasMultipleSelectableVariants = visibleVariants.length > 1;
  const effectiveSelectedVariant = singleVisibleVariant || (visibleVariants.includes(selectedVariant) ? selectedVariant : "");
  const requiresVariant = hasMultipleSelectableVariants;
  const missingVariantSelection = requiresVariant && !effectiveSelectedVariant;
  const missingSizeSelection = requiresSize && !selectedSize;
  const missingRequiredSelection = missingVariantSelection || missingSizeSelection;
  const sizeGuideWhatsappHref = `${siteConfig.whatsappUrl}${encodeURIComponent(
    buildSizeGuideWhatsappMessage(product, effectiveSelectedVariant, selectedSize),
  )}`;
  const coverImage = product.gallery.find((image) => image.role === "cover") ?? product.gallery[0];

  const selectionHelperCopy = missingRequiredSelection
    ? [missingVariantSelection ? "elegí la variante" : null, missingSizeSelection ? "seleccioná el talle" : null]
        .filter(Boolean)
        .join(" y ")
    : null;

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
      {hasMultipleSelectableVariants ? (
        <section className="space-y-2 border-t border-white/8 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[11px] font-medium tracking-[0.24em] text-white/55 uppercase">Variantes</p>
              <p className="text-sm text-slate-300">Elegí la variante para confirmar exactamente la configuración que querés sumar.</p>
            </div>
            {effectiveSelectedVariant ? (
              <span className="rounded-full border border-[rgba(210,138,163,0.24)] bg-[rgba(210,138,163,0.1)] px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-[#f6dbe4] uppercase">
                {effectiveSelectedVariant}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2.5">
            {visibleVariants.map((variantLabel) => {
              const isSelected = selectedVariant === variantLabel;

              return (
                <button
                  key={variantLabel}
                  type="button"
                  onClick={() => {
                    setSelectedVariant((currentValue) => (currentValue === variantLabel ? "" : variantLabel));
                    setShowSelectionHint(false);
                  }}
                  className={getOptionChipClassName({ isSelected })}
                  aria-pressed={isSelected}
                >
                  <span className="flex items-center gap-2">
                    <span>{variantLabel}</span>
                    <span
                      aria-hidden="true"
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                        isSelected ? "border-[rgba(210,138,163,0.46)] bg-[rgba(210,138,163,0.16)] text-[#f6dbe4]" : "border-white/12 text-current/70"
                      }`}
                    >
                      {isSelected ? "✓" : "+"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {showSelectionHint && missingVariantSelection ? (
            <p className="text-xs leading-5 text-[#f4d7e0]/90">Seleccioná una variante para habilitar el agregado al carrito.</p>
          ) : null}
        </section>
      ) : null}

      {hasSizes ? (
        <section className="space-y-2.5 border-t border-white/8 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <p className="text-[11px] font-medium tracking-[0.24em] text-white/55 uppercase">Talles</p>
                <a
                  href={sizeGuideWhatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-[rgba(210,138,163,0.26)] bg-[rgba(210,138,163,0.1)] px-3.5 py-2 text-[11px] font-medium tracking-[0.22em] text-[#f6dbe4] uppercase transition hover:border-[rgba(210,138,163,0.56)] hover:bg-[rgba(210,138,163,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(210,138,163,0.75)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06070b]"
                >
                  Consultar medidas
                </a>
              </div>
              <p className="text-sm text-slate-300">Seleccioná tu talle antes de sumar el producto al carrito.</p>
            </div>
            {selectedSize ? (
              <span className="rounded-full border border-[rgba(210,138,163,0.24)] bg-[rgba(210,138,163,0.1)] px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-[#f6dbe4] uppercase">
                {selectedSize}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2.5">
            {product.sizes?.map((size) => {
              const isSelected = selectedSize === size.label;
              const isDisabled = size.availability === "sold-out";
              const statusLabel = getSizeStatusLabel(size);

              return (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => {
                    if (isDisabled) {
                      return;
                    }

                    setSelectedSize((currentValue) => (currentValue === size.label ? "" : size.label));
                    setShowSelectionHint(false);
                  }}
                  disabled={isDisabled}
                  className={getOptionChipClassName({ isSelected, isDisabled })}
                  aria-pressed={isSelected}
                >
                  <span className="flex w-full items-center justify-between gap-3">
                    <span className="flex items-center gap-2.5">
                      <span className="text-sm font-semibold tracking-[0.18em] uppercase">{size.label}</span>
                      {statusLabel ? (
                        <span className="text-[10px] tracking-[0.14em] text-current/72 uppercase">{statusLabel}</span>
                      ) : null}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                        isDisabled
                          ? "border-white/10 text-white/25"
                          : isSelected
                            ? "border-[rgba(210,138,163,0.46)] bg-[rgba(210,138,163,0.16)] text-[#f6dbe4]"
                            : "border-white/12 text-current/70"
                      }`}
                    >
                      {isDisabled ? "×" : isSelected ? "✓" : "+"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {showSelectionHint && missingSizeSelection ? (
            <p className="text-xs leading-5 text-[#f4d7e0]/90">Seleccioná un talle antes de continuar.</p>
          ) : null}
        </section>
      ) : null}

      <div className="sticky bottom-3 z-10 -mx-1 rounded-[1.55rem] border border-white/10 bg-[#080a0f]/88 p-1.5 shadow-[0_20px_48px_rgba(0,0,0,0.34)] backdrop-blur sm:mx-0 sm:p-2 lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
        <div className="flex flex-col gap-3 rounded-[1.35rem] lg:rounded-none">
          <button
            type="button"
            onClick={() => {
              if (missingRequiredSelection) {
                setShowSelectionHint(true);
                return;
              }

              addItem({
                productId: product.id,
                productSlug: product.slug,
                productName: product.name,
                productImage: coverImage
                  ? {
                      src: coverImage.src,
                      alt: coverImage.alt,
                      provider: coverImage.provider,
                      assetKey: coverImage.assetKey,
                      cloudName: coverImage.cloudName,
                    }
                  : undefined,
                availability: product.availability,
                availabilityLabel: product.availabilityLabel,
                priceDisplay: product.pricing.display,
                variantLabel: effectiveSelectedVariant,
                sizeLabel: selectedSize,
              });
              setWasAdded(true);
              setShowSelectionHint(false);
            }}
            className={`${solidCtaClassName} min-h-[4.15rem] w-full rounded-[1.2rem] text-base shadow-[0_20px_54px_rgba(0,0,0,0.34)] ${
              missingRequiredSelection
                ? "cursor-not-allowed border-white/14 bg-[linear-gradient(180deg,rgba(13,15,22,0.98),rgba(5,6,10,0.98))] text-white/55 hover:translate-y-0 hover:border-white/14 hover:bg-[linear-gradient(180deg,rgba(13,15,22,0.98),rgba(5,6,10,0.98))]"
                : "border-[rgba(210,138,163,0.42)] bg-[linear-gradient(180deg,rgba(210,138,163,0.22),rgba(210,138,163,0.1)),linear-gradient(180deg,rgba(13,15,22,0.98),rgba(5,6,10,0.98))] hover:border-[rgba(210,138,163,0.7)]"
             }`}
            aria-disabled={missingRequiredSelection}
          >
            {wasAdded ? "Agregado al carrito" : missingRequiredSelection ? "Completá tu selección" : "Agregar al carrito"}
          </button>

          <p className={`text-xs leading-5 ${missingRequiredSelection ? "text-slate-300" : "text-slate-400"}`}>
            {missingRequiredSelection && selectionHelperCopy
              ? `Para continuar, ${selectionHelperCopy}.`
              : "Sumalo al carrito y seguí armando el pedido desde el checkout cuando quieras."}
          </p>
        </div>
      </div>

    </div>
  );
}
