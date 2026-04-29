import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { resolveCustomerSession } from "../../lib/auth/customer-session-resolver";

test("resolveCustomerSession prioritizes custom cookie session", async () => {
  const result = await resolveCustomerSession({
    getCookieToken: async () => "customer-token",
    validateSession: async () => ({
      token: "customer-token",
      customerId: "customer-1",
      expiresAt: new Date("2026-05-27T10:00:00.000Z"),
    }),
    findAccountById: async () => ({
      id: "customer-1",
      email: "customer@example.com",
      name: "Customer",
      emailVerified: null,
    }),
    getNextAuthSession: async () => ({
      user: {
        id: "legacy-customer",
        role: "customer",
        email: "legacy@example.com",
      },
    }),
  });

  assert.equal(result?.user.id, "customer-1");
  assert.equal(result?.user.email, "customer@example.com");
  assert.equal(result?.user.role, "customer");
});

test("auth configuration source keeps only the admin provider wiring", async () => {
  const source = await readFile(new URL("../../lib/auth.ts", import.meta.url), "utf8");

  assert.match(source, /const authProviders: NextAuthOptions\["providers"\] = \[adminCredentialsProvider\];/);
  assert.doesNotMatch(source, /getCustomerCredentialsProvider|getCustomerGoogleProvider|upsertCustomerGoogleAccount/);
});
