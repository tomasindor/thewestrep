import assert from "node:assert/strict";
import test from "node:test";

import { createPayRouteHandler } from "../../../../lib/payments/pay-route-handler";

const mockOrder = {
  id: "order-1",
  reference: "TWR-2026-TEST",
  status: "pending_payment",
  totalAmountArs: 20_000,
  contactName: "Test User",
  contactEmail: "test@example.com",
};

const mockPaidOrder = {
  id: "order-2",
  reference: "TWR-2026-PAID",
  status: "paid",
  totalAmountArs: 20_000,
  contactName: "Paid User",
  contactEmail: "paid@example.com",
};

test("mercadopago method returns checkout URL for pending order", async () => {
  const handler = createPayRouteHandler({
    getOrderById: async () => mockOrder,
    createMercadoPagoCheckoutLinkForOrder: async () => ({
      checkoutUrl: "https://mp.checkout/123",
      externalReference: "TWR-2026-TEST",
      preferenceId: "pref-123",
      provider: "mercadopago",
      sandboxCheckoutUrl: null,
    }),
    buildWhatsappPaymentUrl: () => "https://wa.me/?text=test",
  });

  const response = await handler(
    new Request("http://localhost/api/orders/order-1/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "mercadopago" }),
    }),
    { params: Promise.resolve({ id: "order-1" }) },
  );

  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.checkoutUrl, "https://mp.checkout/123");
});

test("whatsapp method returns whatsapp URL for pending order", async () => {
  const handler = createPayRouteHandler({
    getOrderById: async () => mockOrder,
    createMercadoPagoCheckoutLinkForOrder: async () => {
      throw new Error("should not be called");
    },
    buildWhatsappPaymentUrl: ({ reference, totalAmountArs }) =>
      `https://wa.me/?text=Pedido ${reference} - $${totalAmountArs}`,
  });

  const response = await handler(
    new Request("http://localhost/api/orders/order-1/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "whatsapp" }),
    }),
    { params: Promise.resolve({ id: "order-1" }) },
  );

  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.whatsappUrl, "https://wa.me/?text=Pedido TWR-2026-TEST - $20000");
});

test("returns 404 when order not found", async () => {
  const handler = createPayRouteHandler({
    getOrderById: async () => null,
    createMercadoPagoCheckoutLinkForOrder: async () => {
      throw new Error("should not be called");
    },
    buildWhatsappPaymentUrl: () => "",
  });

  const response = await handler(
    new Request("http://localhost/api/orders/missing/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "mercadopago" }),
    }),
    { params: Promise.resolve({ id: "missing" }) },
  );

  assert.equal(response.status, 404);
});

test("returns already_paid error when order is paid", async () => {
  const handler = createPayRouteHandler({
    getOrderById: async () => mockPaidOrder,
    createMercadoPagoCheckoutLinkForOrder: async () => {
      throw new Error("should not be called");
    },
    buildWhatsappPaymentUrl: () => "",
  });

  const response = await handler(
    new Request("http://localhost/api/orders/order-2/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "mercadopago" }),
    }),
    { params: Promise.resolve({ id: "order-2" }) },
  );

  const body = await response.json();
  assert.equal(response.status, 409);
  assert.equal(body.error, "already_paid");
});

test("returns 400 for invalid method", async () => {
  const handler = createPayRouteHandler({
    getOrderById: async () => mockOrder,
    createMercadoPagoCheckoutLinkForOrder: async () => ({
      checkoutUrl: "https://mp.checkout/fallback",
      externalReference: "TWR-2026-TEST",
      preferenceId: "pref-fallback",
      provider: "mercadopago",
      sandboxCheckoutUrl: null,
    }),
    buildWhatsappPaymentUrl: () => "",
  });

  const response = await handler(
    new Request("http://localhost/api/orders/order-1/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "invalid" }),
    }),
    { params: Promise.resolve({ id: "order-1" }) },
  );

  assert.equal(response.status, 400);
});
