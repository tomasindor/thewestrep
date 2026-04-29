import assert from "node:assert/strict";
import test from "node:test";

import {
  executeCustomerCredentialsFlow,
  isGoogleAuthEnabled,
  type CustomerCredentialsFlowInput,
} from "../../lib/auth/customer-auth-client";

function createJsonResponse(payload: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(payload), {
    status: init.status ?? 200,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

function asUrlString(input: RequestInfo | URL) {
  return typeof input === "string" ? input : input.toString();
}

test("login flow posts to /api/customer/login with sanitized returnUrl", async () => {
  const calls: Array<{ url: string; body: unknown }> = [];
  const fetcher: CustomerCredentialsFlowInput["fetcher"] = async (url, init) => {
    calls.push({
      url: asUrlString(url),
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });

    return createJsonResponse({ ok: true });
  };

  const result = await executeCustomerCredentialsFlow({
    mode: "login",
    name: "",
    email: "customer@example.com",
    password: "Secret123!",
    returnUrl: "https://evil.com",
    fetcher,
  });

  assert.deepEqual(result, {
    ok: true,
    redirectTo: "/",
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/customer/login");
  assert.deepEqual(calls[0].body, {
    email: "customer@example.com",
    password: "Secret123!",
    returnUrl: "/",
  });
});

test("login flow returns retry-friendly error on 429", async () => {
  const fetcher: CustomerCredentialsFlowInput["fetcher"] = async () =>
    createJsonResponse(
      { error: "Demasiados intentos. Esperá un momento antes de volver a intentar." },
      {
        status: 429,
        headers: { "retry-after": "120" },
      },
    );

  const result = await executeCustomerCredentialsFlow({
    mode: "login",
    name: "",
    email: "customer@example.com",
    password: "Secret123!",
    returnUrl: "/checkout",
    fetcher,
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /Esperá 120 segundos/i);
});

test("register flow returns verification-pending redirect from /api/customer/register", async () => {
  const calls: string[] = [];
  const payloads: unknown[] = [];
  const fetcher: CustomerCredentialsFlowInput["fetcher"] = async (url, init) => {
    calls.push(asUrlString(url));
    if (init?.body) {
      payloads.push(JSON.parse(String(init.body)));
    }

    if (url === "/api/customer/register") {
      return createJsonResponse({
        verificationPending: true,
        redirectTo: "/verify-email?returnUrl=%2Fcheckout&email=customer%40example.com",
      }, { status: 202 });
    }

    return createJsonResponse({ ok: true }, init ?? {});
  };

  const result = await executeCustomerCredentialsFlow({
    mode: "register",
    name: "Customer Example",
    email: "customer@example.com",
    password: "Secret123!",
    returnUrl: "/checkout",
    fetcher,
  });

  assert.deepEqual(result, {
    ok: true,
    redirectTo: "/verify-email?returnUrl=%2Fcheckout&email=customer%40example.com",
  });
  assert.deepEqual(calls, ["/api/customer/register"]);
  assert.deepEqual(payloads[0], {
    name: "Customer Example",
    email: "customer@example.com",
    password: "Secret123!",
    returnUrl: "/checkout",
  });
});

test("register flow fallback redirect includes encoded email and sanitized returnUrl", async () => {
  const fetcher: CustomerCredentialsFlowInput["fetcher"] = async () =>
    createJsonResponse({ verificationPending: true }, { status: 202 });

  const result = await executeCustomerCredentialsFlow({
    mode: "register",
    name: "Customer Example",
    email: "customer@example.com",
    password: "Secret123!",
    returnUrl: "https://evil.com",
    fetcher,
  });

  assert.deepEqual(result, {
    ok: true,
    redirectTo: "/verify-email?returnUrl=%2F&email=customer%40example.com",
  });
});

test("register flow surfaces retry-friendly error on 429", async () => {
  const fetcher: CustomerCredentialsFlowInput["fetcher"] = async () =>
    createJsonResponse(
      { error: "Demasiados intentos al crear tu cuenta." },
      {
        status: 429,
        headers: { "retry-after": "45" },
      },
    );

  const result = await executeCustomerCredentialsFlow({
    mode: "register",
    name: "Customer Example",
    email: "customer@example.com",
    password: "Secret123!",
    returnUrl: "/checkout",
    fetcher,
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /Esperá 45 segundos/i);
});

test("register flow surfaces duplicate-email error without verify-email redirect", async () => {
  const fetcher: CustomerCredentialsFlowInput["fetcher"] = async () =>
    createJsonResponse(
      { error: "Ya existe una cuenta para ese email. Iniciá sesión o recuperá tu contraseña." },
      { status: 409 },
    );

  const result = await executeCustomerCredentialsFlow({
    mode: "register",
    name: "Customer Example",
    email: "customer@example.com",
    password: "Secret123!",
    returnUrl: "/checkout",
    fetcher,
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "Ya existe una cuenta para ese email. Iniciá sesión o recuperá tu contraseña.");
  assert.equal(result.code, "duplicate_email");
});

test("register flow surfaces google-account-exists error without verify-email redirect", async () => {
  const fetcher: CustomerCredentialsFlowInput["fetcher"] = async () =>
    createJsonResponse(
      { error: "Ese email ya está asociado a Google. Iniciá sesión con Google para continuar.", code: "google_account_exists" },
      { status: 409 },
    );

  const result = await executeCustomerCredentialsFlow({
    mode: "register",
    name: "Customer Example",
    email: "customer@example.com",
    password: "Secret123!",
    returnUrl: "/checkout",
    fetcher,
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "Ese email ya está asociado a Google. Iniciá sesión con Google para continuar.");
  assert.equal(result.code, "google_account_exists");
});

test("register flow sends payload without consent fields", async () => {
  let body: Record<string, unknown> | null = null;
  const fetcher: CustomerCredentialsFlowInput["fetcher"] = async (_url, init) => {
    body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
    return createJsonResponse({ verificationPending: true }, { status: 202 });
  };

  await executeCustomerCredentialsFlow({
    mode: "register",
    name: "Customer Example",
    email: "customer@example.com",
    password: "Secret123!",
    returnUrl: "/checkout",
    fetcher,
  });

  assert.ok(body);
  assert.equal("privacyConsentAcceptedAt" in body, false);
  assert.equal("privacyConsentVersion" in body, false);
});

test("isGoogleAuthEnabled requires public client id and secret", () => {
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "public-id";
  process.env.GOOGLE_CLIENT_SECRET = "secret";
  assert.equal(isGoogleAuthEnabled(), true);

  delete process.env.GOOGLE_CLIENT_SECRET;
  assert.equal(isGoogleAuthEnabled(), false);
});
