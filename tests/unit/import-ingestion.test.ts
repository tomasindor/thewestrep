import assert from "node:assert/strict";
import test from "node:test";

import { importImages, importItems, importJobs } from "../../lib/db/schema";
import { buildBulkIngestionInput, ingestYupooSource, parseYupooUrl } from "../../lib/imports/ingestion";
import type { GenerateImageVariantsResult } from "../../lib/media/variants";

function createFakeDb() {
  const inserts: Array<{ table: unknown; values: unknown }> = [];
  const updates: Array<{ table: unknown; values: unknown }> = [];

  return {
    inserts,
    updates,
    db: {
      insert(table: unknown) {
        return {
          values: async (values: unknown) => {
            inserts.push({ table, values });
            return [];
          },
        };
      },
      update(table: unknown) {
        return {
          set(values: unknown) {
            updates.push({ table, values });
            return {
              where: async () => [],
            };
          },
        };
      },
    },
  };
}

function createGenerateVariantsResult(originalKey: string): GenerateImageVariantsResult {
  const variantNames = ["thumb", "cart-thumb", "card", "detail", "lightbox", "admin-preview"] as const;

  const variants = Object.fromEntries(
    variantNames.map((name) => [
      name,
      {
        key: `${originalKey}/${name}.webp`,
        buffer: Buffer.from(`variant:${name}`),
        contentType: "image/webp" as const,
        width: 100,
        height: 120,
      },
    ]),
  );

  return {
    original: {
      key: originalKey,
      width: 400,
      height: 500,
    },
    variants,
  } as GenerateImageVariantsResult;
}

test("parseYupooUrl normalizes https and rejects non-yupoo hosts", () => {
  const normalized = parseYupooUrl("http://deateath.x.yupoo.com/albums/123?uid=1");
  assert.equal(normalized.href, "https://deateath.x.yupoo.com/albums/123?uid=1");

  assert.throws(() => parseYupooUrl("https://example.com/not-yupoo"), /Yupoo/);
});

test("ingestYupooSource creates staging rows and stores one original plus six variants per unique image", async () => {
  const fakeDb = createFakeDb();
  const storedKeys: string[] = [];
  const downloadCalls: string[] = [];

  const result = await ingestYupooSource(
    {
      source: "bulk",
      sourceUrl: "https://deateath.x.yupoo.com/albums/123?uid=1",
      productData: { rawName: "Album 123" },
      imageUrls: [
        "https://photo.yupoo.com/demo/albums/123/small.jpg",
        "https://photo.yupoo.com/demo/albums/123/original.jpg",
        "https://photo.yupoo.com/demo/albums/sizechart.png",
      ],
    },
    {
      db: fakeDb.db,
      idFactory: (prefix) => `${prefix}-fixed`,
      now: () => new Date("2026-04-09T00:00:00.000Z"),
      downloadImage: async (url) => {
        downloadCalls.push(url);
        return {
          body: Buffer.from(`raw:${url}`),
          contentType: "image/jpeg",
        };
      },
      generateVariants: async ({ originalKey }) => createGenerateVariantsResult(originalKey),
      storeInR2: async (write) => {
        storedKeys.push(write.key);
      },
    },
  );

  assert.equal(result.importedImages, 2);
  assert.equal(result.skippedDuplicateImages, 1);
  assert.equal(result.plannedR2Writes, 14);
  assert.deepEqual(downloadCalls, [
    "https://photo.yupoo.com/demo/albums/123/original.jpg",
    "https://photo.yupoo.com/demo/albums/sizechart.png",
  ]);
  assert.equal(storedKeys.length, 14);

  const jobInsert = fakeDb.inserts.find((entry) => entry.table === importJobs);
  const itemInsert = fakeDb.inserts.find((entry) => entry.table === importItems);
  const imageInsert = fakeDb.inserts.filter((entry) => entry.table === importImages);

  assert.equal(Boolean(jobInsert), true);
  assert.equal(Boolean(itemInsert), true);
  assert.equal(imageInsert.length, 2);

  const imageRows = imageInsert.map((entry) => entry.values as { order: number; isSizeGuide: boolean; variantsManifest: { variants: Record<string, string | undefined> } });
  assert.deepEqual(imageRows.map((row) => row.order), [0, 1]);
  assert.deepEqual(imageRows.map((row) => row.isSizeGuide), [false, true]);
  assert.equal(Boolean(imageRows[0]?.variantsManifest.variants.adminPreview), true);
  assert.equal(Boolean(imageRows[0]?.variantsManifest.variants.cartThumb), true);
});

test("ingestYupooSource falls back to scraper when imageUrls are omitted", async () => {
  const fakeDb = createFakeDb();
  let scraperCalls = 0;

  const result = await ingestYupooSource(
    {
      source: "admin",
      sourceUrl: "https://deateath.x.yupoo.com/albums/456?uid=1",
      productData: { rawName: "Single item" },
    },
    {
      db: fakeDb.db,
      idFactory: (prefix) => `${prefix}-single`,
      scrapeYupooImages: async () => {
        scraperCalls += 1;
        return ["https://photo.yupoo.com/demo/albums/single/original.jpg"];
      },
      downloadImage: async () => ({
        body: Buffer.from("single"),
        contentType: "image/jpeg",
      }),
      generateVariants: async ({ originalKey }) => createGenerateVariantsResult(originalKey),
    },
  );

  assert.equal(scraperCalls, 1);
  assert.equal(result.importedImages, 1);
  assert.equal(result.plannedR2Writes, 7);
});

test("buildBulkIngestionInput maps legacy script payload into shared ingestion input", () => {
  const input = buildBulkIngestionInput({
    albumUrl: "https://deateath.x.yupoo.com/albums/789?uid=1",
    albumHref: "/albums/789",
    productData: {
      rawName: "Album 789",
      productName: "Remera",
      brandName: "Marca",
      categoryName: "Remeras",
    },
    imageUrls: ["https://photo.yupoo.com/demo/albums/789/original.jpg"],
  });

  assert.equal(input.source, "bulk");
  assert.equal(input.sourceUrl, "https://deateath.x.yupoo.com/albums/789?uid=1");
  assert.equal(input.sourceReference, "/albums/789");
  assert.deepEqual(input.productData, {
    rawName: "Album 789",
    productName: "Remera",
    brandName: "Marca",
    categoryName: "Remeras",
  });
  assert.deepEqual(input.imageUrls, ["https://photo.yupoo.com/demo/albums/789/original.jpg"]);
});
