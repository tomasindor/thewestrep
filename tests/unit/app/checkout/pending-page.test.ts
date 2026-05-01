import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

import { getOrderByReference } from "../../../../lib/orders/repository";

test("pending page exists as server component", () => {
  const filePath = path.resolve("./app/(public)/checkout/[reference]/pending/page.tsx");
  assert.ok(fs.existsSync(filePath), "pending page should exist");

  const source = fs.readFileSync(filePath, "utf-8");

  assert.ok(!source.includes('"use client"'), "should NOT be a client component");
  assert.ok(source.includes("export async function generateMetadata"), "should export generateMetadata");
  assert.ok(source.includes("getOrderByReference"), "should fetch order by reference");
  assert.ok(source.includes("notFound()"), "should call notFound when order missing");
  assert.ok(source.includes('redirect(`/checkout/${reference}/confirmed`)'), "should redirect when paid");
  assert.ok(source.includes("buildWhatsappPaymentUrl"), "should build WhatsApp URL");
  assert.ok(source.includes("Pendiente de pago"), "should show pending badge");
});

test("getOrderByReference is exported from repository", () => {
  assert.equal(typeof getOrderByReference, "function");
});
