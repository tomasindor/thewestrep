import assert from "node:assert/strict";
import test from "node:test";

import {
  createCustomerForgotPasswordRouteHandler,
  createCustomerResetPasswordRouteHandler,
} from "../../lib/auth/customer-password-reset-route-handlers";

test("forgot-password route is enumeration-safe and always returns generic success", async () => {
  let requestedEmail = "";
  const handler = createCustomerForgotPasswordRouteHandler({
    consumeRateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
    requestPasswordReset: async (email) => {
      requestedEmail = email;
    },
  });

  const response = await handler(
    new Request("http://localhost/api/customer/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "Customer@Example.com" }),
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(requestedEmail, "customer@example.com");

  const payload = (await response.json()) as { message?: string };
  assert.match(payload.message ?? "", /si tu email está registrado/i);
});

test("reset-password route updates password and revokes all customer sessions", async () => {
  let revokedCustomerId = "";
  const handler = createCustomerResetPasswordRouteHandler({
    consumeRateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
    resetPassword: async () => ({ success: true, customerId: "customer-1" }),
    revokeAllCustomerSessions: async (customerId) => {
      revokedCustomerId = customerId;
    },
  });

  const response = await handler(
    new Request("http://localhost/api/customer/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "reset-token", newPassword: "Secret1234" }),
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(revokedCustomerId, "customer-1");
});

test("reset-password route returns 400 and does not revoke sessions on invalid token", async () => {
  let revoked = false;
  const handler = createCustomerResetPasswordRouteHandler({
    consumeRateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
    resetPassword: async () => ({ success: false, error: "Token inválido." }),
    revokeAllCustomerSessions: async () => {
      revoked = true;
    },
  });

  const response = await handler(
    new Request("http://localhost/api/customer/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "bad-token", newPassword: "Secret1234" }),
    }),
  );

  assert.equal(response.status, 400);
  assert.equal(revoked, false);
  const payload = (await response.json()) as { error?: string };
  assert.match(payload.error ?? "", /token/i);
});
