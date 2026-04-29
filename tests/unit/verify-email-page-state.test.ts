import assert from "node:assert/strict";
import test from "node:test";

import { resolveVerifyEmailPageState } from "../../lib/auth/verify-email-page-state";

test("resolveVerifyEmailPageState sanitizes returnUrl and forwards email query", () => {
  const state = resolveVerifyEmailPageState({
    returnUrl: "https://evil.example",
    email: "customer@example.com",
  });

  assert.equal(state.returnUrl, "/");
  assert.equal(state.defaultEmail, "customer@example.com");
});

test("resolveVerifyEmailPageState uses first value for multi-value queries", () => {
  const state = resolveVerifyEmailPageState({
    returnUrl: ["/checkout", "/other"],
    email: ["first@example.com", "second@example.com"],
  });

  assert.equal(state.returnUrl, "/checkout");
  assert.equal(state.defaultEmail, "first@example.com");
});
