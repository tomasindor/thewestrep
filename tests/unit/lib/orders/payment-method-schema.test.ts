import assert from "node:assert/strict";
import test from "node:test";

import { checkoutOrderPayloadSchema } from "../../../../lib/orders/checkout.shared";

test("checkoutOrderPayloadSchema accepts mercadopago payment method", () => {
  const payload = checkoutOrderPayloadSchema.parse({
    customer: {
      name: "Gonzalo Pérez",
      phone: "+54 9 11 5555 5555",
      email: "gonza@correo.com",
      cuil: "",
      checkoutMode: "guest",
      authProvider: "",
      preferredChannel: "whatsapp",
      customerStatus: "new",
      deliveryRecipient: "Gonzalo Pérez",
      fulfillment: "envio-caba-gba",
      location: "Palermo, CABA",
      notes: "",
    },
    items: [
      {
        id: "sku-1",
        productId: "sku-1",
        productSlug: "zapatilla-1",
        productName: "Zapatilla 1",
        availability: "stock",
        availabilityLabel: "Stock",
        priceDisplay: "$ 20.000",
        quantity: 1,
      },
    ],
    totalAmountArs: 26_500,
    paymentMethod: "mercadopago",
  });

  assert.equal(payload.paymentMethod, "mercadopago");
});

test("checkoutOrderPayloadSchema accepts whatsapp payment method", () => {
  const payload = checkoutOrderPayloadSchema.parse({
    customer: {
      name: "Gonzalo Pérez",
      phone: "+54 9 11 5555 5555",
      email: "gonza@correo.com",
      cuil: "",
      checkoutMode: "guest",
      authProvider: "",
      preferredChannel: "whatsapp",
      customerStatus: "new",
      deliveryRecipient: "Gonzalo Pérez",
      fulfillment: "envio-caba-gba",
      location: "Palermo, CABA",
      notes: "",
    },
    items: [
      {
        id: "sku-1",
        productId: "sku-1",
        productSlug: "zapatilla-1",
        productName: "Zapatilla 1",
        availability: "stock",
        availabilityLabel: "Stock",
        priceDisplay: "$ 20.000",
        quantity: 1,
      },
    ],
    totalAmountArs: 26_500,
    paymentMethod: "whatsapp",
  });

  assert.equal(payload.paymentMethod, "whatsapp");
});

test("checkoutOrderPayloadSchema works without paymentMethod for backward compatibility", () => {
  const payload = checkoutOrderPayloadSchema.parse({
    customer: {
      name: "Gonzalo Pérez",
      phone: "+54 9 11 5555 5555",
      email: "gonza@correo.com",
      cuil: "",
      checkoutMode: "guest",
      authProvider: "",
      preferredChannel: "whatsapp",
      customerStatus: "new",
      deliveryRecipient: "Gonzalo Pérez",
      fulfillment: "envio-caba-gba",
      location: "Palermo, CABA",
      notes: "",
    },
    items: [
      {
        id: "sku-1",
        productId: "sku-1",
        productSlug: "zapatilla-1",
        productName: "Zapatilla 1",
        availability: "stock",
        availabilityLabel: "Stock",
        priceDisplay: "$ 20.000",
        quantity: 1,
      },
    ],
  });

  assert.equal(payload.paymentMethod, undefined);
});
