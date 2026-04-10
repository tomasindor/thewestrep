import assert from "node:assert/strict";
import test from "node:test";

import {
  applyReviewAction,
  deriveAutomaticCoverImageId,
  deriveImportItemStatus,
} from "../../lib/imports/curation-state";

test("applyReviewAction maps approve/reject/restore to valid review states", () => {
  assert.equal(applyReviewAction("approve"), "approved");
  assert.equal(applyReviewAction("reject"), "rejected");
  assert.equal(applyReviewAction("restore", "approved"), "approved");
  assert.equal(applyReviewAction("restore", "pending"), "pending");
  assert.equal(applyReviewAction("restore"), "pending");
});

test("deriveAutomaticCoverImageId prefers first approved non-size-guide image", () => {
  const coverImageId = deriveAutomaticCoverImageId([
    { id: "img-size", reviewState: "approved", isSizeGuide: true, order: 0 },
    { id: "img-main", reviewState: "approved", isSizeGuide: false, order: 1 },
  ]);

  assert.equal(coverImageId, "img-main");
});

test("deriveAutomaticCoverImageId reflows when current cover is rejected", () => {
  const before = [
    { id: "img-1", reviewState: "approved", isSizeGuide: false, order: 0 },
    { id: "img-2", reviewState: "approved", isSizeGuide: false, order: 1 },
  ] as const;

  const after = [
    { id: "img-1", reviewState: "rejected", isSizeGuide: false, order: 0 },
    { id: "img-2", reviewState: "approved", isSizeGuide: false, order: 1 },
  ] as const;

  assert.equal(deriveAutomaticCoverImageId(before), "img-1");
  assert.equal(deriveAutomaticCoverImageId(after), "img-2");
});

test("deriveImportItemStatus reflects aggregate image states", () => {
  assert.equal(
    deriveImportItemStatus([
      { id: "img-1", reviewState: "rejected" },
      { id: "img-2", reviewState: "rejected" },
    ]),
    "rejected",
  );

  assert.equal(
    deriveImportItemStatus([
      { id: "img-1", reviewState: "pending" },
      { id: "img-2", reviewState: "approved" },
    ]),
    "approved",
  );

  assert.equal(
    deriveImportItemStatus([
      { id: "img-1", reviewState: "pending" },
      { id: "img-2", reviewState: "pending" },
    ]),
    "pending",
  );
});
