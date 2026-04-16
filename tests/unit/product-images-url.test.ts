import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import { getProductImageUrlForContext } from "../../lib/media/product-images";

const ORIGINAL_ENV = {
  NEXT_PUBLIC_R2_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL,
  R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL,
};

afterEach(() => {
  if (ORIGINAL_ENV.NEXT_PUBLIC_R2_PUBLIC_BASE_URL === undefined) {
    delete process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL;
  } else {
    process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL = ORIGINAL_ENV.NEXT_PUBLIC_R2_PUBLIC_BASE_URL;
  }

  if (ORIGINAL_ENV.R2_PUBLIC_BASE_URL === undefined) {
    delete process.env.R2_PUBLIC_BASE_URL;
  } else {
    process.env.R2_PUBLIC_BASE_URL = ORIGINAL_ENV.R2_PUBLIC_BASE_URL;
  }
});

test("builds transformed Cloudinary URL for card context", () => {
  const url = getProductImageUrlForContext(
    {
      src: "https://example.com/original.jpg",
      provider: "cloudinary",
      assetKey: "thewestrep/products/example",
      cloudName: "demo-cloud",
    },
    "card",
  );

  assert.equal(
    url,
    "https://res.cloudinary.com/demo-cloud/image/upload/c_fill,g_auto,w_720,h_900,q_auto,f_auto,dpr_auto/thewestrep/products/example",
  );
});

test("resolves r2:// URLs using NEXT_PUBLIC_R2_PUBLIC_BASE_URL", () => {
  process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL = "https://cdn.thewestrep.com/images/";

  const url = getProductImageUrlForContext(
    {
      src: "r2://products/123/cover.jpg",
    },
    "detail",
  );

  assert.equal(url, "https://cdn.thewestrep.com/images/products/123/cover.jpg");
});

test("resolves R2 assetKey when only server R2 base URL is configured", () => {
  delete process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL;
  process.env.R2_PUBLIC_BASE_URL = "https://cdn.thewestrep.com/images";

  const url = getProductImageUrlForContext(
    {
      src: "r2://products/123/detail.jpg",
      assetKey: "/products/123/detail.jpg",
    },
    "lightbox",
  );

  assert.equal(url, "https://cdn.thewestrep.com/images/products/123/detail.jpg");
});

test("keeps original src when no public R2 base URL is configured", () => {
  delete process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL;
  delete process.env.R2_PUBLIC_BASE_URL;

  const url = getProductImageUrlForContext(
    {
      src: "r2://products/123/detail.jpg",
    },
    "detail",
  );

  assert.equal(url, "r2://products/123/detail.jpg");
});
