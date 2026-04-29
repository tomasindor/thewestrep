import assert from "node:assert/strict";
import test from "node:test";

import { buildAuthEntryHref, sanitizeAuthReturnUrl } from "../../lib/auth/customer-auth-navigation";

test("sanitizeAuthReturnUrl keeps internal paths", () => {
  assert.equal(sanitizeAuthReturnUrl("/checkout"), "/checkout");
  assert.equal(sanitizeAuthReturnUrl(" /producto/air-jordan "), "/producto/air-jordan");
});

test("sanitizeAuthReturnUrl rejects external URLs and protocol-relative paths", () => {
  assert.equal(sanitizeAuthReturnUrl("https://evil.example"), "/");
  assert.equal(sanitizeAuthReturnUrl("//evil.example"), "/");
});

test("buildAuthEntryHref appends returnUrl to login/register entries", () => {
  assert.equal(buildAuthEntryHref("/login", "/checkout"), "/login?returnUrl=%2Fcheckout");
  assert.equal(buildAuthEntryHref("/register", "/checkout"), "/register?returnUrl=%2Fcheckout");
});
