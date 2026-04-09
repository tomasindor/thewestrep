/**
 * Runtime boundary tests for checkout modules.
 * This test verifies that:
 * 1. checkout.shared.ts does NOT export buildOrderReference
 * 2. checkout.server.ts exports buildOrderReference
 * 3. checkout.server.ts contains "import server-only" for explicit boundary
 * 4. The resolver shim doesn't hide unrelated resolution errors
 */
import assert from "node:assert";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

// Verify shared module does NOT export buildOrderReference
import * as checkoutShared from "../../lib/orders/checkout.shared";

// Verify server module exports buildOrderReference
import { buildOrderReference } from "../../lib/orders/checkout.server";

test("checkout.shared does NOT export buildOrderReference", () => {
  // This test will fail if buildOrderReference is accidentally exported from shared
  const hasBuildOrderReference = "buildOrderReference" in checkoutShared;
  assert.equal(hasBuildOrderReference, false, "checkout.shared should NOT export buildOrderReference");
});

test("checkout.server exports buildOrderReference", () => {
  // Verify the server module exports what it should
  assert.equal(typeof buildOrderReference, "function", "buildOrderReference should be a function");
});

test("buildOrderReference returns correct format", () => {
  const reference = buildOrderReference(new Date("2026-04-09T12:00:00.000Z"));
  
  // Format: TWR-YYYY-XXXXXXXX
  assert.match(reference, /^TWR-2026-[A-F0-9]{8}$/, "Reference should match TWR-YYYY-XXXXXXXX format");
});

test("buildOrderReference generates unique references", () => {
  const ref1 = buildOrderReference(new Date("2026-04-09T12:00:00.000Z"));
  const ref2 = buildOrderReference(new Date("2026-04-09T12:00:01.000Z"));

  // Even with different timestamps, format should be consistent
  assert.match(ref1, /^TWR-2026-[A-F0-9]{8}$/);
  assert.match(ref2, /^TWR-2026-[A-F0-9]{8}$/);
  // Verify uniqueness
  assert.notEqual(ref1, ref2, "Different timestamps should generate different references");
});

// Structural evidence: checkout.server.ts contains "import server-only"
test("checkout.server.ts contains explicit server-only marker", () => {
  const serverModulePath = path.resolve("./lib/orders/checkout.server.ts");
  const sourceCode = fs.readFileSync(serverModulePath, "utf-8");
  
  // Verify the server-only import is present
  assert.ok(
    sourceCode.includes('import "server-only"'),
    "checkout.server.ts MUST contain 'import \"server-only\"' for explicit boundary"
  );
});

// Verify that missing/unrelated specifiers still surface as resolution errors
test("resolver does not hide unrelated module resolution errors", async () => {
  // This test verifies the resolver is minimal - it should NOT silently rewrite
  // unrelated specifiers. If a non-existent module is imported, Node should error.
  // We use a guaranteed non-existent module path
  const nonExistentPath = "./tests/unit/this-module-does-not-exist-12345.test.ts";
  
  let threwError = false;
  try {
    await import(nonExistentPath);
  } catch (e: unknown) {
    // Expected: Module not found error
    threwError = true;
    const err = e as { code?: string; message?: string };
    assert.ok(
      err.code === "ERR_MODULE_NOT_FOUND" || err.message?.includes("not found"),
      "Missing module should throw ERR_MODULE_NOT_FOUND"
    );
  }
  
  assert.ok(threwError, "Non-existent module should throw resolution error");
});