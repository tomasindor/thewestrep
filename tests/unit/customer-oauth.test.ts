import assert from "node:assert/strict";
import test from "node:test";

import {
  exchangeGoogleCodeForToken,
  generateGoogleAuthUrl,
  getGoogleUserInfo,
} from "../../lib/auth/customer-oauth";

test("generateGoogleAuthUrl builds OAuth URL with required params", () => {
  process.env.GOOGLE_CLIENT_ID = "test-client";
  const url = generateGoogleAuthUrl("state-token", "/checkout");
  const parsed = new URL(url);

  assert.equal(parsed.origin, "https://accounts.google.com");
  assert.equal(parsed.pathname, "/o/oauth2/v2/auth");
  assert.equal(parsed.searchParams.get("scope"), "openid email profile");
  assert.equal(parsed.searchParams.get("state"), "state-token");
  assert.equal(parsed.searchParams.get("prompt"), "select_account");
  assert.equal(parsed.searchParams.get("response_type"), "code");
  assert.ok(parsed.searchParams.get("client_id"));
  assert.ok(parsed.searchParams.get("redirect_uri")?.endsWith("/api/customer-auth/google/callback"));
});

test("exchangeGoogleCodeForToken parses token response", async () => {
  process.env.GOOGLE_CLIENT_ID = "test-client";
  process.env.GOOGLE_CLIENT_SECRET = "test-secret";
  const originalFetch = global.fetch;
  global.fetch = (async () =>
    Response.json({
      access_token: "access",
      id_token: "id",
      token_type: "Bearer",
      expires_in: 3600,
      scope: "openid email profile",
    })) as typeof fetch;

  try {
    const result = await exchangeGoogleCodeForToken("code-123");
    assert.equal(result.access_token, "access");
    assert.equal(result.id_token, "id");
  } finally {
    global.fetch = originalFetch;
  }
});

test("getGoogleUserInfo rejects unverified email", async () => {
  const originalFetch = global.fetch;
  global.fetch = (async () =>
    Response.json({
      sub: "sub-1",
      name: "User",
      given_name: "User",
      picture: "https://example.com/avatar.png",
      email: "user@example.com",
      email_verified: false,
    })) as typeof fetch;

  try {
    await assert.rejects(() => getGoogleUserInfo("access-token"), /email/i);
  } finally {
    global.fetch = originalFetch;
  }
});
