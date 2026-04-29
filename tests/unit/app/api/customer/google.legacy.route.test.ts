import assert from "node:assert/strict";
import test from "node:test";

import { GET as legacyGoogleStartGET } from "../../../../../app/api/customer/google/route";
import { GET as legacyGoogleCallbackGET } from "../../../../../app/api/customer/google/callback/route";

test("legacy customer google start route redirects to canonical customer-auth route", async () => {
  const response = await legacyGoogleStartGET(new Request("http://localhost/api/customer/google?returnUrl=%2Fcheckout"));

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost/api/customer-auth/google?returnUrl=%2Fcheckout");
});

test("legacy customer google callback route preserves query string when redirecting", async () => {
  const response = await legacyGoogleCallbackGET(
    new Request("http://localhost/api/customer/google/callback?code=oauth-code&state=oauth-state&scope=email%20profile"),
  );

  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get("location"),
    "http://localhost/api/customer-auth/google/callback?code=oauth-code&state=oauth-state&scope=email%20profile",
  );
});
