import assert from "node:assert/strict";
import test from "node:test";

import { createImportsCurationServiceFromDb } from "../../lib/imports/curation";

test("listQueue excludes consumed/promoted staging items", async () => {
  const service = createImportsCurationServiceFromDb({
    db: {
      query: {
        importItems: {
          findMany: async () => [
            {
              id: "item-consumed",
              importJobId: "job-1",
              status: "approved",
              productData: { name: "Consumed", _promotionConsumedAt: "2026-04-11T00:00:00.000Z" },
              updatedAt: new Date("2026-04-11T00:00:00.000Z"),
            },
            {
              id: "item-active",
              importJobId: "job-2",
              status: "approved",
              productData: { name: "Active" },
              updatedAt: new Date("2026-04-10T00:00:00.000Z"),
            },
            {
              id: "item-promoted-without-consumed-marker",
              importJobId: "job-3",
              status: "promoted",
              productData: { name: "Already promoted" },
              updatedAt: new Date("2026-04-09T00:00:00.000Z"),
            },
          ],
        },
        importImages: {
          findMany: async () => {
            return [
              {
                id: "img-active",
                importItemId: "item-active",
                sourceUrl: "https://example.com/active.jpg",
                reviewState: "approved",
                isSizeGuide: false,
                order: 0,
              },
            ];
          },
        },
        importJobs: {
          findFirst: async () => ({ sourceReference: "https://example.com/job" }),
        },
      },
      update: () => ({ set: () => ({ where: async () => ({}) }) }),
    } as never,
  });

  const queue = await service.listQueue({ limit: 20 });

  assert.equal(queue.items.length, 1);
  assert.equal(queue.items[0]?.id, "item-active");
});
