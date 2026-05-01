import assert from "node:assert/strict";
import test from "node:test";

import { buildOrderWhatsappMessage } from "../../../../lib/cart/whatsapp";

test("buildOrderWhatsappMessage includes order reference and total", () => {
  const order = {
    reference: "TWR-2026-A1B2C3D4",
    totalAmountArs: 69_100,
    items: [
      {
        id: "sku-1",
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
      {
        id: "sku-2",
        productId: "sku-2",
        productSlug: "buzo-2",
        productName: "Buzo 2",
        availability: "encargue" as const,
        availabilityLabel: "Encargue",
        priceDisplay: "$ 15.000",
        quantity: 1,
      },
    ],
  };

  const customer = {
    name: "Gonzalo Pérez",
    phone: "+54 9 11 5555 5555",
    email: "gonza@correo.com",
    cuil: "",
    checkoutMode: "guest" as const,
    authProvider: "" as const,
    preferredChannel: "whatsapp" as const,
    customerStatus: "new" as const,
    deliveryRecipient: "Gonzalo Pérez",
    fulfillment: "envio-caba-gba" as const,
    location: "Palermo, CABA",
    notes: "",
  };

  const message = buildOrderWhatsappMessage(order, customer);

  assert.ok(message.includes("TWR-2026-A1B2C3D4"), "should include order reference");
  assert.ok(message.includes("69.100"), "should include formatted total");
  assert.ok(message.includes("Zapatilla 1"), "should include item names");
  assert.ok(message.includes("Buzo 2"), "should include all items");
});

test("buildOrderWhatsappMessage formats items with variants and sizes", () => {
  const order = {
    reference: "TWR-2026-XXXX",
    totalAmountArs: 20_000,
    items: [
      {
        id: "sku-1",
        productId: "sku-1",
        productSlug: "zapatilla-1",
        productName: "Zapatilla 1",
        availability: "stock" as const,
        availabilityLabel: "Stock",
        priceDisplay: "$ 20.000",
        quantity: 1,
        variantLabel: "Rojo",
        sizeLabel: "42",
      },
    ],
  };

  const customer = {
    name: "Gonzalo Pérez",
    phone: "+54 9 11 5555 5555",
    email: "gonza@correo.com",
    cuil: "",
    checkoutMode: "guest" as const,
    authProvider: "" as const,
    preferredChannel: "whatsapp" as const,
    customerStatus: "new" as const,
    deliveryRecipient: "Gonzalo Pérez",
    fulfillment: "envio-caba-gba" as const,
    location: "Palermo, CABA",
    notes: "",
  };

  const message = buildOrderWhatsappMessage(order, customer);

  assert.ok(message.includes("Rojo"), "should include variant");
  assert.ok(message.includes("42"), "should include size");
});
