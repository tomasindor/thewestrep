import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

test("checkout page renders CheckoutExperienceV2 with provinces", () => {
  const filePath = path.resolve("./app/(public)/checkout/page.tsx");
  const source = fs.readFileSync(filePath, "utf-8");

  assert.ok(source.includes("CheckoutExperienceV2"), "should import CheckoutExperienceV2");
  assert.ok(source.includes("fetchProvincias"), "should fetch provinces server-side");
  assert.ok(!source.includes('from "@/components/cart/checkout-experience"'), "should no longer import old CheckoutExperience");
  assert.ok(source.includes("export default async function CheckoutPage"), "should be async server component");
});

test("CheckoutExperienceV2 exists as client component", () => {
  const filePath = path.resolve("./components/checkout/checkout-experience-v2.tsx");
  assert.ok(fs.existsSync(filePath), "checkout-experience-v2.tsx should exist");

  const source = fs.readFileSync(filePath, "utf-8");

  assert.ok(source.includes('"use client"'), "should be a client component");
  assert.ok(source.includes("AddressForm"), "should render AddressForm");
  assert.ok(source.includes('"/api/orders"'), "should POST to /api/orders");
  assert.ok(source.includes("window.location.href"), "should redirect on success");
  assert.ok(source.includes("/pending"), "should redirect to pending page");
});
