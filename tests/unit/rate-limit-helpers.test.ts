import assert from "node:assert/strict";
import test, { describe } from "node:test";

import {
  applyRateLimit,
  createRateLimiter,
  extractClientIp,
} from "../../lib/security/with-rate-limit";

const mutableEnv = process.env as Record<string, string | undefined>;

// Reset the internal limiters Map between tests by reimporting
// Since the module uses a module-level Map, we need to work around it
// by using unique keys for each test group.

describe("extractClientIp", () => {
  test("extracts IP from x-forwarded-for header", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "192.168.1.1" },
    });
    assert.equal(extractClientIp(request), "192.168.1.1");
  });

  test("takes first IP when multiple x-forwarded-for values", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "10.0.0.1, 172.16.0.1, 192.168.1.1" },
    });
    assert.equal(extractClientIp(request), "10.0.0.1");
  });

  test('returns "unknown" without x-forwarded-for', () => {
    const request = new Request("http://localhost");
    assert.equal(extractClientIp(request), "unknown");
  });
});

describe("createRateLimiter", () => {
  test("same key returns same instance (memoization)", () => {
    const key = `memo-test-${Date.now()}`;
    const limiter1 = createRateLimiter(key, { maxRequests: 10, windowMs: 60_000 });
    const limiter2 = createRateLimiter(key, { maxRequests: 10, windowMs: 60_000 });
    assert.strictEqual(limiter1, limiter2);
  });

  test("different keys return different instances", () => {
    const keyA = `diff-test-a-${Date.now()}`;
    const keyB = `diff-test-b-${Date.now()}`;
    const limiterA = createRateLimiter(keyA, { maxRequests: 10, windowMs: 60_000 });
    const limiterB = createRateLimiter(keyB, { maxRequests: 10, windowMs: 60_000 });
    assert.notStrictEqual(limiterA, limiterB);
  });
});

describe("applyRateLimit", () => {
  test("bypasses checks when disabled in development", async (t) => {
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

    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "7.7.7.7" },
    });

    let consumeCalled = false;
    const result = await applyRateLimit(request, "disabled-dev", { maxRequests: 1, windowMs: 60_000 }, {
      consumeRateLimit: async () => {
        consumeCalled = true;
        return { allowed: false, retryAfterSeconds: 99 };
      },
    });

    assert.equal(result, null);
    assert.equal(consumeCalled, false);
  });

  test("does not bypass checks in production", async (t) => {
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

    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "8.8.8.8" },
    });
    const result = await applyRateLimit(req, "disabled-prod", { maxRequests: 2, windowMs: 60_000 }, {
      consumeRateLimit: async () => ({ allowed: false, retryAfterSeconds: 42 }),
    }) as Response;

    assert.notEqual(result, null);
    assert.equal(result.status, 429);
    assert.equal(result.headers.get("retry-after"), "42");
  });

  test("consumes DB-backed key namespaced by route and IP", async () => {
    const key = `db-consume-${Date.now()}`;
    let consumedKey = "";
    let consumedConfig: { maxPoints: number; windowMs: number } | null = null;

    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });

    const result = await applyRateLimit(request, key, { maxRequests: 5, windowMs: 60_000 }, {
      consumeRateLimit: async (rateLimitKey, config) => {
        consumedKey = rateLimitKey;
        consumedConfig = config;
        return { allowed: true, retryAfterSeconds: 0 };
      },
    });

    assert.equal(result, null);
    assert.equal(consumedKey, `${key}:1.2.3.4`);
    assert.deepEqual(consumedConfig, { maxPoints: 5, windowMs: 60_000 });
  });

  test("returns null when within limit", async () => {
    const key = `within-limit-${Date.now()}`;
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    const result = await applyRateLimit(request, key, { maxRequests: 5, windowMs: 60_000 }, {
      consumeRateLimit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
    });
    assert.equal(result, null);
  });

  test("returns 429 when limit exceeded", async () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "5.6.7.8" },
    });
    const result = await applyRateLimit(req, "exceed-limit", { maxRequests: 2, windowMs: 60_000 }, {
      consumeRateLimit: async () => ({ allowed: false, retryAfterSeconds: 42 }),
    }) as Response;
    assert.notEqual(result, null);
    assert.equal(result.status, 429);
    assert.equal(result.headers.get("retry-after"), "42");
    assert.ok(result.headers.has("Retry-After"));
  });

  test("fail-open on error", async () => {
    const key = `fail-open-${Date.now()}`;
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "9.9.9.9" },
    });

    const result = await applyRateLimit(request, key, { maxRequests: 1, windowMs: 60_000 }, {
      consumeRateLimit: async () => {
        throw new Error("db unavailable");
      },
    });
    assert.equal(result, null);
  });

  test("normal behavior remains when bypass env is missing", async (t) => {
    const previousDisable = mutableEnv.DISABLE_RATE_LIMITS;
    const previousNodeEnv = mutableEnv.NODE_ENV;

    delete mutableEnv.DISABLE_RATE_LIMITS;
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

    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "6.6.6.6" },
    });

    const result = await applyRateLimit(req, "normal-missing-env", { maxRequests: 1, windowMs: 60_000 }, {
      consumeRateLimit: async () => ({ allowed: false, retryAfterSeconds: 33 }),
    }) as Response;

    assert.equal(result.status, 429);
    assert.equal(result.headers.get("retry-after"), "33");
  });
});
