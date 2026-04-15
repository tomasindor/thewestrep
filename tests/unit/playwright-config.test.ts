import assert from "node:assert/strict";
import test from "node:test";

import playwrightConfig from "@/playwright.config";

const webServer = playwrightConfig.webServer as {
  env?: Record<string, string>;
  reuseExistingServer?: boolean;
  command?: string;
};

test("Playwright webServer injects PLAYWRIGHT env flag", () => {
  assert.ok(playwrightConfig.webServer);
  assert.equal(webServer.env?.PLAYWRIGHT, "1");
});

test("Playwright browser sends deterministic admin bypass header", () => {
  assert.equal(playwrightConfig.use?.extraHTTPHeaders?.["x-playwright-admin"], "1");
});

test("Playwright webServer never reuses an already-running dev server", () => {
  assert.ok(playwrightConfig.webServer);
  assert.equal(webServer.reuseExistingServer, false);
});

test("Playwright runs on a dedicated local port by default", () => {
  assert.equal(playwrightConfig.use?.baseURL, "http://127.0.0.1:3100");
  assert.ok(playwrightConfig.webServer);
  assert.match(webServer.command ?? "", /--port 3100$/);
});
