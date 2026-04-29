import assert from "node:assert/strict";
import test from "node:test";

import { CustomerAccountExistsError, resolveGoogleAccountUpsert } from "../../lib/auth/customer-accounts";

test("resolveGoogleAccountUpsert keeps existing account when googleSubject already linked", () => {
  const now = new Date("2026-04-28T12:00:00.000Z");
  const resolved = resolveGoogleAccountUpsert({
    email: "Customer@Example.com",
    name: "  Customer Name  ",
    googleSubject: "google-subject-1",
    existing: {
      id: "customer-1",
      email: "customer@example.com",
      googleSubject: "google-subject-1",
    },
    now: () => now,
  });

  assert.equal(resolved.id, "customer-1");
  assert.equal(resolved.values.id, "customer-1");
  assert.equal(resolved.values.googleSubject, "google-subject-1");
  assert.equal(resolved.values.email, "customer@example.com");
  assert.equal(resolved.values.name, "Customer Name");
});

test("resolveGoogleAccountUpsert links existing email-only account and sets emailVerified timestamp", () => {
  const now = new Date("2026-04-28T13:00:00.000Z");
  const resolved = resolveGoogleAccountUpsert({
    email: "existing@example.com",
    name: "Existing Account",
    googleSubject: "google-subject-2",
    existing: {
      id: "customer-2",
      email: "existing@example.com",
      googleSubject: null,
    },
    now: () => now,
  });

  assert.equal(resolved.id, "customer-2");
  assert.equal(resolved.values.googleSubject, "google-subject-2");
  assert.equal(resolved.values.emailVerified.toISOString(), now.toISOString());
  assert.equal(resolved.values.updatedAt.toISOString(), now.toISOString());
});

test("resolveGoogleAccountUpsert rejects duplicate googleSubject assigned to different email", () => {
  assert.throws(
    () =>
      resolveGoogleAccountUpsert({
        email: "second@example.com",
        name: "Second User",
        googleSubject: "google-duplicate",
        existing: {
          id: "customer-3",
          email: "first@example.com",
          googleSubject: "google-duplicate",
        },
      }),
    (error) => {
      assert.ok(error instanceof CustomerAccountExistsError);
      assert.match(error.message, /vinculada a otro usuario/i);
      return true;
    },
  );
});

test("resolveGoogleAccountUpsert creates new account identity when no account exists", () => {
  const resolved = resolveGoogleAccountUpsert({
    email: "new-user@example.com",
    name: "New User",
    googleSubject: "google-subject-new",
    existing: null,
  });

  assert.match(resolved.id, /^[0-9a-f-]{36}$/i);
  assert.equal(resolved.values.id, resolved.id);
  assert.equal(resolved.values.email, "new-user@example.com");
  assert.equal(resolved.values.googleSubject, "google-subject-new");
  assert.ok(resolved.values.emailVerified instanceof Date);
});
