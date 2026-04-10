import assert from "node:assert/strict";
import test from "node:test";

import { createAdminSingleItemImportHandler } from "../../app/api/admin/imports/single/route";

test("admin single import route requires URL and returns ingestion payload", async () => {
  let ingestedUrl = "";
  let receivedDependencies: Record<string, unknown> | undefined;

  const handler = createAdminSingleItemImportHandler({
    requireAdminSession: async () => ({ user: { id: "admin-1" } }),
    getIngestionDependencies: () => ({
      db: {
        insert() {
          return { values: async () => [] };
        },
        update() {
          return {
            set() {
              return { where: async () => [] };
            },
          };
        },
      } as never,
      storeInR2: async () => undefined,
    }),
    ingestYupooSource: async (input, dependencies) => {
      ingestedUrl = input.sourceUrl;
      receivedDependencies = dependencies as unknown as Record<string, unknown> | undefined;
      return {
        importJobId: "job-1",
        importItemId: "item-1",
        importedImages: 3,
        skippedDuplicateImages: 1,
        plannedR2Writes: 21,
      };
    },
  });

  const badResponse = await handler(
    new Request("http://localhost/api/admin/imports/single", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    }),
  );
  assert.equal(badResponse.status, 400);

  const response = await handler(
    new Request("http://localhost/api/admin/imports/single", {
      method: "POST",
      body: JSON.stringify({ url: "https://deateath.x.yupoo.com/albums/111?uid=1", maxImages: 8 }),
      headers: { "content-type": "application/json" },
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(ingestedUrl, "https://deateath.x.yupoo.com/albums/111?uid=1");
  assert.equal(typeof receivedDependencies?.storeInR2, "function");

  const payload = (await response.json()) as { ok: boolean; data: { importJobId: string } };
  assert.equal(payload.ok, true);
  assert.equal(payload.data.importJobId, "job-1");
});

test("admin single import route returns 500 when ingestion fails", async () => {
  const handler = createAdminSingleItemImportHandler({
    requireAdminSession: async () => ({ user: { id: "admin-1" } }),
    getIngestionDependencies: () => ({
      db: {
        insert() {
          return { values: async () => [] };
        },
        update() {
          return {
            set() {
              return { where: async () => [] };
            },
          };
        },
      } as never,
      storeInR2: async () => undefined,
    }),
    ingestYupooSource: async () => {
      throw new Error("boom");
    },
  });

  const response = await handler(
    new Request("http://localhost/api/admin/imports/single", {
      method: "POST",
      body: JSON.stringify({ url: "https://deateath.x.yupoo.com/albums/111?uid=1" }),
      headers: { "content-type": "application/json" },
    }),
  );

  assert.equal(response.status, 500);
  const payload = (await response.json()) as { error?: string };
  assert.match(payload.error ?? "", /boom/);
});
