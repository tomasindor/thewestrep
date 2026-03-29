import { editableCatalogInventorySource } from "@/lib/catalog/data/inventory-editable";
import type { CommercialAvailabilityMeta } from "@/lib/catalog/availability";
import type { EditableInventoryProduct, Product, ProductAvailabilityInfo } from "@/lib/catalog/types";

export function buildEditableCommercialAvailabilityBySlug(
  editableProducts: readonly EditableInventoryProduct[] = editableCatalogInventorySource.products,
) {
  return new Map<string, CommercialAvailabilityMeta>(
    editableProducts.map((product) => [
      product.slug,
      {
        summary: product.availabilitySummary,
        leadTime: product.leadTime,
        stockNote: product.stockNote,
      },
    ]),
  );
}

export function enrichCommercialAvailabilityInfo(
  product: Pick<Product, "slug" | "availability">,
  fallbackAvailabilityInfo: ProductAvailabilityInfo,
  commercialAvailabilityBySlug = buildEditableCommercialAvailabilityBySlug(),
): ProductAvailabilityInfo {
  if (product.availability !== "encargue") {
    return fallbackAvailabilityInfo;
  }

  const editableCommercialAvailability = commercialAvailabilityBySlug.get(product.slug);

  if (!editableCommercialAvailability) {
    return fallbackAvailabilityInfo;
  }

  return {
    summary: editableCommercialAvailability.summary || fallbackAvailabilityInfo.summary,
    leadTime: editableCommercialAvailability.leadTime,
    stockNote: editableCommercialAvailability.stockNote,
  };
}
