import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_IMPORT_REVIEW_STATE,
  applyReviewAction,
  countActiveImages,
  deriveAutomaticCoverImageId,
  deriveImportItemStatus,
  resolvePromotionEligibility,
  toggleSizeGuide,
} from "../../../../lib/imports/curation-state";

test("imported images are active by default and restore returns to active", () => {
  assert.equal(DEFAULT_IMPORT_REVIEW_STATE, "approved");
  assert.equal(applyReviewAction("reject"), "rejected");
  assert.equal(applyReviewAction("restore"), "approved");
  assert.equal(applyReviewAction("restore", "pending"), "pending");
});

test("toggleSizeGuide only changes size-guide semantics", () => {
  assert.equal(toggleSizeGuide(false), true);
  assert.equal(toggleSizeGuide(true), false);
});

test("cover derivation skips rejected and size-guide images", () => {
  const cover = deriveAutomaticCoverImageId([
    { id: "img-rejected", reviewState: "rejected", isSizeGuide: false, order: 0 },
    { id: "img-size", reviewState: "approved", isSizeGuide: true, order: 1 },
    { id: "img-gallery", reviewState: "approved", isSizeGuide: false, order: 2 },
  ]);

  assert.equal(cover, "img-gallery");
});

test("item status stays approved while at least one active image exists", () => {
  assert.equal(
    deriveImportItemStatus([
      { id: "img-1", reviewState: "rejected" },
      { id: "img-2", reviewState: "approved" },
    ]),
    "approved",
  );

  assert.equal(
    deriveImportItemStatus([
      { id: "img-1", reviewState: "rejected" },
      { id: "img-2", reviewState: "rejected" },
    ]),
    "rejected",
  );
});

test("countActiveImages tracks only active review images", () => {
  assert.equal(countActiveImages([
    { reviewState: "approved" },
    { reviewState: "pending" },
    { reviewState: "rejected" },
  ]), 2);
});

test("resolvePromotionEligibility returns understandable blocking reasons", () => {
  const blocked = resolvePromotionEligibility([
    { id: "img-gallery-1", reviewState: "approved", isSizeGuide: false },
    { id: "img-size", reviewState: "approved", isSizeGuide: true },
  ]);

  assert.equal(blocked.eligible, false);
  assert.match(blocked.reason ?? "", /insufficient useful images/i);

  const eligible = resolvePromotionEligibility([
    { id: "img-gallery-1", reviewState: "approved", isSizeGuide: false },
    { id: "img-gallery-2", reviewState: "approved", isSizeGuide: false },
  ]);

  assert.equal(eligible.eligible, true);
  assert.equal(eligible.reason, null);
});
