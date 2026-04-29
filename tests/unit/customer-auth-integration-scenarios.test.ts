import assert from "node:assert/strict";
import test from "node:test";

import { CustomerAccountExistsError, CustomerGoogleAccountExistsError } from "../../lib/auth/customer-accounts";
import {
  createCustomerLoginRouteHandler,
  createCustomerRegisterRouteHandler,
  createCustomerSessionRouteHandler,
  createCustomerVerifyRouteHandler,
} from "../../lib/auth/customer-auth-route-handlers";
import { createCustomerResetPasswordRouteHandler } from "../../lib/auth/customer-password-reset-route-handlers";
import { shouldBlockAdminLogin } from "../../lib/auth/admin-boundary";
import { shouldRedirectCheckoutToVerifyEmail } from "../../lib/orders/checkout-verification-gate";

test("register route returns duplicate-email error and skips verification email", async () => {
  const handler = createCustomerRegisterRouteHandler({
    consumeRateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
    createVerificationToken: () => "verify-token",
    registerAccount: async () => {
      throw new CustomerAccountExistsError();
    },
    sendVerificationEmail: async () => {
      throw new Error("must not send verification on duplicate");
    },
  });

  const response = await handler(
    new Request("http://localhost/api/customer/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Customer",
        email: "customer@example.com",
        password: "Secret123",
      }),
    }),
  );

  assert.equal(response.status, 409);
  const payload = (await response.json()) as { verificationPending?: boolean; redirectTo?: string; error?: string; code?: string };
  assert.equal(payload.verificationPending, undefined);
  assert.equal(payload.redirectTo, undefined);
  assert.equal(payload.code, "duplicate_email");
  assert.match(payload.error ?? "", /ya existe una cuenta/i);
});

test("register route returns google-account-exists error and skips verification email", async () => {
  const handler = createCustomerRegisterRouteHandler({
    consumeRateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
    createVerificationToken: () => "verify-token",
    registerAccount: async () => {
      throw new CustomerGoogleAccountExistsError();
    },
    sendVerificationEmail: async () => {
      throw new Error("must not send verification when google account exists");
    },
  });

  const response = await handler(
    new Request("http://localhost/api/customer/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Customer",
        email: "customer@example.com",
        password: "Secret123",
      }),
    }),
  );

  assert.equal(response.status, 409);
  const payload = (await response.json()) as { verificationPending?: boolean; redirectTo?: string; error?: string; code?: string };
  assert.equal(payload.verificationPending, undefined);
  assert.equal(payload.redirectTo, undefined);
  assert.equal(payload.code, "google_account_exists");
  assert.match(payload.error ?? "", /google/i);
});

test("register route rejects weak password without number", async () => {
  let registerCalls = 0;
  const handler = createCustomerRegisterRouteHandler({
    consumeRateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
    registerAccount: async () => {
      registerCalls += 1;
      return { id: "customer-1", email: "customer@example.com", name: "Customer" };
    },
  });

  const response = await handler(
    new Request("http://localhost/api/customer/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Customer",
        email: "customer@example.com",
        password: "onlyletters",
      }),
    }),
  );

  assert.equal(response.status, 400);
  assert.equal(registerCalls, 0);
  const payload = (await response.json()) as { error?: string };
  assert.match(payload.error ?? "", /contraseña/i);
});

test("login route returns generic credential error for wrong password", async () => {
  const handler = createCustomerLoginRouteHandler({
    consumeRateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
    authenticate: async () => null,
  });

  const response = await handler(
    new Request("http://localhost/api/customer/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "customer@example.com", password: "Wrong123" }),
    }),
  );

  assert.equal(response.status, 401);
  const payload = (await response.json()) as { error?: string };
  assert.match(payload.error ?? "", /inválidos/i);
});

test("login + session routes keep unverified state for checkout gating", async () => {
  const loginHandler = createCustomerLoginRouteHandler({
    consumeRateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
    authenticate: async () => ({ id: "customer-1", email: "customer@example.com", name: "Customer" }),
    createSession: async () => ({ token: "session-token", expiresAt: new Date("2026-05-27T10:00:00.000Z") }),
  });

  const loginResponse = await loginHandler(
    new Request("http://localhost/api/customer/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "customer@example.com",
        password: "Secret123",
        returnUrl: "/checkout",
      }),
    }),
  );

  assert.equal(loginResponse.status, 303);

  const sessionHandler = createCustomerSessionRouteHandler({
    validateSession: async () => ({
      customerId: "customer-1",
      token: "session-token",
      expiresAt: new Date("2026-05-27T10:00:00.000Z"),
    }),
    findAccountById: async () => ({
      id: "customer-1",
      email: "customer@example.com",
      name: "Customer",
      emailVerified: null,
    }),
  });

  const sessionResponse = await sessionHandler(
    new Request("http://localhost/api/customer/session", {
      headers: { cookie: "customer_session=session-token" },
    }),
  );

  assert.equal(sessionResponse.status, 200);
  const payload = (await sessionResponse.json()) as { session: { user: { emailVerified: string | null } } };
  assert.equal(payload.session.user.emailVerified, null);
  assert.equal(
    shouldRedirectCheckoutToVerifyEmail({
      checkoutMode: "account",
      emailVerified: payload.session.user.emailVerified,
      returnUrl: "/checkout",
    }),
    "/verify-email?returnUrl=%2Fcheckout",
  );
});

test("verify route redirects invalid state for expired token", async () => {
  const handler = createCustomerVerifyRouteHandler({
    consumeRateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
    consumeVerificationToken: async () => null,
  });

  const response = await handler(new Request("http://localhost/api/customer/verify?token=expired-token&returnUrl=/checkout"));

  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "http://localhost/verify-email?status=invalid&returnUrl=%2Fcheckout");
});

test("reset-password route rejects weak password without number", async () => {
  let resetCalls = 0;
  const handler = createCustomerResetPasswordRouteHandler({
    consumeRateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
    resetPassword: async () => {
      resetCalls += 1;
      return { success: true, customerId: "customer-1" };
    },
    revokeAllCustomerSessions: async () => {
      throw new Error("must not revoke when input is invalid");
    },
  });

  const response = await handler(
    new Request("http://localhost/api/customer/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "reset-token", newPassword: "onlyletters" }),
    }),
  );

  assert.equal(response.status, 400);
  assert.equal(resetCalls, 0);
  const payload = (await response.json()) as { error?: string };
  assert.match(payload.error ?? "", /contraseña/i);
});

test("reset-password route does not revoke sessions when token is expired", async () => {
  let revokeCalls = 0;
  const handler = createCustomerResetPasswordRouteHandler({
    consumeRateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
    resetPassword: async () => ({ success: false, error: "Token expirado." }),
    revokeAllCustomerSessions: async () => {
      revokeCalls += 1;
    },
  });

  const response = await handler(
    new Request("http://localhost/api/customer/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "expired-token", newPassword: "Secret123" }),
    }),
  );

  assert.equal(response.status, 400);
  assert.equal(revokeCalls, 0);
  const payload = (await response.json()) as { error?: string };
  assert.match(payload.error ?? "", /token/i);
});

test("admin boundary still blocks /admin when customer session is present", () => {
  assert.equal(shouldBlockAdminLogin({ hasAdminSession: false, hasCustomerSession: true }), true);
});
