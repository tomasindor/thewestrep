import assert from "node:assert/strict";
import test from "node:test";

import { toYupooPreviewAssetUrl } from "../../../../lib/imports/yupoo-preview-url";

test("toYupooPreviewAssetUrl transforms jpg originals to small preview variant", () => {
  const preview = toYupooPreviewAssetUrl("https://photo.yupoo.com/demo/albums/777/main.jpg");
  assert.equal(preview, "https://photo.yupoo.com/demo/albums/777/main_small.jpg");
});

test("toYupooPreviewAssetUrl preserves URL when already a preview asset", () => {
  const preview = toYupooPreviewAssetUrl("https://photo.yupoo.com/demo/albums/777/main_small.jpg");
  assert.equal(preview, "https://photo.yupoo.com/demo/albums/777/main_small.jpg");
});
