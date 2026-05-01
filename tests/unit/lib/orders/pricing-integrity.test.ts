import assert from "node:assert/strict";
import test from "node:test";

import {
  validatePricingIntegrity,
} from "../../../../lib/orders/checkout.server";

import { checkoutOrderPayloadSchema } from "../../../../lib/orders/checkout.shared";

const basePayload = {
  customer: {
    name: "Gonzalo Pérez",
    phone: "+54 9 11 5555 5555",
    email: "gonza@correo.com",
    cuil: "20-12345678-3",
    checkoutMode: "guest" as const,
    authProvider: "" as const,
    preferredChannel: "whatsapp" as const,
    customerStatus: "new" as const,
    deliveryRecipient: "Gonzalo Pérez",
    fulfillment: "envio-caba-gba" as const,
    location: "Palermo, CABA",
    notes: "Tocar timbre dos veces",
  },
  items: [
    {
      id: "sku-1::rojo::42",
      productId: "sku-1",
      productSlug: "zapatilla-1",
      productName: "Zapatilla 1",
      availability: "stock" as const,
      availabilityLabel: "Stock",
      priceDisplay: "$ 20.000",
      quantity: 2,
      variantLabel: "Rojo",
      sizeLabel: "42",
    },
  ],
  totalAmountArs: 46_500,
};

test("validatePricingIntegrity: matching prices allow order creation", () => {
  const payload = checkoutOrderPayloadSchema.parse(basePayload);
  const serverTotal = 46_500;

  const result = validatePricingIntegrity(payload, serverTotal);

  assert.equal(result, true);
});

test("validatePricingIntegrity: mismatched prices reject with server total", () => {
  const payload = checkoutOrderPayloadSchema.parse(basePayload);
  const serverTotal = 45_000;

  const result = validatePricingIntegrity(payload, serverTotal);

  assert.equal(result, false);
});

test("validatePricingIntegrity: higher server total rejects", () => {
  const payload = checkoutOrderPayloadSchema.parse(basePayload);
  const serverTotal = 50_000;

  const result = validatePricingIntegrity(payload, serverTotal);

  assert.equal(result, false);
});
