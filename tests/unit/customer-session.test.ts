import assert from "node:assert/strict";
import test from "node:test";

import {
  createCustomerSession,
  revokeAllCustomerSessions,
  revokeCustomerSession,
  type CustomerSessionRepository,
  validateCustomerSession,
} from "../../lib/auth/customer-session";

function createRepositoryFixture(): CustomerSessionRepository {
  const sessions = new Map<string, { id: string; customerId: string; expiresAt: Date }>();

  return {
    async insertSession(session) {
      sessions.set(session.id, session);
    },
    async getSessionById(id) {
      return sessions.get(id) ?? null;
    },
    async deleteSessionById(id) {
      sessions.delete(id);
    },
    async deleteSessionsByCustomerId(customerId) {
      for (const [id, value] of sessions.entries()) {
        if (value.customerId === customerId) {
          sessions.delete(id);
        }
      }
    },
  };
}

test("createCustomerSession persists and validates an active session", async () => {
  const repository = createRepositoryFixture();
  const now = new Date("2026-04-27T10:00:00.000Z");

  const session = await createCustomerSession("customer-1", { repository, now });
  const validated = await validateCustomerSession(session.token, { repository, now });

  assert.ok(session.token.length >= 32);
  assert.equal(validated?.customerId, "customer-1");
});

test("validateCustomerSession revokes expired sessions", async () => {
  const repository = createRepositoryFixture();
  const now = new Date("2026-04-27T10:00:00.000Z");
  const future = new Date("2026-04-27T11:00:00.000Z");

  const session = await createCustomerSession("customer-2", {
    repository,
    now,
    ttlMs: 30 * 60 * 1000,
  });

  const expiredValidation = await validateCustomerSession(session.token, {
    repository,
    now: future,
  });

  assert.equal(expiredValidation, null);
  assert.equal(await validateCustomerSession(session.token, { repository, now: future }), null);
});

test("revokeCustomerSession invalidates only the targeted token", async () => {
  const repository = createRepositoryFixture();
  const now = new Date("2026-04-27T10:00:00.000Z");

  const first = await createCustomerSession("customer-3", { repository, now });
  const second = await createCustomerSession("customer-3", { repository, now });

  await revokeCustomerSession(first.token, { repository });

  assert.equal(await validateCustomerSession(first.token, { repository, now }), null);
  assert.equal((await validateCustomerSession(second.token, { repository, now }))?.customerId, "customer-3");
});

test("revokeAllCustomerSessions invalidates all sessions for one customer", async () => {
  const repository = createRepositoryFixture();
  const now = new Date("2026-04-27T10:00:00.000Z");

  const customerA = await createCustomerSession("customer-a", { repository, now });
  const customerB = await createCustomerSession("customer-b", { repository, now });

  await revokeAllCustomerSessions("customer-a", { repository });

  assert.equal(await validateCustomerSession(customerA.token, { repository, now }), null);
  assert.equal((await validateCustomerSession(customerB.token, { repository, now }))?.customerId, "customer-b");
});

test("createCustomerSession also supports Google-linked customer IDs", async () => {
  const repository = createRepositoryFixture();
  const now = new Date("2026-04-27T10:00:00.000Z");

  const session = await createCustomerSession("google-customer-1", { repository, now });
  const validated = await validateCustomerSession(session.token, { repository, now });

  assert.equal(validated?.customerId, "google-customer-1");
});
