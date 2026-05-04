import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import { isMercadoPagoEnabled } from "../../../../lib/env/shared";

const originalEnv = process.env.MERCADOPAGO_ACCESS_TOKEN;

afterEach(() => {
  if (originalEnv === undefined) {
    delete process.env.MERCADOPAGO_ACCESS_TOKEN;
  } else {
    process.env.MERCADOPAGO_ACCESS_TOKEN = originalEnv;
  }
});

test("isMercadoPagoEnabled returns true when access token is configured", () => {
  process.env.MERCADOPAGO_ACCESS_TOKEN = "test-token-123";

  assert.equal(isMercadoPagoEnabled(), true);
});

test("isMercadoPagoEnabled returns false when access token is missing", () => {
  delete process.env.MERCADOPAGO_ACCESS_TOKEN;

  assert.equal(isMercadoPagoEnabled(), false);
});

test("isMercadoPagoEnabled returns false when access token is empty string", () => {
  process.env.MERCADOPAGO_ACCESS_TOKEN = "   ";

  assert.equal(isMercadoPagoEnabled(), false);
});
