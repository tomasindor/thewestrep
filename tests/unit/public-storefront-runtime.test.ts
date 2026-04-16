import test from "node:test";
import assert from "node:assert/strict";

import { getAvailabilitySupportCopy, getPrimaryAvailabilityCopy } from "../../lib/catalog/availability";
import {
  buildEditableCommercialAvailabilityBySlug,
  enrichCommercialAvailabilityInfo,
} from "../../lib/catalog/commercial-availability";
import type { EditableInventoryProduct, ProductAvailabilityInfo } from "../../lib/catalog/types";

function createEditableProduct(overrides: Partial<EditableInventoryProduct>): EditableInventoryProduct {
  return {
    slug: "sample-product",
    sku: "SKU-001",
    name: "Sample Product",
    brand: "bape",
    category: "hoodies",
    availability: "encargue",
    priceUsd: 100,
    detail: "Producto de prueba.",
    note: "Nota de prueba",
    availabilitySummary: "Resumen de prueba",
    coverImage: "/demo-hoodie.svg",
    coverAlt: "Producto de prueba",
    ...overrides,
  };
}

test("preserves editable leadTime and stockNote for matching encargue slugs", () => {
  const commercialAvailabilityBySlug = buildEditableCommercialAvailabilityBySlug([
    createEditableProduct({
      slug: "sample-encargue-product",
      availabilitySummary: "Arribo estimado 40-60 días",
      leadTime: "40-60 días",
      stockNote: "Confirmación de talle y color antes de cerrar.",
    }),
  ]);

  const fallbackAvailabilityInfo: ProductAvailabilityInfo = {
    summary: "Cotización por encargue con WhatsApp como canal principal.",
  };

  const availabilityInfo = enrichCommercialAvailabilityInfo(
    { slug: "sample-encargue-product", availability: "encargue" },
    fallbackAvailabilityInfo,
    commercialAvailabilityBySlug,
  );

  assert.deepEqual(availabilityInfo, {
    summary: "Arribo estimado 40-60 días",
    leadTime: "40-60 días",
    stockNote: "Confirmación de talle y color antes de cerrar.",
  });
  assert.equal(getPrimaryAvailabilityCopy("encargue", availabilityInfo), "Arribo estimado de 40-60 días.");
  assert.equal(getAvailabilitySupportCopy(availabilityInfo), "Confirmación de talle y color antes de cerrar.");
});

test("keeps fallback copy when encargue slug has no editable commercial metadata", () => {
  const fallbackAvailabilityInfo: ProductAvailabilityInfo = {
    summary: "Cotización por encargue con WhatsApp como canal principal.",
  };

  const availabilityInfo = enrichCommercialAvailabilityInfo(
    { slug: "missing-slug", availability: "encargue" },
    fallbackAvailabilityInfo,
    new Map(),
  );

  assert.deepEqual(availabilityInfo, fallbackAvailabilityInfo);
  assert.equal(
    getPrimaryAvailabilityCopy("encargue", availabilityInfo),
    "Cotización por encargue con WhatsApp como canal principal.",
  );
  assert.equal(
    getAvailabilitySupportCopy(availabilityInfo),
    "Cotización por encargue con WhatsApp como canal principal.",
  );
});
