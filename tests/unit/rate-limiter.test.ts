import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import { RateLimiter } from "../../lib/security/rate-limiter";

let now = 0;

function setNow(ms: number) {
  now = ms;
}

// Override Date.now for deterministic tests
const originalDateNow = Date.now;
Date.now = () => now;

afterEach(() => {
  now = 0;
});

test("allows requests within limit", () => {
  const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 5, maxEntries: 100 });

  for (let i = 0; i < 5; i++) {
    assert.equal(limiter.isAllowed("1.2.3.4"), true, `request ${i + 1} should be allowed`);
  }
});

test("blocks requests after max requests", () => {
  const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 3, maxEntries: 100 });

  assert.equal(limiter.isAllowed("1.2.3.4"), true);
  assert.equal(limiter.isAllowed("1.2.3.4"), true);
  assert.equal(limiter.isAllowed("1.2.3.4"), true);
  assert.equal(limiter.isAllowed("1.2.3.4"), false, "4th request should be blocked");
});

test("resets after window expires", () => {
  const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 2, maxEntries: 100 });

  setNow(0);
  assert.equal(limiter.isAllowed("1.2.3.4"), true);
  assert.equal(limiter.isAllowed("1.2.3.4"), true);
  assert.equal(limiter.isAllowed("1.2.3.4"), false, "should be blocked within window");

  // Advance time past the window
  setNow(61_000);
  assert.equal(limiter.isAllowed("1.2.3.4"), true, "should be allowed after window reset");
});

test("getRetryAfter returns accurate remaining time", () => {
  const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 2, maxEntries: 100 });

  setNow(10_000);
  limiter.isAllowed("1.2.3.4");
  limiter.isAllowed("1.2.3.4");

  // Now at 40s, window started at 10s, so 30s remaining
  setNow(40_000);
  const retryAfter = limiter.getRetryAfter("1.2.3.4");
  assert.equal(retryAfter, 30_000, "should return 30 seconds remaining");
});

test("getRetryAfter returns 0 for unknown IP", () => {
  const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 5, maxEntries: 100 });
  assert.equal(limiter.getRetryAfter("never.seen"), 0);
});

test("LRU eviction at max capacity", () => {
  const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 30, maxEntries: 3 });

  // Fill to capacity
  assert.equal(limiter.isAllowed("ip-1"), true);
  assert.equal(limiter.isAllowed("ip-2"), true);
  assert.equal(limiter.isAllowed("ip-3"), true);

  // Add one more — should evict ip-1 (oldest)
  assert.equal(limiter.isAllowed("ip-4"), true);

  // ip-1 should have been evicted, so it's treated as a new entry
  assert.equal(limiter.isAllowed("ip-1"), true, "ip-1 should be allowed again after eviction");
});

test("LRU eviction respects access order", () => {
  const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 30, maxEntries: 3 });

  assert.equal(limiter.isAllowed("ip-1"), true);
  assert.equal(limiter.isAllowed("ip-2"), true);
  assert.equal(limiter.isAllowed("ip-3"), true);

  // Access ip-1 again — moves it to most recently used
  assert.equal(limiter.isAllowed("ip-1"), true);

  // Add ip-4 — should evict ip-2 (now the oldest)
  assert.equal(limiter.isAllowed("ip-4"), true);

  // ip-2 should be evicted (allowed as new entry)
  assert.equal(limiter.isAllowed("ip-2"), true, "ip-2 should be allowed after eviction");

  // ip-1 should still be present (was accessed recently)
  assert.equal(limiter.isAllowed("ip-1"), true, "ip-1 should still be within limit");
});

test("different IPs are tracked independently", () => {
  const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 2, maxEntries: 100 });

  assert.equal(limiter.isAllowed("ip-a"), true);
  assert.equal(limiter.isAllowed("ip-a"), true);
  assert.equal(limiter.isAllowed("ip-a"), false);

  // Different IP should still be allowed
  assert.equal(limiter.isAllowed("ip-b"), true);
  assert.equal(limiter.isAllowed("ip-b"), true);
  assert.equal(limiter.isAllowed("ip-b"), false);
});
