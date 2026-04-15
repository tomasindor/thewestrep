import assert from "node:assert/strict";
import test from "node:test";

import { isPlaywrightRuntime } from "@/lib/testing/playwright-runtime";

test("isPlaywrightRuntime enables bypass from PLAYWRIGHT env flag", () => {
  assert.equal(isPlaywrightRuntime({ playwrightEnv: "1", requestHeader: null }), true);
});

test("isPlaywrightRuntime enables bypass from explicit Playwright request header", () => {
  assert.equal(isPlaywrightRuntime({ playwrightEnv: "0", requestHeader: "1" }), true);
});

test("isPlaywrightRuntime stays disabled outside Playwright", () => {
  assert.equal(isPlaywrightRuntime({ playwrightEnv: undefined, requestHeader: null }), false);
});
