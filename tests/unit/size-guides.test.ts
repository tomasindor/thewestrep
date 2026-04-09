import test from "node:test";
import assert from "node:assert/strict";

import { getDisplayGalleryImages } from "../../lib/catalog/size-guides";
import type { ProductImage, ProductSizeGuide } from "../../lib/catalog/types";

function createImage(overrides: Partial<ProductImage>): ProductImage {
  return {
    id: overrides.id ?? "image-1",
    src: overrides.src ?? "https://example.com/product-1.jpg",
    alt: overrides.alt ?? "Producto",
    role: overrides.role ?? "gallery",
    sourceUrl: overrides.sourceUrl,
    provider: overrides.provider,
    assetKey: overrides.assetKey,
    cloudName: overrides.cloudName,
  };
}

function createSizeGuide(overrides: Partial<ProductSizeGuide> = {}): ProductSizeGuide {
  return {
    columns: overrides.columns ?? ["Pecho"],
    rows: overrides.rows ?? [{ label: "M", values: ["60"] }],
    title: overrides.title,
    unitLabel: overrides.unitLabel,
    notes: overrides.notes,
    sourceImageUrl: overrides.sourceImageUrl,
  };
}

test("removes likely measurement images from storefront gallery even without structured size guide", () => {
  const images = [
    createImage({ id: "guide", src: "https://cdn.example.com/tabla-de-medidas.png", role: "cover" }),
    createImage({ id: "product", src: "https://cdn.example.com/product-front.jpg", role: "gallery" }),
  ];

  const visibleImages = getDisplayGalleryImages(images, undefined);

  assert.deepEqual(
    visibleImages.map((image) => image.id),
    ["product"],
  );
  assert.equal(visibleImages[0]?.role, "cover");
});

test("removes the explicit size-guide source image from storefront gallery", () => {
  const images = [
    createImage({ id: "product", src: "https://cdn.example.com/product-front.jpg", role: "cover" }),
    createImage({ id: "guide", src: "https://cdn.example.com/reference.jpg", sourceUrl: "https://source.example.com/guide.jpg" }),
  ];

  const visibleImages = getDisplayGalleryImages(
    images,
    createSizeGuide({ sourceImageUrl: "https://source.example.com/guide.jpg" }),
  );

  assert.deepEqual(
    visibleImages.map((image) => image.id),
    ["product"],
  );
});

test("returns an empty storefront gallery when every image is a measurement reference", () => {
  const images = [createImage({ id: "guide", src: "https://cdn.example.com/measurements.png", role: "cover" })];

  const visibleImages = getDisplayGalleryImages(images, undefined);

  assert.deepEqual(visibleImages, []);
});
