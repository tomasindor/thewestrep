import assert from "node:assert/strict";
import test from "node:test";

import {
  customerLoginSchema,
  customerRegistrationFormSchema,
  customerRegistrationSchema,
  normalizeCustomerEmail,
} from "../../lib/auth/customer-credentials";
import { hashCustomerPassword, verifyCustomerPassword } from "../../lib/auth/customer-password";

test("hashes and verifies customer passwords with scrypt", async () => {
  const passwordHash = await hashCustomerPassword("Clave1234");

  assert.notEqual(passwordHash, "Clave1234");
  assert.equal(await verifyCustomerPassword("Clave1234", passwordHash), true);
  assert.equal(await verifyCustomerPassword("Otra1234", passwordHash), false);
});

test("normalizes customer emails before persistence/auth", () => {
  assert.equal(normalizeCustomerEmail("  Hola@Correo.COM  "), "hola@correo.com");
});

test("validates customer login and registration payloads", () => {
  assert.equal(customerLoginSchema.safeParse({ email: "cliente@correo.com", password: "Clave1234" }).success, true);
  assert.equal(
    customerRegistrationSchema.safeParse({ name: "Gonza", email: "cliente@correo.com", password: "Clave1234" }).success,
    true,
  );
  assert.equal(customerRegistrationSchema.safeParse({ name: "G", email: "cliente@correo.com", password: "corta" }).success, false);
});

test("customer registration form schema validates password confirmation", () => {
  assert.equal(
    customerRegistrationFormSchema.safeParse({
      name: "Gonza",
      email: "cliente@correo.com",
      password: "Clave1234",
      confirmPassword: "Clave1234",
    }).success,
    true,
  );

  assert.equal(
    customerRegistrationFormSchema.safeParse({
      name: "Gonza",
      email: "cliente@correo.com",
      password: "Clave1234",
      confirmPassword: "Clave9999",
    }).success,
    false,
  );
});
