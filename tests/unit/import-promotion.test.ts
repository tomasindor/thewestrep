import assert from "node:assert/strict";
import test from "node:test";

import { createPromotionFoundation, promoteImportItem } from "../../lib/imports/promotion";

function createPromotionFixture() {
  const calls = {
    loadImportItemById: [] as string[],
    loadImportImagesByItemId: [] as string[],
    findProductBySlug: [] as string[],
    createProduct: [] as Array<Record<string, unknown>>,
    updateProduct: [] as Array<{ productId: string; values: Record<string, unknown> }>,
    insertProductImage: [] as unknown[],
    upsertProductSizeGuide: [] as unknown[],
  };

  const service = createPromotionFoundation({
    now: () => new Date("2026-04-09T13:00:00.000Z"),
    idFactory: (prefix) => `${prefix}-fixed`,
    buildOwnedAssetUrl: (assetKey) => `https://cdn.thewestrep.test/${assetKey}`,
    loadImportItemById: async (importItemId) => {
      calls.loadImportItemById.push(importItemId);
      return {
        id: importItemId,
        status: "approved",
        productData: {
          name: "Remera World Tour",
          slug: "remera-world-tour",
          brandId: "brand-1",
          categoryId: "category-1",
          type: "encargue",
          priceArs: 89000,
          description: "Desc",
          sourceUrl: "https://deateath.x.yupoo.com/albums/101?uid=1",
          sizeGuide: {
            title: "Tabla",
            unitLabel: "cm",
            notes: "Medidas aproximadas",
            columns: ["Largo", "Pecho"],
            rows: [{ label: "M", values: ["70", "54"] }],
          },
        },
      };
    },
    loadImportImagesByItemId: async (importItemId) => {
      calls.loadImportImagesByItemId.push(importItemId);
      return [
        {
          id: "import-image-1",
          importItemId,
          originalUrl: "https://photo.yupoo.com/demo/1.jpg",
          sourceYupooUrl: "https://deateath.x.yupoo.com/albums/101?uid=1",
          order: 0,
          reviewState: "approved",
          isSizeGuide: false,
          r2Key: "imports/job-1/item-1/000/original.jpg",
          variantsManifest: {
            original: "imports/job-1/item-1/000/original.jpg",
            variants: { detail: "imports/job-1/item-1/000/detail.webp" },
            width: 1200,
            height: 1400,
          },
        },
        {
          id: "import-image-2",
          importItemId,
          originalUrl: "https://photo.yupoo.com/demo/size-guide.png",
          sourceYupooUrl: "https://deateath.x.yupoo.com/albums/101?uid=1",
          order: 1,
          reviewState: "approved",
          isSizeGuide: true,
          r2Key: "imports/job-1/item-1/001/original.png",
          variantsManifest: {
            original: "imports/job-1/item-1/001/original.png",
            variants: { detail: "imports/job-1/item-1/001/detail.webp" },
            width: 1000,
            height: 1400,
          },
        },
      ];
    },
    findProductBySlug: async (slug) => {
      calls.findProductBySlug.push(slug);
      return null;
    },
    createProduct: async (values) => {
      calls.createProduct.push(values);
      return { id: "product-new", slug: String(values.slug) };
    },
    updateProduct: async (productId, values) => {
      calls.updateProduct.push({ productId, values });
    },
    insertProductImage: async (values) => {
      calls.insertProductImage.push(values);
    },
    upsertProductSizeGuide: async (values) => {
      calls.upsertProductSizeGuide.push(values);
    },
  });

  return { service, calls };
}

test("promoteImportItem creates a draft product, preserves size-guide metadata, and inserts owned product images", async () => {
  const { service, calls } = createPromotionFixture();

  const result = await promoteImportItem({ importItemId: "item-1" }, service);

  assert.equal(result.productId, "product-new");
  assert.equal(result.createdProduct, true);
  assert.equal(result.imagesInserted, 2);
  assert.equal(result.sizeGuidePreserved, true);

  assert.equal(calls.createProduct.length, 1);
  assert.equal(calls.insertProductImage.length, 2);
  assert.equal(calls.upsertProductSizeGuide.length, 1);

  const [firstImage] = calls.insertProductImage as Array<{ url: string; provider: string; assetKey: string | null }>;
  assert.equal(firstImage.url, "https://cdn.thewestrep.test/imports/job-1/item-1/000/detail.webp");
  assert.equal(firstImage.provider, "r2");
  assert.equal(firstImage.assetKey, "imports/job-1/item-1/000/detail.webp");

  const [sizeGuideUpsert] = calls.upsertProductSizeGuide as Array<{ sourceImageUrl?: string }>;
  assert.equal(sizeGuideUpsert.sourceImageUrl, "https://photo.yupoo.com/demo/size-guide.png");
});

test("promoteImportItem updates existing draft products and rejects non-draft products conservatively", async () => {
  const base = createPromotionFixture();
  base.service.findProductBySlug = async () => ({ id: "product-existing", slug: "remera-world-tour", state: "draft" });

  const updated = await promoteImportItem({ importItemId: "item-2" }, base.service);
  assert.equal(updated.productId, "product-existing");
  assert.equal(updated.createdProduct, false);
  assert.equal(base.calls.updateProduct.length, 1);
  assert.equal(base.calls.createProduct.length, 0);

  const blocked = createPromotionFixture();
  blocked.service.findProductBySlug = async () => ({ id: "product-published", slug: "remera-world-tour", state: "published" });

  await assert.rejects(
    () => promoteImportItem({ importItemId: "item-3" }, blocked.service),
    /estado draft/,
  );
});
