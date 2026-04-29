import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("customer-credentials shared module stays browser-safe", () => {
  const sharedModulePath = path.resolve("./lib/auth/customer-credentials.ts");
  const sourceCode = fs.readFileSync(sharedModulePath, "utf-8");

  assert.ok(!sourceCode.includes("node:crypto"), "shared credentials module must not import node:crypto");
  assert.ok(!sourceCode.includes("node:util"), "shared credentials module must not import node:util");
  assert.ok(
    !sourceCode.includes("customer-password"),
    "shared credentials module must not import server-only password helpers",
  );
});

test("customer-credentials server module is explicitly server-only", () => {
  const serverModulePath = path.resolve("./lib/auth/customer-credentials-server.ts");
  const sourceCode = fs.readFileSync(serverModulePath, "utf-8");

  assert.ok(sourceCode.includes('import "server-only"'), "server credentials module must enforce server-only boundary");
  assert.ok(
    sourceCode.includes("customer-password"),
    "server credentials module should delegate hashing/verifying to customer-password",
  );
});
