import assert from "node:assert/strict";
import test from "node:test";

import {
  CUSTOMER_SESSION_COOKIE,
  createCustomerLoginRouteHandler,
  createCustomerLogoutRouteHandler,
  createCustomerSessionRouteHandler,
} from "../../lib/auth/customer-auth-route-handlers";

test("customer login route sets httpOnly cookie and redirects to returnUrl", async () => {
  const handler = createCustomerLoginRouteHandler({
    consumeRateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
    authenticate: async () => ({ id: "customer-1", email: "test@example.com", name: "Test User" }),
    createSession: async () => ({ token: "session-token", expiresAt: new Date("2026-05-27T10:00:00.000Z") }),
  });

  const response = await handler(
    new Request("http://localhost/api/customer/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "1.2.3.4",
      },
      body: JSON.stringify({
        email: "test@example.com",
        password: "Secret123",
        returnUrl: "/checkout",
      }),
    }),
  );

  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "http://localhost/checkout");
  assert.match(response.headers.get("set-cookie") ?? "", new RegExp(`${CUSTOMER_SESSION_COOKIE}=session-token`));
  assert.match(response.headers.get("set-cookie") ?? "", /HttpOnly/i);
});

test("customer login route returns 429 with retry header when rate limited", async () => {
  const handler = createCustomerLoginRouteHandler({
    consumeRateLimit: async () => ({ allowed: false, retryAfterSeconds: 120 }),
  });

  const response = await handler(
    new Request("http://localhost/api/customer/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "x@example.com", password: "Secret123" }),
    }),
  );

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "120");
});

test("customer logout route revokes token, clears cookie and redirects", async () => {
  let revokedToken = "";
  const handler = createCustomerLogoutRouteHandler({
    revokeSession: async (token) => {
      revokedToken = token;
    },
  });

  const response = await handler(
    new Request("http://localhost/api/customer/logout?returnUrl=/login", {
      method: "POST",
      headers: {
        cookie: `${CUSTOMER_SESSION_COOKIE}=abc-token`,
      },
    }),
  );

  assert.equal(revokedToken, "abc-token");
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "http://localhost/login");
  assert.match(response.headers.get("set-cookie") ?? "", /customer_session=/i);
});

test("customer session route returns 401 when cookie token is missing", async () => {
  const handler = createCustomerSessionRouteHandler();
  const response = await handler(new Request("http://localhost/api/customer/session"));

  assert.equal(response.status, 401);
});

test("customer session route returns account payload for a valid session", async () => {
  const handler = createCustomerSessionRouteHandler({
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

  const response = await handler(
    new Request("http://localhost/api/customer/session", {
      headers: { cookie: `${CUSTOMER_SESSION_COOKIE}=session-token` },
    }),
  );

  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    session: { user: { id: string; email: string; role: string; authProvider: string } };
  };

  assert.equal(payload.session.user.id, "customer-1");
  assert.equal(payload.session.user.email, "customer@example.com");
  assert.equal(payload.session.user.role, "customer");
  assert.equal(payload.session.user.authProvider, "credentials");
});
