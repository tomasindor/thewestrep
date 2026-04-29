import assert from "node:assert/strict";
import test from "node:test";

import { DbRateLimiter, type DbRateLimitRepository } from "../../lib/security/db-rate-limiter";

const mutableEnv = process.env as Record<string, string | undefined>;

function createRepositoryFixture(): DbRateLimitRepository {
  const records = new Map<string, { key: string; points: number; expiresAt: Date }>();

  return {
    async deleteExpired(now) {
      for (const [key, value] of records.entries()) {
        if (value.expiresAt <= now) {
          records.delete(key);
        }
      }
    },
    async getByKey(key) {
      return records.get(key) ?? null;
    },
    async upsert(record) {
      records.set(record.key, record);
      return record;
    },
  };
}

test("increments points and blocks after max attempts", async () => {
  const repository = createRepositoryFixture();
  const limiter = new DbRateLimiter({ repository, now: () => new Date("2026-04-27T10:00:00.000Z") });
  const config = { maxPoints: 2, windowMs: 60_000 };

  const first = await limiter.consume("login:ip-1", config);
  const second = await limiter.consume("login:ip-1", config);
  const third = await limiter.consume("login:ip-1", config);

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
  assert.ok(third.retryAfterSeconds > 0);
});

test("resets points after window expiry and cleanup", async () => {
  const repository = createRepositoryFixture();
  const timeline = [
    new Date("2026-04-27T10:00:00.000Z"),
    new Date("2026-04-27T10:00:10.000Z"),
    new Date("2026-04-27T10:01:30.000Z"),
  ];
  let index = 0;
  const limiter = new DbRateLimiter({
    repository,
    now: () => timeline[Math.min(index++, timeline.length - 1)],
  });
  const config = { maxPoints: 1, windowMs: 60_000 };

  const first = await limiter.consume("register:ip-2", config);
  const blocked = await limiter.consume("register:ip-2", config);
  const afterExpiry = await limiter.consume("register:ip-2", config);

  assert.equal(first.allowed, true);
  assert.equal(blocked.allowed, false);
  assert.equal(afterExpiry.allowed, true);
});

test("tracks independent keys separately", async () => {
  const repository = createRepositoryFixture();
  const limiter = new DbRateLimiter({ repository, now: () => new Date("2026-04-27T10:00:00.000Z") });
  const config = { maxPoints: 1, windowMs: 60_000 };

  const firstKey = await limiter.consume("verify:ip-a", config);
  const secondKey = await limiter.consume("verify:ip-b", config);

  assert.equal(firstKey.allowed, true);
  assert.equal(secondKey.allowed, true);
});

test("bypasses limiter when disabled in non-production", async (t) => {
  const previousDisable = mutableEnv.DISABLE_RATE_LIMITS;
  const previousNodeEnv = mutableEnv.NODE_ENV;

  mutableEnv.DISABLE_RATE_LIMITS = "true";
  mutableEnv.NODE_ENV = "development";

  t.after(() => {
    if (previousDisable === undefined) {
      delete mutableEnv.DISABLE_RATE_LIMITS;
    } else {
      mutableEnv.DISABLE_RATE_LIMITS = previousDisable;
    }

    if (previousNodeEnv === undefined) {
      delete mutableEnv.NODE_ENV;
    } else {
      mutableEnv.NODE_ENV = previousNodeEnv;
    }
  });

  const repository = createRepositoryFixture();
  const limiter = new DbRateLimiter({ repository, now: () => new Date("2026-04-27T10:00:00.000Z") });
  const config = { maxPoints: 1, windowMs: 60_000 };

  const first = await limiter.consume("login:ip-9", config);
  const second = await limiter.consume("login:ip-9", config);

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(first.retryAfterSeconds, 0);
  assert.equal(second.retryAfterSeconds, 0);
});

test("does not bypass limiter in production even if disable env is true", async (t) => {
  const previousDisable = mutableEnv.DISABLE_RATE_LIMITS;
  const previousNodeEnv = mutableEnv.NODE_ENV;

  mutableEnv.DISABLE_RATE_LIMITS = "true";
  mutableEnv.NODE_ENV = "production";

  t.after(() => {
    if (previousDisable === undefined) {
      delete mutableEnv.DISABLE_RATE_LIMITS;
    } else {
      mutableEnv.DISABLE_RATE_LIMITS = previousDisable;
    }

    if (previousNodeEnv === undefined) {
      delete mutableEnv.NODE_ENV;
    } else {
      mutableEnv.NODE_ENV = previousNodeEnv;
    }
  });

  const repository = createRepositoryFixture();
  const limiter = new DbRateLimiter({ repository, now: () => new Date("2026-04-27T10:00:00.000Z") });
  const config = { maxPoints: 1, windowMs: 60_000 };

  const first = await limiter.consume("login:ip-10", config);
  const second = await limiter.consume("login:ip-10", config);

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, false);
  assert.ok(second.retryAfterSeconds > 0);
});
