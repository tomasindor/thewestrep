import assert from "node:assert/strict";
import test from "node:test";

import { createAdminImportsRouteHandlers } from "../../app/api/admin/imports/route";

test("admin imports route GET returns curation queue payload", async () => {
  const handlers = createAdminImportsRouteHandlers({
    requireAdminSession: async () => ({ user: { id: "admin-1" } }),
    listQueue: async () => ({
      items: [
        {
          id: "item-1",
          status: "pending",
          sourceReference: "https://deateath.x.yupoo.com/albums/1?uid=1",
          productName: "Remera test",
          coverImageId: "img-2",
          images: [
            {
              id: "img-2",
              importItemId: "item-1",
              originalUrl: "https://photo.yupoo.com/demo/2.jpg",
              previewUrl: "https://photo.yupoo.com/demo/2.jpg",
              reviewState: "approved",
              isSizeGuide: false,
              order: 1,
            },
          ],
        },
      ],
    }),
  });

  const response = await handlers.GET(new Request("http://localhost/api/admin/imports"));
  assert.equal(response.status, 200);

  const payload = (await response.json()) as {
    ok: boolean;
    data: { items: Array<{ id: string; coverImageId: string | null }> };
  };

  assert.equal(payload.ok, true);
  assert.equal(payload.data.items[0]?.id, "item-1");
  assert.equal(payload.data.items[0]?.coverImageId, "img-2");
});

test("admin imports route POST validates and applies review actions", async () => {
  let calledWith: { imageId: string; action: string; previousState?: "pending" | "approved" | "rejected" } | null = null;

  const handlers = createAdminImportsRouteHandlers({
    requireAdminSession: async () => ({ user: { id: "admin-1" } }),
    applyReviewAction: async (input) => {
      calledWith = input;

        return {
          importItemId: "item-1",
          imageId: input.imageId,
          nextState: input.action === "restore" && input.previousState ? input.previousState : "approved",
          previousState: "rejected",
          importItemStatus: "approved",
          coverImageId: "img-2",
      };
    },
  });

  const badResponse = await handlers.POST(new Request("http://localhost/api/admin/imports", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ imageId: "" }),
  }));
  assert.equal(badResponse.status, 400);

  const response = await handlers.POST(new Request("http://localhost/api/admin/imports", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ imageId: "img-2", action: "restore", previousState: "approved" }),
  }));

  assert.equal(response.status, 200);
  assert.deepEqual(calledWith, { imageId: "img-2", action: "restore", previousState: "approved" });

  const payload = (await response.json()) as { ok: boolean; data: { nextState: string } };
  assert.equal(payload.ok, true);
  assert.equal(payload.data.nextState, "approved");
});
