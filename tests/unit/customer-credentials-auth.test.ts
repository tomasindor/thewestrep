import assert from "node:assert/strict";
import test from "node:test";

import {
  validateCustomerPasswordStrength,
} from "../../lib/auth/customer-credentials";
import { hashCustomerCredentialPassword, verifyCustomerCredentialPassword } from "../../lib/auth/customer-credentials-server";

test("hashCustomerCredentialPassword and verifyCustomerCredentialPassword work for customer auth", async () => {
  const hash = await hashCustomerCredentialPassword("Clave1234");

  assert.notEqual(hash, "Clave1234");
  assert.equal(await verifyCustomerCredentialPassword("Clave1234", hash), true);
  assert.equal(await verifyCustomerCredentialPassword("Incorrecta1234", hash), false);
});

test("validateCustomerPasswordStrength accepts strong passwords", () => {
  const result = validateCustomerPasswordStrength("Clave1234");

  assert.equal(result.success, true);
});

test("validateCustomerPasswordStrength rejects weak passwords with a clear message", () => {
  const result = validateCustomerPasswordStrength("1234567");

  assert.equal(result.success, false);
  assert.match(result.message ?? "", /contraseña/i);
});
