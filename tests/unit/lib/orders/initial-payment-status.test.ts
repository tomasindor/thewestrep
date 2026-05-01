import assert from "node:assert/strict";
import test from "node:test";

import { resolveInitialPaymentStatus } from "../../../../lib/orders/checkout.server";

test("resolveInitialPaymentStatus: mercadopago → pending", () => {
  assert.equal(resolveInitialPaymentStatus("mercadopago"), "pending");
});

test("resolveInitialPaymentStatus: whatsapp → awaiting_transfer", () => {
  assert.equal(resolveInitialPaymentStatus("whatsapp"), "awaiting_transfer");
});

test("resolveInitialPaymentStatus: undefined defaults to pending", () => {
  assert.equal(resolveInitialPaymentStatus(undefined), "pending");
});
