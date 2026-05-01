import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

test("PaymentButtons exists as client component", () => {
  const filePath = path.resolve("./components/checkout/payment-buttons.tsx");
  assert.ok(fs.existsSync(filePath), "payment-buttons.tsx should exist");

  const source = fs.readFileSync(filePath, "utf-8");

  assert.ok(source.includes('"use client"'), "should be a client component");
  assert.ok(source.includes("export function PaymentButtons"), "should export PaymentButtons");
  assert.ok(source.includes("/api/orders/"), "should call /api/orders/[id]/pay");
  assert.ok(source.includes('method: "mercadopago"'), "should pass method mercadopago");
  assert.ok(source.includes("window.location.href"), "should redirect to checkoutUrl");
});

test("pending page imports PaymentButtons", () => {
  const filePath = path.resolve("./app/(public)/checkout/[reference]/pending/page.tsx");
  const source = fs.readFileSync(filePath, "utf-8");

  assert.ok(source.includes("PaymentButtons"), "should use PaymentButtons");
});
