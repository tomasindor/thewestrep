import assert from "node:assert/strict";
import test from "node:test";

import { customerAccounts, customerSessions, rateLimits } from "../../lib/db/schema";

test("schema exports customer_sessions table with required columns", () => {
  assert.ok(customerSessions.id);
  assert.ok(customerSessions.customerId);
  assert.ok(customerSessions.expiresAt);
  assert.ok(customerSessions.createdAt);
  assert.ok(customerSessions.updatedAt);
});

test("schema exports rate_limits table with persistent window fields", () => {
  assert.ok(rateLimits.key);
  assert.ok(rateLimits.points);
  assert.ok(rateLimits.expiresAt);
});

test("customer accounts include verification and consent columns", () => {
  assert.ok(customerAccounts.emailVerified);
  assert.ok(customerAccounts.verificationToken);
  assert.ok(customerAccounts.verificationTokenExpiresAt);
  assert.ok(customerAccounts.privacyConsentAcceptedAt);
  assert.ok(customerAccounts.privacyConsentVersion);
});

test("customer sessions table links each session to a customer account", () => {
  assert.ok(customerSessions.customerId);
  assert.equal(customerSessions.customerId.notNull, true);
});
