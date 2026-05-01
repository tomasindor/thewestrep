import assert from "node:assert/strict";
import test from "node:test";

import { createOrdersRouteHandler } from "../../../../lib/orders/orders-route-handler";

function buildV2Payload() {
  return {
    customer: {
      name: "Gonzalo Pérez",
      phone: "+54 9 11 5555 5555",
      email: "gonza@correo.com",
      provinceId: "06",
      provinceName: "Buenos Aires",
      cityId: "06028",
      cityName: "La Matanza",
      address: "Av. Rivadavia 1234",
      recipient: "Gonzalo Pérez",
      notes: "",
    },
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
      },
    ],
    totalAmountArs: 20_000,
  };
}

const mockV2Order = {
  id: "order-v2-1",
  reference: "TWR-2026-V2TEST",
  totalAmountArs: 20_000,
  status: "pending_payment" as const,
};

test("V2 payload creates order with pending_payment and returns orderId + reference", async () => {
  let createV2Called = false;

  const handler = createOrdersRouteHandler({
    consumeRateLimit: async () => null,
    getCustomerSession: async () => null,
    parsePayload: async (request) => {
      const body = await request.json();
      // Simulate the real parsePayload: if provinceId present, validate as V2
      if (body.customer?.provinceId !== undefined) {
        return body as import("../../../../lib/orders/checkout.shared").CheckoutOrderPayloadV2;
      }
      throw new Error("Expected V2 payload");
    },
    createOrderFromCheckout: async () => {
      throw new Error("V1 should not be called for V2");
    },
    createOrderFromCheckoutV2: async () => {
      createV2Called = true;
      return mockV2Order;
    },
    createMercadoPagoCheckoutLink: async () => {
      throw new Error("MP should not be called for V2");
    },
    buildWhatsappUrl: () => "https://wa.me/?text=should-not-be-used",
    logError: () => {},
  });

  const response = await handler(
    new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildV2Payload()),
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(createV2Called, true);
  assert.equal(body.orderId, "order-v2-1");
  assert.equal(body.reference, "TWR-2026-V2TEST");
  assert.equal(body.payment, undefined);
  assert.equal(body.whatsappUrl, undefined);
});

test("V1 payload keeps existing behavior unchanged", async () => {
  const v1Payload = {
    customer: {
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
    },
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
      },
    ],
    totalAmountArs: 26_500,
    paymentMethod: "mercadopago" as const,
  };

  const handler = createOrdersRouteHandler({
    consumeRateLimit: async () => null,
    getCustomerSession: async () => null,
    parsePayload: async () => v1Payload as import("../../../../lib/orders/checkout.shared").CheckoutOrderPayload,
    createOrderFromCheckout: async () => ({
      id: "order-1",
      reference: "TWR-2026-TEST",
      checkoutMode: "guest" as const,
      authProvider: "guest" as const,
      customerAccountId: null,
      totalAmountArs: 26_500,
      paymentMethod: "mercadopago" as const,
      paymentStatus: "pending" as const,
    }),
    createOrderFromCheckoutV2: async () => {
      throw new Error("V2 should not be called for V1");
    },
    createMercadoPagoCheckoutLink: async () => ({
      checkoutUrl: "https://mp.checkout/123",
      externalReference: "TWR-2026-TEST",
      preferenceId: "pref-123",
      provider: "mercadopago",
      sandboxCheckoutUrl: null,
    }),
    buildWhatsappUrl: () => "https://wa.me/?text=fallback",
    logError: () => {},
  });

  const response = await handler(
    new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v1Payload),
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.order.reference, "TWR-2026-TEST");
  assert.equal(body.payment.checkoutUrl, "https://mp.checkout/123");
});
