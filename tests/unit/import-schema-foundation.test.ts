import assert from "node:assert/strict";
import test from "node:test";

import {
  importImages,
  importImagesReviewStateEnum,
  importItems,
  importItemsStatusEnum,
  importJobs,
  importJobsSourceEnum,
  importJobsStatusEnum,
  productImages,
} from "../../lib/db/schema";
import {
  getProductImagesSchemaCompatibilityWarning,
  type ProductImagesSchemaCompatibility,
} from "../../lib/db/product-images-schema-compat";

test("schema exports staging import tables for jobs, items, and images", () => {
  assert.ok(importJobs.id);
  assert.ok(importJobs.status);
  assert.ok(importJobs.source);
  assert.ok(importJobs.sourceReference);

  assert.ok(importItems.id);
  assert.ok(importItems.importJobId);
  assert.ok(importItems.status);
  assert.ok(importItems.productData);

  assert.ok(importImages.id);
  assert.ok(importImages.importItemId);
  assert.ok(importImages.originalUrl);
  assert.ok(importImages.sourceYupooUrl);
  assert.ok(importImages.r2Key);
  assert.ok(importImages.variantsManifest);
  assert.ok(importImages.order);
  assert.ok(importImages.reviewState);
  assert.ok(importImages.isSizeGuide);
  assert.ok(importImages.similarityMetadata);

  assert.ok(productImages.variantsManifest);
});

test("schema exports import enums with required states", () => {
  assert.deepEqual(importJobsStatusEnum.enumValues, ["running", "completed", "failed"]);
  assert.deepEqual(importJobsSourceEnum.enumValues, ["admin", "bulk"]);
  assert.deepEqual(importItemsStatusEnum.enumValues, ["pending", "approved", "rejected"]);
  assert.deepEqual(importImagesReviewStateEnum.enumValues, ["pending", "approved", "rejected"]);
});

test("product images schema compatibility warns when variants_manifest column is missing", () => {
  const compatibility: ProductImagesSchemaCompatibility = {
    hasSourceUrl: true,
    hasProvider: true,
    hasAssetKey: true,
    hasCloudName: true,
    hasVariantsManifest: false,
  };

  const warning = getProductImagesSchemaCompatibilityWarning(compatibility);

  assert.ok(warning);
  assert.match(warning, /variants_manifest/);
});

test("product images schema compatibility does not warn when all managed columns exist", () => {
  const compatibility: ProductImagesSchemaCompatibility = {
    hasSourceUrl: true,
    hasProvider: true,
    hasAssetKey: true,
    hasCloudName: true,
    hasVariantsManifest: true,
  };

  const warning = getProductImagesSchemaCompatibilityWarning(compatibility);

  assert.equal(warning, undefined);
});
