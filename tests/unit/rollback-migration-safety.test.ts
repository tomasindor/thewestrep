import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMigrationDryRunChecklist,
  runLegacyCustomerCompatibilityFixture,
  validateRollbackAuthSource,
} from "../../lib/auth/rollback-migration-safety";
import { LEGACY_AUTH_COMPATIBILITY_FIXTURES } from "../fixtures/legacy-auth-compatibility";

test("11.1 rollback auth validation marks legacy customer+admin config as rollback-ready", () => {
  const rollbackCandidateSource = `
    const authProviders: NextAuthOptions["providers"] = [
      adminCredentialsProvider,
      getCustomerCredentialsProvider(),
      getCustomerGoogleProvider(),
    ];

    export const authOptions: NextAuthOptions = {
      pages: { signIn: "/admin/login" },
      cookies: { sessionToken: { name: "admin-session" } },
      providers: authProviders,
    };
  `;

  const validation = validateRollbackAuthSource(rollbackCandidateSource);

  assert.equal(validation.rollbackReady, true);
  assert.equal(validation.issues.length, 0);
  assert.equal(validation.hasAdminProvider, true);
  assert.equal(validation.hasLegacyCustomerCredentialsProvider, true);
});

test("11.1 rollback auth validation reports issues when customer provider is missing", () => {
  const currentSource = `
    const authProviders: NextAuthOptions["providers"] = [adminCredentialsProvider];
    export const authOptions: NextAuthOptions = {
      pages: { signIn: "/admin/login" },
      cookies: { sessionToken: { name: "admin-session" } },
      providers: authProviders,
    };
  `;

  const validation = validateRollbackAuthSource(currentSource);

  assert.equal(validation.rollbackReady, false);
  assert.equal(validation.hasAdminProvider, true);
  assert.equal(validation.hasLegacyCustomerCredentialsProvider, false);
  assert.match(validation.issues.join("\n"), /customer credentials provider/i);
});

test("11.2 migration dry-run checklist blocks risky targets and enforces dry-run", () => {
  const checklist = buildMigrationDryRunChecklist({
    target: "postgres://user:pass@prod-db.neon.tech/thewestrep",
    command: "drizzle-kit migrate",
    explicitConfirmation: false,
  });

  assert.equal(checklist.canRun, false);
  assert.equal(checklist.classification, "blocked");
  assert.equal(checklist.command.includes("--dry-run"), true);
  assert.match(checklist.reasons.join("\n"), /explicit target confirmation/i);
});

test("11.2 migration dry-run checklist allows local test targets after confirmation", () => {
  const checklist = buildMigrationDryRunChecklist({
    target: "postgres://postgres:postgres@localhost:5432/thewestrep_test",
    command: "drizzle-kit migrate --dry-run",
    explicitConfirmation: true,
  });

  assert.equal(checklist.canRun, true);
  assert.equal(checklist.classification, "safe-local");
  assert.equal(checklist.command, "drizzle-kit migrate --dry-run");
  assert.equal(checklist.reasons.length, 0);
});

test("11.3 compatibility harness validates existing password and creates new DB session", async () => {
  const fixture = LEGACY_AUTH_COMPATIBILITY_FIXTURES[0]!;
  const result = await runLegacyCustomerCompatibilityFixture(
    fixture,
    {
      verifyPassword: async (password, passwordHash) => password === "Secret123" && passwordHash === "hash:legacy:ok",
      createSession: async (customerId) => ({ token: `new-db-session-${customerId}`, expiresAt: new Date("2026-05-01T00:00:00.000Z") }),
    },
  );

  assert.equal(result.passwordValid, true);
  assert.equal(result.sessionCreated, true);
  assert.equal(result.newSessionToken, "new-db-session-legacy-1");
});

test("11.3 compatibility harness refuses session creation when legacy password is invalid", async () => {
  let createSessionCalls = 0;
  const fixture = LEGACY_AUTH_COMPATIBILITY_FIXTURES[1]!;

  const result = await runLegacyCustomerCompatibilityFixture(
    fixture,
    {
      verifyPassword: async () => false,
      createSession: async () => {
        createSessionCalls += 1;
        return { token: "should-not-happen", expiresAt: new Date("2026-05-01T00:00:00.000Z") };
      },
    },
  );

  assert.equal(result.passwordValid, false);
  assert.equal(result.sessionCreated, false);
  assert.equal(result.newSessionToken, null);
  assert.equal(createSessionCalls, 0);
});
