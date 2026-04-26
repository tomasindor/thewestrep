import assert from "node:assert/strict";
import test from "node:test";

import { importImages, importItems, importJobs } from "../../../../lib/db/schema";
import { ingestYupooSource } from "../../../../lib/imports/ingestion";

function createFakeDb() {
  const inserts: Array<{ table: unknown; values: unknown }> = [];

  return {
    inserts,
    db: {
      insert(table: unknown) {
        return {
          values: async (values: unknown) => {
            inserts.push({ table, values });
            return [];
          },
        };
      },
      update() {
        return {
          set() {
            return {
              where: async () => [],
            };
          },
        };
      },
    },
  };
}

const baseInput = {
  source: "bulk" as const,
  sourceUrl: "https://deateath.x.yupoo.com/albums/123?uid=1",
  productData: { rawName: "Album 123", priceArs: 98000 },
  imageUrls: [
    "https://photo.yupoo.com/demo/albums/123/a/look-a.jpg",
    "https://photo.yupoo.com/demo/albums/123/b/look-b.jpg",
  ],
};

test("new album identity creates staging records", async () => {
  const fakeDb = createFakeDb();

  const result = await ingestYupooSource(baseInput, {
    db: fakeDb.db,
    idFactory: (prefix) => `${prefix}-new-album`,
    findYupooDuplicate: async () => null,
  });

  assert.equal(result.skipped, false);
  assert.equal(result.skipReason, undefined);

  const jobInsert = fakeDb.inserts.find((entry) => entry.table === importJobs);
  const itemInsert = fakeDb.inserts.find((entry) => entry.table === importItems);
  const imageInserts = fakeDb.inserts.filter((entry) => entry.table === importImages);

  assert.equal(Boolean(jobInsert), true);
  assert.equal(Boolean(itemInsert), true);
  assert.equal(imageInserts.length, 2);
});

test("existing catalog product identity skips before staging inserts", async () => {
  const fakeDb = createFakeDb();

  const result = await ingestYupooSource(baseInput, {
    db: fakeDb.db,
    idFactory: (prefix) => `${prefix}-existing-catalog`,
    findYupooDuplicate: async () => "catalog",
  });

  assert.equal(result.skipped, true);
  assert.equal(result.skipReason, "already-exists");
  assert.equal(result.importedImages, 0);
  assert.equal(fakeDb.inserts.length, 0);
});

test("existing staging identity skips before staging inserts", async () => {
  const fakeDb = createFakeDb();

  const result = await ingestYupooSource(baseInput, {
    db: fakeDb.db,
    idFactory: (prefix) => `${prefix}-existing-staging`,
    findYupooDuplicate: async () => "staging",
  });

  assert.equal(result.skipped, true);
  assert.equal(result.skipReason, "already-exists");
  assert.equal(result.importedImages, 0);
  assert.equal(fakeDb.inserts.length, 0);
});

test("same album with different Yupoo URL format resolves to same stable identity", async () => {
  const fakeDb = createFakeDb();
  const capturedIdentities: string[] = [];

  const result = await ingestYupooSource(
    {
      ...baseInput,
      sourceUrl: "http://deateath.x.yupoo.com/albums/123/?uid=99&tab=gallery#hero",
      sourceReference: "/albums/123/?uid=99&tab=gallery",
    },
    {
      db: fakeDb.db,
      idFactory: (prefix) => `${prefix}-canonical-identity`,
      findYupooDuplicate: async (identity) => {
        capturedIdentities.push(identity.canonicalSourceUrl);
        capturedIdentities.push(identity.albumIdentity);
        return identity.albumIdentity === "deateath.x.yupoo.com/albums/123" ? "catalog" : null;
      },
    },
  );

  assert.equal(result.skipped, true);
  assert.equal(result.skipReason, "already-exists");
  assert.equal(fakeDb.inserts.length, 0);
  assert.equal(capturedIdentities.includes("https://deateath.x.yupoo.com/albums/123"), true);
  assert.equal(capturedIdentities.includes("deateath.x.yupoo.com/albums/123"), true);
});
