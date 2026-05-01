import assert from "node:assert/strict";
import test from "node:test";

import { createOrdersRouteHandler } from "../../../../lib/orders/orders-route-handler";

function buildPayload(paymentMethod: "mercadopago" | "whatsapp") {
  return {
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
    paymentMethod,
  };
}

const mockOrder = {
  id: "order-1",
  reference: "TWR-2026-TEST",
  checkoutMode: "guest" as const,
  authProvider: "guest" as const,
  customerAccountId: null,
  totalAmountArs: 26_500,
  paymentMethod: "mercadopago" as const,
  paymentStatus: "pending" as const,
};

test("MP success returns checkout URL and WhatsApp fallback", async () => {
  const handler = createOrdersRouteHandler({
    consumeRateLimit: async () => null,
    getCustomerSession: async () => null,
    parsePayload: async () => buildPayload("mercadopago"),
    createOrderFromCheckout: async () => mockOrder,
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

  const response = await handler(new Request("http://localhost/api/orders", { method: "POST" }));
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.payment.checkoutUrl, "https://mp.checkout/123");
  assert.equal(body.whatsappUrl, "https://wa.me/?text=fallback");
  assert.equal(body.paymentError, null);
});

test("MP failure preserves order and returns WhatsApp fallback URL", async () => {
  const handler = createOrdersRouteHandler({
    consumeRateLimit: async () => null,
    getCustomerSession: async () => null,
    parsePayload: async () => buildPayload("mercadopago"),
    createOrderFromCheckout: async () => mockOrder,
    createMercadoPagoCheckoutLink: async () => {
      throw new Error("MP down");
    },
    buildWhatsappUrl: () => "https://wa.me/?text=order-fallback",
    logError: () => {},
  });

  const response = await handler(new Request("http://localhost/api/orders", { method: "POST" }));
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.order.reference, "TWR-2026-TEST");
  assert.equal(body.payment, null);
  assert.ok(body.paymentError.includes("Mercado Pago"));
  assert.equal(body.whatsappUrl, "https://wa.me/?text=order-fallback");
});

test("WhatsApp payment method returns WhatsApp URL directly", async () => {
  const whatsappOrder = { ...mockOrder, paymentMethod: "whatsapp" as const, paymentStatus: "awaiting_transfer" as const };
  const handler = createOrdersRouteHandler({
    consumeRateLimit: async () => null,
    getCustomerSession: async () => null,
    parsePayload: async () => buildPayload("whatsapp"),
    createOrderFromCheckout: async () => whatsappOrder,
    createMercadoPagoCheckoutLink: async () => {
      throw new Error("should not be called");
    },
    buildWhatsappUrl: () => "https://wa.me/?text=direct-whatsapp",
    logError: () => {},
  });

  const response = await handler(new Request("http://localhost/api/orders", { method: "POST" }));
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.payment, null);
  assert.equal(body.whatsappUrl, "https://wa.me/?text=direct-whatsapp");
  assert.equal(body.paymentError, null);
});
