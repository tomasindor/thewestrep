import assert from "node:assert/strict";
import test from "node:test";

import { createBulkIngestionDependencies } from "../../lib/imports/bulk-r2-wiring";

test("createBulkIngestionDependencies returns db plus concrete R2 storeInR2 writer", async () => {
  const writes: Array<{
    key: string;
    body: Buffer;
    contentType?: string;
    cacheControl?: string;
    metadata?: Record<string, string>;
  }> = [];
  const fakeDb = {
    insert: () => ({ values: async () => [] }),
    update: () => ({ set: () => ({ where: async () => [] }) }),
  };

  const dependencies = createBulkIngestionDependencies(fakeDb, {
    createStorage: () => ({
      putObject: async (input: {
        key: string;
        body: Buffer;
        contentType?: string;
        cacheControl?: string;
        metadata?: Record<string, string>;
      }) => {
        writes.push(input);
        return { etag: "ok" };
      },
    }),
  });

  assert.equal(dependencies.db, fakeDb);
  assert.equal(typeof dependencies.storeInR2, "function");

  await dependencies.storeInR2?.({
    key: "imports/job/item/thumb.webp",
    body: Buffer.from("thumb"),
    contentType: "image/webp",
    cacheControl: "public, max-age=31536000, immutable",
    metadata: { role: "variant" },
  });

  assert.deepEqual(writes, [
    {
      key: "imports/job/item/thumb.webp",
      body: Buffer.from("thumb"),
      contentType: "image/webp",
      cacheControl: "public, max-age=31536000, immutable",
      metadata: { role: "variant" },
    },
  ]);
});
