import assert from "node:assert/strict";
import test from "node:test";

import { createOrdersRouteHandler } from "../../lib/orders/orders-route-handler";

const guestPayload = {
  customer: {
    name: "Guest Customer",
    phone: "+54 9 11 5555 5555",
    email: "guest@example.com",
    cuil: "20-12345678-3",
    checkoutMode: "guest" as const,
    authProvider: "" as const,
    preferredChannel: "whatsapp" as const,
    customerStatus: "new" as const,
    deliveryRecipient: "Guest Customer",
    fulfillment: "envio-caba-gba" as const,
    location: "Palermo, CABA",
    notes: "timbre",
  },
  items: [
    {
      id: "sku-1::negro::m",
      productId: "sku-1",
      productSlug: "buzo-1",
      productName: "Buzo 1",
      availability: "stock" as const,
      availabilityLabel: "Stock",
      priceDisplay: "$ 20.000",
      quantity: 1,
    },
  ],
};

test("orders route allows guest checkout without requiring any session", async () => {
  let createOrderSessionIdentity: unknown = "not-called";

  const handler = createOrdersRouteHandler({
    consumeRateLimit: async () => null,
    getCustomerSession: async () => null,
    createOrderFromCheckout: async (_payload, sessionIdentity) => {
      createOrderSessionIdentity = sessionIdentity;
      return {
        id: "order-1",
        reference: "TWR-2026-ABCDEF12",
        authProvider: "guest",
        checkoutMode: "guest",
        customerAccountId: null,
        totalAmountArs: 20_000,
        paymentMethod: "whatsapp",
        paymentStatus: "pending",
      };
    },
    createMercadoPagoCheckoutLink: async () => ({ initPoint: "https://mp.test/checkout" }),
  });

  const response = await handler(
    new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(guestPayload),
    }),
  );

  assert.equal(response.status, 201);
  assert.equal(createOrderSessionIdentity, null);
});

test("orders route blocks account checkout when session is missing", async () => {
  const handler = createOrdersRouteHandler({
    consumeRateLimit: async () => null,
    getCustomerSession: async () => null,
    createOrderFromCheckout: async () => {
      throw new Error("should not create account orders without a session");
    },
  });

  const response = await handler(
    new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...guestPayload,
        customer: {
          ...guestPayload.customer,
          checkoutMode: "account",
          authProvider: "credentials",
        },
      }),
    }),
  );

  assert.equal(response.status, 401);
  const payload = (await response.json()) as { error?: string };
  assert.match(payload.error ?? "", /iniciar sesión/i);
});
