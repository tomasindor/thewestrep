"use client";

import { useEffect } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { trackComboEvent } from "@/lib/analytics/combo-events";
import type { CatalogProduct } from "@/lib/catalog";
import { solidCtaClassName } from "@/lib/ui";

interface ComboAddToCartButtonProps {
  currentProduct: CatalogProduct;
  pairedProduct: CatalogProduct;
}

function getCoverImage(product: CatalogProduct) {
  return product.gallery.find((image) => image.role === "cover") ?? product.gallery[0];
}

export function ComboAddToCartButton({ currentProduct, pairedProduct }: ComboAddToCartButtonProps) {
  const { addItem } = useCart();

  useEffect(() => {
    trackComboEvent("combo_view", {
      comboGroup: currentProduct.comboGroup,
      productId: currentProduct.id,
      pairedProductId: pairedProduct.id,
    });
  }, [currentProduct.comboGroup, currentProduct.id, pairedProduct.id]);

  return (
    <button
      type="button"
      className={solidCtaClassName}
      onClick={() => {
        const currentImage = getCoverImage(currentProduct);
        const pairedImage = getCoverImage(pairedProduct);

        addItem({
          productId: currentProduct.id,
          productSlug: currentProduct.slug,
          productName: currentProduct.name,
          productImage: currentImage
            ? {
                src: currentImage.src,
                alt: currentImage.alt,
                provider: currentImage.provider,
                assetKey: currentImage.assetKey,
                cloudName: currentImage.cloudName,
              }
            : undefined,
          availability: currentProduct.availability,
          availabilityLabel: currentProduct.availabilityLabel,
          categorySlug: currentProduct.category.slug,
          priceDisplay: currentProduct.pricing.display,
          comboEligible: currentProduct.comboEligible,
          comboGroup: currentProduct.comboGroup,
          comboPriority: currentProduct.comboPriority,
          comboSourceKey: currentProduct.comboSourceKey,
          comboScore: currentProduct.comboScore,
        });

        addItem({
          productId: pairedProduct.id,
          productSlug: pairedProduct.slug,
          productName: pairedProduct.name,
          productImage: pairedImage
            ? {
                src: pairedImage.src,
                alt: pairedImage.alt,
                provider: pairedImage.provider,
                assetKey: pairedImage.assetKey,
                cloudName: pairedImage.cloudName,
              }
            : undefined,
          availability: pairedProduct.availability,
          availabilityLabel: pairedProduct.availabilityLabel,
          categorySlug: pairedProduct.category.slug,
          priceDisplay: pairedProduct.pricing.display,
          comboEligible: pairedProduct.comboEligible,
          comboGroup: pairedProduct.comboGroup,
          comboPriority: pairedProduct.comboPriority,
          comboSourceKey: pairedProduct.comboSourceKey,
          comboScore: pairedProduct.comboScore,
        });

        trackComboEvent("combo_add_to_cart", {
          comboGroup: currentProduct.comboGroup,
          productId: currentProduct.id,
          pairedProductId: pairedProduct.id,
        });
      }}
    >
      Agregar ambos al carrito
    </button>
  );
}
