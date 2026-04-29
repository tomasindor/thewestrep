import assert from "node:assert/strict";
import test from "node:test";

import {
  isEmailVerificationRequiredForAccountCheckout,
  shouldRedirectCheckoutToVerifyEmail,
} from "../../lib/orders/checkout-verification-gate";

test("requires verification when checkout mode is account and email is not verified", () => {
  assert.equal(
    isEmailVerificationRequiredForAccountCheckout({
      checkoutMode: "account",
      emailVerified: null,
    }),
    true,
  );
});

test("does not require verification for guest checkout", () => {
  assert.equal(
    isEmailVerificationRequiredForAccountCheckout({
      checkoutMode: "guest",
      emailVerified: null,
    }),
    false,
  );
});

test("does not require verification when account checkout is already verified", () => {
  assert.equal(
    isEmailVerificationRequiredForAccountCheckout({
      checkoutMode: "account",
      emailVerified: "2026-01-01T00:00:00.000Z",
    }),
    false,
  );
});

test("redirect helper keeps checkout returnUrl semantics", () => {
  assert.equal(
    shouldRedirectCheckoutToVerifyEmail({
      checkoutMode: "account",
      emailVerified: null,
      returnUrl: "/checkout",
    }),
    "/verify-email?returnUrl=%2Fcheckout",
  );

  assert.equal(
    shouldRedirectCheckoutToVerifyEmail({
      checkoutMode: "guest",
      emailVerified: null,
      returnUrl: "/checkout",
    }),
    null,
  );
});
