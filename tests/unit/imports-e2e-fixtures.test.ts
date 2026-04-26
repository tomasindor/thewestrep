import assert from "node:assert/strict";
import test from "node:test";

import { buildPlaywrightImportsQueueFixture, resolveImportsQueueForRender } from "@/lib/imports/e2e-fixtures";
import type { CurationQueuePayload } from "@/lib/imports/curation";

test("resolveImportsQueueForRender forces deterministic fixture in Playwright runtime", () => {
  const liveQueue: CurationQueuePayload = {
    items: [{
      id: "db-item-1",
      status: "approved",
      mediaStatus: "ready",
      sourceReference: null,
      finalName: "Desde DB",
      finalPrice: 100,
      brand: "DB",
      comboScore: null,
      comboEligible: false,
      comboGroup: null,
      activeImageCount: 3,
      productName: "Desde DB",
      coverImageId: null,
      promotionEligible: true,
      promotionBlockedReason: null,
      images: [],
    }],
  };

  const result = resolveImportsQueueForRender({
    isPlaywrightRuntime: true,
    liveQueue,
  });

  assert.deepEqual(result, buildPlaywrightImportsQueueFixture());
});

test("resolveImportsQueueForRender keeps live queue outside Playwright runtime", () => {
  const liveQueue: CurationQueuePayload = {
    items: [{
      id: "db-item-1",
      status: "approved",
      mediaStatus: "ready",
      sourceReference: null,
      finalName: "Desde DB",
      finalPrice: 100,
      brand: "DB",
      comboScore: null,
      comboEligible: false,
      comboGroup: null,
      activeImageCount: 3,
      productName: "Desde DB",
      coverImageId: null,
      promotionEligible: true,
      promotionBlockedReason: null,
      images: [],
    }],
  };

  const result = resolveImportsQueueForRender({
    isPlaywrightRuntime: false,
    liveQueue,
  });

  assert.strictEqual(result, liveQueue);
});
