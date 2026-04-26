import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";

import {
  DEFAULT_IMAGE_VARIANT_SPECS,
  generateImageVariants,
  mapVariantNameToManifestField,
  type ImageVariantName,
} from "../../lib/media/variants";

const TARGET_VARIANTS: ImageVariantName[] = ["thumb", "cart-thumb", "card", "detail", "lightbox", "admin-preview"];

const SAMPLE_PNG_2X2 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAGElEQVR42mP8z8Dwn4EIwDiqAaaQxQAAE6kCBf+n3T4AAAAASUVORK5CYII=",
  "base64",
);

test("uses the fixed variant widths defined by the PDR", () => {
  assert.deepEqual(DEFAULT_IMAGE_VARIANT_SPECS, {
    thumb: { width: 256 },
    "cart-thumb": { width: 240 },
    card: { width: 960 },
    detail: { width: 1440 },
    lightbox: { width: 2200 },
    "admin-preview": { width: 480 },
  });
});

test("declares exactly the six fixed variants required by spec", () => {
  assert.deepEqual(
    TARGET_VARIANTS,
    Object.keys(DEFAULT_IMAGE_VARIANT_SPECS) as ImageVariantName[],
  );

  assert.equal(mapVariantNameToManifestField("cart-thumb"), "cartThumb");
  assert.equal(mapVariantNameToManifestField("admin-preview"), "adminPreview");
});

test("generates six webp variants and preserves original dimensions", async () => {
  const generated = await generateImageVariants({
    source: SAMPLE_PNG_2X2,
    originalKey: "imports/job-1/item-1/original.png",
  });

  assert.equal(generated.original.width, 2);
  assert.equal(generated.original.height, 2);
  assert.deepEqual(Object.keys(generated.variants), TARGET_VARIANTS);

  for (const variantName of TARGET_VARIANTS) {
    const variant = generated.variants[variantName];
    assert.equal(variant.contentType, "image/webp");
    assert.equal(variant.key.includes(`/${variantName}.webp`), true);
    assert.equal(variant.buffer.byteLength > 0, true);
  }
});

test("does not upscale tiny source images while generating variant metadata", async () => {
  const generated = await generateImageVariants({
    source: SAMPLE_PNG_2X2,
    originalKey: "imports/job-1/item-2/original.png",
  });

  for (const variantName of TARGET_VARIANTS) {
    const variant = generated.variants[variantName];
    assert.equal(variant.width <= 2, true);
    assert.equal(variant.height <= 2, true);
  }
});

test("resizes larger images to the target widths while preserving aspect ratio", async () => {
  const largeLandscape = await sharp({
    create: {
      width: 4000,
      height: 3000,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .png()
    .toBuffer();

  const generated = await generateImageVariants({
    source: largeLandscape,
    originalKey: "imports/job-1/item-3/original.png",
  });

  assert.equal(generated.variants.thumb.width, 256);
  assert.equal(generated.variants["cart-thumb"].width, 240);
  assert.equal(generated.variants.card.width, 960);
  assert.equal(generated.variants.detail.width, 1440);
  assert.equal(generated.variants.lightbox.width, 2200);
  assert.equal(generated.variants["admin-preview"].width, 480);

  for (const variantName of TARGET_VARIANTS) {
    const variant = generated.variants[variantName];
    assert.equal(variant.height > 0, true);
  }
});
