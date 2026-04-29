import assert from "node:assert/strict";
import test from "node:test";

import {
  CUSTOMER_SESSION_COOKIE,
  createCustomerRegisterRouteHandler,
  createCustomerResendVerificationRouteHandler,
  createCustomerVerifyRouteHandler,
} from "../../lib/auth/customer-auth-route-handlers";

test("customer register route returns verification-pending redirect with sanitized returnUrl", async () => {
  let persistedToken = "";
  let sentToken = "";

  const handler = createCustomerRegisterRouteHandler({
    consumeRateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
    now: () => new Date("2026-04-27T10:00:00.000Z"),
    createVerificationToken: () => "verify-token-123",
    registerAccount: async (payload) => {
      persistedToken = payload.verificationToken;
      return { id: "customer-1", email: payload.email, name: payload.name };
    },
    sendVerificationEmail: async ({ token }) => {
      sentToken = token;
    },
  });

  const response = await handler(
    new Request("http://localhost/api/customer/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "1.2.3.4",
      },
      body: JSON.stringify({
        name: "Customer Example",
        email: "customer@example.com",
        password: "Secret123",
        returnUrl: "https://evil.example/phishing",
      }),
    }),
  );

  assert.equal(response.status, 202);
  assert.equal(persistedToken, "verify-token-123");
  assert.equal(sentToken, "verify-token-123");

  const payload = (await response.json()) as {
    verificationPending: boolean;
    redirectTo: string;
  };

  assert.equal(payload.verificationPending, true);
  assert.equal(payload.redirectTo, "/verify-email?returnUrl=%2F&email=customer%40example.com");
});

test("customer register route rejects invalid payload before account creation", async () => {
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
        name: "Customer Example",
        email: "invalid-email",
        password: "Secret123",
        returnUrl: "/checkout",
      }),
    }),
  );

  assert.equal(response.status, 400);
  assert.equal(registerCalls, 0);
  const payload = (await response.json()) as { error?: string };
  assert.match(payload.error ?? "", /revisá|email/i);
});

test("customer verify route marks email verified, creates session, and redirects to returnUrl", async () => {
  let verifiedAccountId = "";
  let sessionCreatedFor = "";

  const handler = createCustomerVerifyRouteHandler({
    consumeRateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
    consumeVerificationToken: async () => ({
      customerId: "customer-1",
      returnUrl: "/checkout",
    }),
    markEmailVerified: async (accountId) => {
      verifiedAccountId = accountId;
    },
    createSession: async (customerId) => {
      sessionCreatedFor = customerId;
      return { token: "verified-session-token", expiresAt: new Date("2026-06-27T10:00:00.000Z") };
    },
  });

  const response = await handler(new Request("http://localhost/api/customer/verify?token=token-123&returnUrl=/checkout"));

  assert.equal(response.status, 303);
  assert.equal(verifiedAccountId, "customer-1");
  assert.equal(sessionCreatedFor, "customer-1");
  assert.equal(response.headers.get("location"), "http://localhost/checkout");
  assert.match(response.headers.get("set-cookie") ?? "", new RegExp(`${CUSTOMER_SESSION_COOKIE}=verified-session-token`));
});

test("customer verify route redirects to invalid state when token is missing", async () => {
  const handler = createCustomerVerifyRouteHandler({
    consumeRateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
  });

  const response = await handler(new Request("http://localhost/api/customer/verify?returnUrl=https://evil.example"));

  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "http://localhost/verify-email?status=invalid&returnUrl=%2F");
});

test("customer resend verification route is enumeration-safe", async () => {
  let sentCount = 0;

  const handler = createCustomerResendVerificationRouteHandler({
    consumeRateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
    findPendingAccountByEmail: async () => null,
    updateVerificationToken: async () => {
      throw new Error("should not update when account is missing");
    },
    sendVerificationEmail: async () => {
      sentCount += 1;
    },
  });

  const response = await handler(
    new Request("http://localhost/api/customer/resend-verification", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "1.2.3.4",
      },
      body: JSON.stringify({ email: "missing@example.com", returnUrl: "/checkout" }),
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(sentCount, 0);
  const payload = (await response.json()) as { message: string };
  assert.match(payload.message, /si el email está registrado/i);
});

test("customer register route returns 429 with retry-after when rate limited", async () => {
  const handler = createCustomerRegisterRouteHandler({
    consumeRateLimit: async () => ({ allowed: false, retryAfterSeconds: 90 }),
  });

  const response = await handler(
    new Request("http://localhost/api/customer/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Customer", email: "customer@example.com", password: "Secret123" }),
    }),
  );

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "90");
});

test("customer register route returns 202 when account is created but verification email fails", async () => {
  let createdEmail = "";
  let loggedCode = "";

  const handler = createCustomerRegisterRouteHandler({
    consumeRateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
    createVerificationToken: () => "verify-token-123",
    registerAccount: async (payload) => {
      createdEmail = payload.email;
      return { id: "customer-1", email: payload.email, name: payload.name };
    },
    sendVerificationEmail: async () => {
      throw new Error("email provider offline");
    },
    logError: (code) => {
      loggedCode = code;
    },
  });

  const response = await handler(
    new Request("http://localhost/api/customer/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Customer Example",
        email: "customer@example.com",
        password: "Secret123",
        returnUrl: "/checkout",
      }),
    }),
  );

  assert.equal(createdEmail, "customer@example.com");
  assert.equal(response.status, 202);
  assert.equal(loggedCode, "customer_register_verification_email_failed");

  const payload = (await response.json()) as {
    verificationPending: boolean;
    redirectTo: string;
    warning?: { code?: string; message?: string };
  };

  assert.equal(payload.verificationPending, true);
  assert.equal(payload.redirectTo, "/verify-email?returnUrl=%2Fcheckout&email=customer%40example.com");
  assert.equal(payload.warning?.code, "email_delivery_failed");
});

test("customer resend verification route returns 429 with retry-after when rate limited", async () => {
  const handler = createCustomerResendVerificationRouteHandler({
    consumeRateLimit: async () => ({ allowed: false, retryAfterSeconds: 1800 }),
  });

  const response = await handler(
    new Request("http://localhost/api/customer/resend-verification", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "customer@example.com" }),
    }),
  );

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "1800");
});
