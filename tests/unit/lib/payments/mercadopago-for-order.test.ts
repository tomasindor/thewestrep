import assert from "node:assert/strict";
import test from "node:test";

import { createMercadoPagoCheckoutLinkForOrder } from "../../../../lib/payments/mercadopago";

test("createMercadoPagoCheckoutLinkForOrder is exported", () => {
  assert.equal(typeof createMercadoPagoCheckoutLinkForOrder, "function");
});

test("createMercadoPagoCheckoutLinkForOrder returns null when MP is disabled", async () => {
  const originalEnv = process.env.MERCADOPAGO_ACCESS_TOKEN;
  delete process.env.MERCADOPAGO_ACCESS_TOKEN;

  const result = await createMercadoPagoCheckoutLinkForOrder({
    reference: "TWR-2026-TEST",
    totalAmountArs: 20_000,
    contactName: "Gonzalo Pérez",
    contactEmail: "gonza@correo.com",
  });

  assert.equal(result, null);

  if (originalEnv !== undefined) {
    process.env.MERCADOPAGO_ACCESS_TOKEN = originalEnv;
  }
});
