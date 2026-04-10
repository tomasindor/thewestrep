import assert from "node:assert/strict";
import test from "node:test";

import {
  getNextKeyboardImageIndex,
  popLastRejectUndo,
  pushRejectUndo,
} from "../../lib/imports/admin-curation-ui-state";

test("getNextKeyboardImageIndex wraps with arrow keys", () => {
  assert.equal(getNextKeyboardImageIndex({ currentIndex: 0, total: 3, key: "ArrowRight" }), 1);
  assert.equal(getNextKeyboardImageIndex({ currentIndex: 2, total: 3, key: "ArrowRight" }), 0);
  assert.equal(getNextKeyboardImageIndex({ currentIndex: 0, total: 3, key: "ArrowLeft" }), 2);
  assert.equal(getNextKeyboardImageIndex({ currentIndex: 1, total: 3, key: "Enter" }), 1);
});

test("reject undo stack keeps most recent first", () => {
  const stack = pushRejectUndo([], { imageId: "img-1", previousState: "pending" });
  const stack2 = pushRejectUndo(stack, { imageId: "img-2", previousState: "approved" });

  assert.deepEqual(stack2.map((entry) => entry.imageId), ["img-2", "img-1"]);

  const popped = popLastRejectUndo(stack2);
  assert.equal(popped.last?.imageId, "img-2");
  assert.deepEqual(popped.remaining.map((entry) => entry.imageId), ["img-1"]);
});
