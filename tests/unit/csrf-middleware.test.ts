import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import { proxy } from "../../proxy";

const originalNextauthUrl = process.env.NEXTAUTH_URL;

afterEach(() => {
  if (originalNextauthUrl !== undefined) {
    process.env.NEXTAUTH_URL = originalNextauthUrl;
  } else {
    delete process.env.NEXTAUTH_URL;
  }
});

function makeMockRequest(
  pathname: string,
  {
    method = "POST",
    origin,
    host = "thewestrep.com",
  }: { method?: string; origin?: string; host?: string } = {},
) {
  const url = new URL(`https://${host}${pathname}`);
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  if (host) headers.set("host", host);

  return {
    method,
    headers,
    nextUrl: url,
  } as Parameters<typeof proxy>[0];
}

// ── Same-origin request allowed ──

test("same-origin POST request is allowed", () => {
  const req = makeMockRequest("/api/orders", {
    method: "POST",
    origin: "https://thewestrep.com",
    host: "thewestrep.com",
  });

  const res = proxy(req);
  assert.notEqual(res?.status, 403, "should pass through (no 403 response)");
});

// ── Cross-origin request blocked ──

test("cross-origin POST request is blocked with 403", async () => {
  const req = makeMockRequest("/api/orders", {
    method: "POST",
    origin: "https://evil.com",
    host: "thewestrep.com",
  });

  const res = proxy(req);
  assert.equal(res?.status, 403);
  const body = await res.json();
  assert.equal(body.error, "Forbidden: invalid origin");
});

// ── Missing origin AND Referer headers blocked ──

test("missing origin AND referer headers is blocked with 403", async () => {
  const req = makeMockRequest("/api/orders", {
    method: "POST",
    origin: undefined,
    host: "thewestrep.com",
  });

  const res = proxy(req);
  assert.equal(res?.status, 403, "should block when both origin and referer are missing");
  const body = await res.json();
  assert.equal(body.error, "Forbidden: invalid origin");
});

// ── Referer fallback: valid Referer allowed ──

test("missing origin but valid referer is allowed", () => {
  const url = new URL("https://thewestrep.com/api/orders");
  const headers = new Headers();
  headers.set("host", "thewestrep.com");
  headers.set("referer", "https://thewestrep.com/some-page");

  const req = {
    method: "POST",
    headers,
    nextUrl: url,
  } as Parameters<typeof proxy>[0];

  const res = proxy(req);
  assert.notEqual(res?.status, 403, "should allow when referer host matches");
});

// ── Referer fallback: cross-origin Referer blocked ──

test("missing origin but cross-origin referer is blocked with 403", async () => {
  const url = new URL("https://thewestrep.com/api/orders");
  const headers = new Headers();
  headers.set("host", "thewestrep.com");
  headers.set("referer", "https://evil.com/malicious-page");

  const req = {
    method: "POST",
    headers,
    nextUrl: url,
  } as Parameters<typeof proxy>[0];

  const res = proxy(req);
  assert.equal(res?.status, 403, "should block when referer host does not match");
});

// ── GET request bypasses check ──

test("GET request bypasses origin check entirely", () => {
  const req = makeMockRequest("/api/orders", {
    method: "GET",
    origin: "https://evil.com",
    host: "thewestrep.com",
  });

  const res = proxy(req);
  assert.notEqual(res?.status, 403, "GET should always pass through");
});

// ── Public endpoint (register) bypasses check ──

test("register endpoint bypasses origin check", () => {
  const req = makeMockRequest("/api/customer-auth/register", {
    method: "POST",
    origin: "https://evil.com",
    host: "thewestrep.com",
  });

  const res = proxy(req);
  assert.notEqual(res?.status, 403, "register should pass through");
});

// ── Auth endpoints bypass check ──

test("auth endpoints bypass origin check", () => {
  const req = makeMockRequest("/api/auth/callback/google", {
    method: "POST",
    origin: "https://evil.com",
    host: "thewestrep.com",
  });

  const res = proxy(req);
  assert.notEqual(res?.status, 403, "auth endpoints should pass through");
});

// ── NEXTAUTH_URL origin allowed ──

test("NEXTAUTH_URL origin is allowed", () => {
  process.env.NEXTAUTH_URL = "https://app.thewestrep.com";

  const req = makeMockRequest("/api/orders", {
    method: "POST",
    origin: "https://app.thewestrep.com",
    host: "thewestrep.com",
  });

  const res = proxy(req);
  assert.notEqual(res?.status, 403, "NEXTAUTH_URL origin should be allowed");
});

// ── DELETE/PATCH/PUT also validated ──

test("DELETE request is validated for origin", async () => {
  const req = makeMockRequest("/api/orders/abc", {
    method: "DELETE",
    origin: "https://evil.com",
    host: "thewestrep.com",
  });

  const res = proxy(req);
  assert.equal(res?.status, 403);
});

test("PUT request is validated for origin", async () => {
  const req = makeMockRequest("/api/orders/abc", {
    method: "PUT",
    origin: "https://evil.com",
    host: "thewestrep.com",
  });

  const res = proxy(req);
  assert.equal(res?.status, 403);
});

test("PATCH request is validated for origin", async () => {
  const req = makeMockRequest("/api/orders/abc", {
    method: "PATCH",
    origin: "https://evil.com",
    host: "thewestrep.com",
  });

  const res = proxy(req);
  assert.equal(res?.status, 403);
});

// ── OPTIONS bypasses check ──

test("OPTIONS request bypasses origin check", () => {
  const req = makeMockRequest("/api/orders", {
    method: "OPTIONS",
    origin: "https://evil.com",
    host: "thewestrep.com",
  });

  const res = proxy(req);
  assert.notEqual(res?.status, 403, "OPTIONS should always pass through");
});
