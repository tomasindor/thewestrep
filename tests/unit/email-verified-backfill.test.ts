import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEmailVerifiedBackfillSql,
  shouldTreatAccountAsVerifiedCandidate,
} from "../../lib/auth/email-verified-backfill";

test("buildEmailVerifiedBackfillSql targets null email_verified records with safe eligibility predicate", () => {
  const sql = buildEmailVerifiedBackfillSql();

  assert.match(sql, /update\s+customer_accounts/i);
  assert.match(sql, /email_verified\s*=\s*now\(\)/i);
  assert.match(sql, /where\s+email_verified\s+is\s+null/i);
  assert.match(sql, /google_subject\s+is\s+not\s+null/i);
  assert.match(sql, /password_reset_token\s+is\s+null/i);
});

test("shouldTreatAccountAsVerifiedCandidate follows rollback backfill rules", () => {
  assert.equal(
    shouldTreatAccountAsVerifiedCandidate({
      emailVerified: null,
      googleSubject: "google-123",
      passwordResetToken: "reset-token",
    }),
    true,
  );

  assert.equal(
    shouldTreatAccountAsVerifiedCandidate({
      emailVerified: null,
      googleSubject: null,
      passwordResetToken: null,
    }),
    true,
  );

  assert.equal(
    shouldTreatAccountAsVerifiedCandidate({
      emailVerified: null,
      googleSubject: null,
      passwordResetToken: "reset-token",
    }),
    false,
  );

  assert.equal(
    shouldTreatAccountAsVerifiedCandidate({
      emailVerified: new Date("2026-01-01T00:00:00.000Z"),
      googleSubject: "google-123",
      passwordResetToken: null,
    }),
    false,
  );
});
