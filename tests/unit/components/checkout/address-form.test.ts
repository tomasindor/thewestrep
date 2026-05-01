import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

import { checkoutOrderCustomerV2Schema } from "../../../../lib/orders/checkout.shared";

test("address-form.tsx exists with required exports", () => {
  const filePath = path.resolve("./components/checkout/address-form.tsx");
  assert.ok(fs.existsSync(filePath), "address-form.tsx should exist");

  const source = fs.readFileSync(filePath, "utf-8");

  assert.ok(source.includes('"use client"'), "should be a client component");
  assert.ok(source.includes("export function AddressForm"), "should export AddressForm");
  assert.ok(source.includes("checkoutOrderCustomerV2Schema"), "should use V2 schema");
  assert.ok(source.includes("inputClassName"), "should import inputClassName");
  assert.ok(source.includes("provinceId"), "should have province select");
  assert.ok(source.includes("cityId"), "should have city select");
  assert.ok(source.includes("fetchDepartamentosAction"), "should call server action for cities");
});

test("checkoutOrderCustomerV2Schema rejects missing required fields", () => {
  const result = checkoutOrderCustomerV2Schema.safeParse({
    name: "",
    phone: "",
    email: "invalid",
    provinceId: "",
    provinceName: "",
    cityId: "",
    cityName: "",
    address: "",
    recipient: "",
    notes: "",
  });

  assert.equal(result.success, false);
  if (!result.success) {
    const paths = result.error.issues.map((i) => i.path[0]);
    assert.ok(paths.includes("name"), "should error on missing name");
    assert.ok(paths.includes("phone"), "should error on missing phone");
    assert.ok(paths.includes("email"), "should error on invalid email");
    assert.ok(paths.includes("provinceId"), "should error on missing provinceId");
    assert.ok(paths.includes("cityId"), "should error on missing cityId");
    assert.ok(paths.includes("address"), "should error on missing address");
    assert.ok(paths.includes("recipient"), "should error on missing recipient");
  }
});

test("checkoutOrderCustomerV2Schema accepts valid payload", () => {
  const result = checkoutOrderCustomerV2Schema.safeParse({
    name: "Gonzalo Pérez",
    phone: "+54 9 11 5555 5555",
    email: "gonza@correo.com",
    provinceId: "06",
    provinceName: "Buenos Aires",
    cityId: "06028",
    cityName: "La Matanza",
    address: "Av. Rivadavia 1234",
    recipient: "Gonzalo Pérez",
    notes: "Tocar timbre",
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.email, "gonza@correo.com");
    assert.equal(result.data.notes, "Tocar timbre");
  }
});

test("checkoutOrderCustomerV2Schema normalizes email to lowercase", () => {
  const result = checkoutOrderCustomerV2Schema.safeParse({
    name: "Gonzalo Pérez",
    phone: "+54 9 11 5555 5555",
    email: "GONZA@CORREO.COM",
    provinceId: "06",
    provinceName: "Buenos Aires",
    cityId: "06028",
    cityName: "La Matanza",
    address: "Av. Rivadavia 1234",
    recipient: "Gonzalo Pérez",
    notes: "",
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.email, "gonza@correo.com");
  }
});
