import assert from "node:assert/strict";
import test from "node:test";

import { importImages, importItems, importJobs } from "../../lib/db/schema";
import { buildBulkIngestionInput, ingestYupooSource, parseYupooUrl } from "../../lib/imports/ingestion";
import type { GeneratePreviewVariantsResult } from "../../lib/media/variants";

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

function createGenerateVariantsResult(originalKey: string): GeneratePreviewVariantsResult {
  const variants = {
    "admin-preview": {
      key: `${originalKey}/admin-preview.webp`,
      buffer: Buffer.from("variant:admin-preview"),
      contentType: "image/webp" as const,
      width: 100,
      height: 120,
    },
  };

  return {
    original: {
      key: originalKey,
      width: 400,
      height: 500,
    },
    variants,
  } as GeneratePreviewVariantsResult;
}

test("parseYupooUrl normalizes https and rejects non-yupoo hosts", () => {
  const normalized = parseYupooUrl("http://deateath.x.yupoo.com/albums/123?uid=1");
  assert.equal(normalized.href, "https://deateath.x.yupoo.com/albums/123?uid=1");

  assert.throws(() => parseYupooUrl("https://example.com/not-yupoo"), /Yupoo/);
});

test("ingestYupooSource creates staging rows with source/preview URL pairs per unique image", async () => {
  const fakeDb = createFakeDb();
  const storedKeys: string[] = [];
  const downloadCalls: string[] = [];
  const generateCalls: string[] = [];

  const result = await ingestYupooSource(
    {
      source: "bulk",
      sourceUrl: "https://deateath.x.yupoo.com/albums/123?uid=1",
      productData: { rawName: "Album 123", finalPrice: 89990 },
      imageUrls: [
        "https://photo.yupoo.com/demo/albums/123/a/model-angle-a.jpg",
        "https://photo.yupoo.com/demo/albums/123/a/model-angle-a_small.jpg",
        "https://photo.yupoo.com/demo/albums/123/b/model-angle-b.jpg",
        "https://photo.yupoo.com/demo/albums/123/guide/sizechart.png",
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
      generateVariants: async ({ originalKey }) => {
        generateCalls.push(originalKey);
        return createGenerateVariantsResult(originalKey);
      },
      storeInR2: async (write) => {
        storedKeys.push(write.key);
      },
    },
  );

  assert.equal(result.importedImages, 3);
  assert.equal(result.skippedDuplicateImages, 1);
  assert.equal(result.plannedR2Writes, 0);
  assert.deepEqual(downloadCalls, []);
  assert.deepEqual(generateCalls, []);
  assert.equal(storedKeys.length, 0);

  const jobInsert = fakeDb.inserts.find((entry) => entry.table === importJobs);
  const itemInsert = fakeDb.inserts.find((entry) => entry.table === importItems);
  const imageInsert = fakeDb.inserts.filter((entry) => entry.table === importImages);

  assert.equal(Boolean(jobInsert), true);
  assert.equal(Boolean(itemInsert), true);
  assert.equal(imageInsert.length, 3);

  const imageRows = imageInsert.map((entry) => entry.values as {
    sourceUrl: string;
    previewUrl: string;
    order: number;
    isSizeGuide: boolean;
    reviewState: string;
  });
  assert.deepEqual(imageRows.map((row) => row.sourceUrl), [
    "https://photo.yupoo.com/demo/albums/123/a/model-angle-a.jpg",
    "https://photo.yupoo.com/demo/albums/123/b/model-angle-b.jpg",
    "https://photo.yupoo.com/demo/albums/123/guide/sizechart.png",
  ]);
  assert.deepEqual(imageRows.map((row) => row.order), [0, 1, 2]);
  assert.deepEqual(imageRows.map((row) => row.isSizeGuide), [false, false, true]);
  assert.equal(imageRows[0]?.reviewState, "approved");
  assert.deepEqual(imageRows.map((row) => row.previewUrl), [
    "https://photo.yupoo.com/demo/albums/123/a/model-angle-a.jpg",
    "https://photo.yupoo.com/demo/albums/123/b/model-angle-b.jpg",
    "https://photo.yupoo.com/demo/albums/123/guide/sizechart.png",
  ]);
});

test("ingestYupooSource stores real preview URLs returned by Yupoo scraping data", async () => {
  const fakeDb = createFakeDb();

  const result = await ingestYupooSource(
    {
      source: "admin",
      sourceUrl: "https://deateath.x.yupoo.com/albums/654?uid=1",
      productData: { rawName: "Album real preview", finalPrice: 68000 },
    },
    {
      db: fakeDb.db,
      idFactory: (prefix) => `${prefix}-preview-pairs`,
      scrapeYupooImages: async () => [
        {
          url: "https://photo.yupoo.com/demo/albums/654/a/model-angle-a.jpg",
          previewUrl: "https://photo.yupoo.com/demo/albums/654/a/model-angle-a_small_real.jpg",
        },
        {
          url: "https://photo.yupoo.com/demo/albums/654/b/model-angle-b.jpg",
          previewUrl: "https://photo.yupoo.com/demo/albums/654/b/model-angle-b_small_real.jpg",
        },
      ],
    },
  );

  assert.equal(result.importedImages, 2);

  const imageRows = fakeDb.inserts
    .filter((entry) => entry.table === importImages)
    .map((entry) => entry.values as { sourceUrl: string; previewUrl: string });

  assert.deepEqual(imageRows.map((row) => row.sourceUrl), [
    "https://photo.yupoo.com/demo/albums/654/a/model-angle-a.jpg",
    "https://photo.yupoo.com/demo/albums/654/b/model-angle-b.jpg",
  ]);
  assert.deepEqual(imageRows.map((row) => row.previewUrl), [
    "https://photo.yupoo.com/demo/albums/654/a/model-angle-a_small_real.jpg",
    "https://photo.yupoo.com/demo/albums/654/b/model-angle-b_small_real.jpg",
  ]);
});

test("ingestYupooSource drops dedupe and obvious heuristic rejects before DB writes, R2 upload, and preview generation", async () => {
  const fakeDb = createFakeDb();
  const storedKeys: string[] = [];
  const downloadCalls: string[] = [];
  const generateCalls: string[] = [];

  const result = await ingestYupooSource(
    {
      source: "bulk",
      sourceUrl: "https://deateath.x.yupoo.com/albums/321?uid=1",
      productData: { rawName: "Album 321", priceArs: 75000 },
      imageUrls: [
        "https://photo.yupoo.com/demo/albums/321/main/product-main.jpg",
        "https://photo.yupoo.com/demo/albums/321/main/product-main_small.jpg",
        "https://photo.yupoo.com/demo/albums/321/logo/brand-logo-banner.jpg",
        "https://photo.yupoo.com/demo/albums/321/sample/sample-collage.jpg",
        "https://photo.yupoo.com/demo/albums/321/lookbook/showcase-model-detail.jpg",
      ],
    },
    {
      db: fakeDb.db,
      idFactory: (prefix) => `${prefix}-heuristic`,
      downloadImage: async (url) => {
        downloadCalls.push(url);
        return {
          body: Buffer.from(`raw:${url}`),
          contentType: "image/jpeg",
        };
      },
      generateVariants: async ({ originalKey }) => {
        generateCalls.push(originalKey);
        return createGenerateVariantsResult(originalKey);
      },
      storeInR2: async (write) => {
        storedKeys.push(write.key);
      },
    },
  );

  assert.equal(result.importedImages, 2);
  assert.equal(result.skippedDuplicateImages, 1);
  assert.deepEqual(downloadCalls, []);
  assert.equal(generateCalls.length, 0);
  assert.equal(result.plannedR2Writes, 0);
  assert.equal(storedKeys.length, 0);

  const imageInserts = fakeDb.inserts.filter((entry) => entry.table === importImages);
  assert.equal(imageInserts.length, 2);

  const insertedOriginalUrls = imageInserts.map((entry) => (entry.values as { sourceUrl: string }).sourceUrl);
  assert.equal(insertedOriginalUrls.includes("https://photo.yupoo.com/demo/albums/321/logo/brand-logo-banner.jpg"), false);
  assert.equal(insertedOriginalUrls.includes("https://photo.yupoo.com/demo/albums/321/sample/sample-collage.jpg"), false);
});

test("ingestYupooSource falls back to scraper when imageUrls are omitted", async () => {
  const fakeDb = createFakeDb();
  let scraperCalls = 0;

  const result = await ingestYupooSource(
    {
      source: "admin",
      sourceUrl: "https://deateath.x.yupoo.com/albums/456?uid=1",
      productData: { rawName: "Single item", finalPrice: 54000 },
    },
    {
      db: fakeDb.db,
      idFactory: (prefix) => `${prefix}-single`,
      scrapeYupooImages: async () => {
        scraperCalls += 1;
        return [
          "https://photo.yupoo.com/demo/albums/single/a/model-angle-a.jpg",
          "https://photo.yupoo.com/demo/albums/single/b/model-angle-b.jpg",
        ];
      },
      downloadImage: async () => ({
        body: Buffer.from("single"),
        contentType: "image/jpeg",
      }),
      generateVariants: async ({ originalKey }) => createGenerateVariantsResult(originalKey),
    },
  );

  assert.equal(scraperCalls, 1);
  assert.equal(result.importedImages, 2);
  assert.equal(result.plannedR2Writes, 0);
});

test("ingestYupooSource skips products without resolvable price before staging", async () => {
  const fakeDb = createFakeDb();

  const result = await ingestYupooSource(
    {
      source: "bulk",
      sourceUrl: "https://deateath.x.yupoo.com/albums/999?uid=1",
      productData: { rawName: "Sin precio" },
      imageUrls: ["https://photo.yupoo.com/demo/albums/999/only.jpg"],
    },
    {
      db: fakeDb.db,
      idFactory: (prefix) => `${prefix}-missing-price`,
    },
  );

  assert.equal(result.skipped, true);
  assert.equal(result.skipReason, "missing-price");
  assert.equal(result.importedImages, 0);
  assert.equal(fakeDb.inserts.length, 0);
});

test("ingestYupooSource skips product entirely when fewer than 2 useful images remain after filtering", async () => {
  const fakeDb = createFakeDb();

  const result = await ingestYupooSource(
    {
      source: "bulk",
      sourceUrl: "https://deateath.x.yupoo.com/albums/777?uid=1",
      productData: { rawName: "Pocas útiles", priceArs: 56000 },
      imageUrls: [
        "https://photo.yupoo.com/demo/albums/777/main/product-main.jpg",
        "https://photo.yupoo.com/demo/albums/777/sizechart.png",
        "https://photo.yupoo.com/demo/albums/777/logo/brand-logo-banner.jpg",
      ],
    },
    {
      db: fakeDb.db,
      idFactory: (prefix) => `${prefix}-insufficient-useful`,
    },
  );

  assert.equal(result.skipped, true);
  assert.equal(result.skipReason, "insufficient-useful-images");
  assert.equal(result.importedImages, 0);
  assert.equal(fakeDb.inserts.length, 0);
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
