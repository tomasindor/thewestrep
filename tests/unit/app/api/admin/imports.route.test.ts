import assert from "node:assert/strict";
import test from "node:test";

import { createAdminImportsRouteHandlers } from "../../../../../lib/imports/admin-imports-route-handlers";

test("GET returns product-centric queue with direct Yupoo source URLs", async () => {
  const handlers = createAdminImportsRouteHandlers({
    requireAdminSession: async () => ({ user: { id: "admin-1" } }),
    listQueue: async () => ({
      items: [{
        id: "item-1",
        status: "approved",
        mediaStatus: "pending",
        sourceReference: "https://deateath.x.yupoo.com/albums/1?uid=1",
        finalName: "Remera test final",
        finalPrice: 89990,
        brand: "Off-White",
        comboScore: 0.82,
        comboEligible: true,
        comboGroup: "look-001",
        activeImageCount: 1,
        productName: "Remera test",
        coverImageId: "img-2",
        promotionEligible: true,
        promotionBlockedReason: null,
        images: [{
          id: "img-2",
          importItemId: "item-1",
          sourceUrl: "https://photo.yupoo.com/demo/2.jpg",
          previewUrl: "https://photo.yupoo.com/demo/2-small-real.jpg",
          reviewState: "approved",
          isSizeGuide: false,
          order: 1,
        }],
      }],
    }),
  });

  const response = await handlers.GET(new Request("http://localhost/api/admin/imports"));
  assert.equal(response.status, 200);

  const payload = (await response.json()) as {
    ok: boolean;
    data: {
      items: Array<{
        id: string;
        finalName: string;
        finalPrice: number;
        brand: string;
        activeImageCount: number;
        promotionEligible: boolean;
        mediaStatus: string;
        images: Array<{ sourceUrl: string; previewUrl: string | null }>;
      }>;
    };
  };

  assert.equal(payload.ok, true);
  assert.equal(payload.data.items[0]?.id, "item-1");
  assert.equal(payload.data.items[0]?.finalName, "Remera test final");
  assert.equal(payload.data.items[0]?.finalPrice, 89990);
  assert.equal(payload.data.items[0]?.brand, "Off-White");
  assert.equal(payload.data.items[0]?.activeImageCount, 1);
  assert.equal(payload.data.items[0]?.promotionEligible, true);
  assert.equal(payload.data.items[0]?.mediaStatus, "pending");
  assert.match(payload.data.items[0]?.images[0]?.sourceUrl ?? "", /photo\.yupoo\.com/);
  assert.match(payload.data.items[0]?.images[0]?.previewUrl ?? "", /small-real/);
});

test("POST rejects deprecated explicit approve action", async () => {
  const handlers = createAdminImportsRouteHandlers({
    requireAdminSession: async () => ({ user: { id: "admin-1" } }),
  });

  const response = await handlers.POST(new Request("http://localhost/api/admin/imports", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ imageId: "img-1", action: "approve" }),
  }));

  assert.equal(response.status, 400);
});

test("POST forwards reject/restore/size-guide image mutations", async () => {
  const calls: Array<Record<string, unknown>> = [];

  const handlers = createAdminImportsRouteHandlers({
    requireAdminSession: async () => ({ user: { id: "admin-1" } }),
    applyImageAction: async (input) => {
      calls.push(input as unknown as Record<string, unknown>);
      return {
        importItemId: "item-1",
        imageId: input.imageId,
        previousState: "approved",
        nextState: input.action === "reject" ? "rejected" : "approved",
        importItemStatus: "approved",
        coverImageId: "img-2",
        nextIsSizeGuide: input.action === "toggle-size-guide" ? true : false,
      };
    },
  });

  const rejectResponse = await handlers.POST(new Request("http://localhost/api/admin/imports", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ imageId: "img-1", action: "reject" }),
  }));
  assert.equal(rejectResponse.status, 200);

  const toggleResponse = await handlers.POST(new Request("http://localhost/api/admin/imports", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ imageId: "img-1", action: "toggle-size-guide" }),
  }));
  assert.equal(toggleResponse.status, 200);

  assert.deepEqual(calls, [
    { imageId: "img-1", action: "reject", previousState: undefined },
    { imageId: "img-1", action: "toggle-size-guide", previousState: undefined },
  ]);
});

test("POST triggers bulk promotion from imports page", async () => {
  let calledWith: string[] | undefined;

  const handlers = createAdminImportsRouteHandlers({
    requireAdminSession: async () => ({ user: { id: "admin-1" } }),
    promoteEligibleItems: async ({ itemIds }) => {
      calledWith = itemIds;
      return {
        promotedCount: 1,
        promotedItemIds: ["item-1"],
        blocked: [
          { itemId: "item-2", reason: "insufficient useful images" },
          { itemId: "item-3", reason: "Falló la generación de variantes diferidas: sharp exploded", mediaStatus: "failed" },
        ],
      };
    },
  });

  const response = await handlers.POST(new Request("http://localhost/api/admin/imports", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "bulk-promote", itemIds: ["item-1", "item-2", "item-3"] }),
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(calledWith, ["item-1", "item-2", "item-3"]);

  const payload = (await response.json()) as {
    ok: boolean;
    data: { promotedCount: number; blocked: Array<{ itemId: string; reason: string; mediaStatus?: string }> };
  };
  assert.equal(payload.ok, true);
  assert.equal(payload.data.promotedCount, 1);
  assert.equal(payload.data.blocked.length, 2);
  assert.equal(payload.data.blocked[0]?.itemId, "item-2");
  assert.match(payload.data.blocked[0]?.reason ?? "", /insufficient useful images/i);
  assert.equal(payload.data.blocked[1]?.itemId, "item-3");
  assert.equal(payload.data.blocked[1]?.mediaStatus, "failed");
  assert.match(payload.data.blocked[1]?.reason ?? "", /variantes diferidas/i);
});

test("POST supports per-product promotion action in addition to bulk", async () => {
  let calledWith: string[] | undefined;

  const handlers = createAdminImportsRouteHandlers({
    requireAdminSession: async () => ({ user: { id: "admin-1" } }),
    promoteEligibleItems: async ({ itemIds }) => {
      calledWith = itemIds;
      return {
        promotedCount: 1,
        promotedItemIds: ["item-1"],
        blocked: [],
      };
    },
  });

  const response = await handlers.POST(new Request("http://localhost/api/admin/imports", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "promote-item", itemId: "item-1" }),
  }));

  assert.equal(response.status, 200);
  assert.deepEqual(calledWith, ["item-1"]);
});

test("POST clear-queue triggers staging-only imports cleanup action", async () => {
  let clearCalls = 0;

  const handlers = createAdminImportsRouteHandlers({
    requireAdminSession: async () => ({ user: { id: "admin-1" } }),
    clearImportsQueue: async () => {
      clearCalls += 1;
      return { deletedJobs: 3 };
    },
  });

  const response = await handlers.POST(new Request("http://localhost/api/admin/imports", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "clear-queue" }),
  }));

  assert.equal(response.status, 200);
  assert.equal(clearCalls, 1);

  const payload = (await response.json()) as {
    ok: boolean;
    data: { deletedJobs: number };
  };

  assert.equal(payload.ok, true);
  assert.equal(payload.data.deletedJobs, 3);
});
