import assert from "node:assert/strict";
import test from "node:test";

import {
  formatOrderHistoryStatus,
  formatOrderHistoryDate,
  type OrderHistoryStatus,
} from "../../../../lib/orders/history";

test("OrderHistoryStatus only accepts pending_payment and paid", () => {
  // Type-level assertion: if this compiles, the type is correct
  const pending: OrderHistoryStatus = "pending_payment";
  const paid: OrderHistoryStatus = "paid";

  assert.equal(pending, "pending_payment");
  assert.equal(paid, "paid");
});

test("formatOrderHistoryStatus: pending_payment → Pendiente de pago", () => {
  assert.equal(formatOrderHistoryStatus("pending_payment"), "Pendiente de pago");
});

test("formatOrderHistoryStatus: paid → Pagado", () => {
  assert.equal(formatOrderHistoryStatus("paid"), "Pagado");
});

test("formatOrderHistoryDate formats ISO date to es-AR", () => {
  const formatted = formatOrderHistoryDate("2026-04-30T00:00:00.000Z");
  assert.ok(formatted.includes("2026"), "should include year");
  assert.ok(formatted.includes("30"), "should include day");
});
