import assert from "node:assert/strict";
import test from "node:test";

import { extractYupooImages } from "../../../lib/yupoo-core";

test("extractYupooImages captures real preview/source URL pairs from album HTML", async () => {
  const originalFetch = globalThis.fetch;

  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async () => new Response(`
      <html>
        <body>
          <img src="https://photo.yupoo.com/demo/albums/777/a/model-a_small_real.jpg" data-origin-src="https://photo.yupoo.com/demo/albums/777/a/model-a.jpg" />
          <img src="https://photo.yupoo.com/demo/albums/777/b/model-b_small_real.jpg" data-origin-src="https://photo.yupoo.com/demo/albums/777/b/model-b.jpg" />
        </body>
      </html>
    `, { status: 200 }),
  });

  try {
    const extracted = await extractYupooImages("https://deateath.x.yupoo.com/albums/777?uid=1");

    assert.deepEqual(extracted.images, [
      "https://photo.yupoo.com/demo/albums/777/a/model-a.jpg",
      "https://photo.yupoo.com/demo/albums/777/b/model-b.jpg",
    ]);

    assert.deepEqual(extracted.imageCandidates, [
      {
        url: "https://photo.yupoo.com/demo/albums/777/a/model-a.jpg",
        previewUrl: "https://photo.yupoo.com/demo/albums/777/a/model-a_small_real.jpg",
      },
      {
        url: "https://photo.yupoo.com/demo/albums/777/b/model-b.jpg",
        previewUrl: "https://photo.yupoo.com/demo/albums/777/b/model-b_small_real.jpg",
      },
    ]);
  } finally {
    Object.defineProperty(globalThis, "fetch", { configurable: true, value: originalFetch });
  }
});

test("extractYupooImages no longer truncates albums to 30 images by default", async () => {
  const originalFetch = globalThis.fetch;
  const html = Array.from({ length: 35 }, (_, index) => `<img src="https://photo.yupoo.com/demo/albums/999/${index}/look-${index}.jpg" />`).join("\n");

  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async () => new Response(`<html><body>${html}</body></html>`, { status: 200 }),
  });

  try {
    const extracted = await extractYupooImages("https://deateath.x.yupoo.com/albums/999?uid=1");
    assert.equal(extracted.images.length, 35);
  } finally {
    Object.defineProperty(globalThis, "fetch", { configurable: true, value: originalFetch });
  }
});
