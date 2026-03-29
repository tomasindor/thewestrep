import type { ProductAvailability, ProductAvailabilityInfo } from "@/lib/catalog/types";

export interface CommercialAvailabilityMeta {
  summary: string;
  leadTime?: string;
  stockNote?: string;
}

export function getPrimaryAvailabilityCopy(
  availability: ProductAvailability,
  availabilityInfo: ProductAvailabilityInfo,
) {
  if (availability === "stock") {
    return availabilityInfo.stockNote ?? availabilityInfo.summary;
  }

  return availabilityInfo.leadTime ? `Arribo estimado de ${availabilityInfo.leadTime}.` : availabilityInfo.summary;
}

export function getAvailabilitySupportCopy(availabilityInfo: ProductAvailabilityInfo) {
  return availabilityInfo.stockNote ?? availabilityInfo.summary;
}
