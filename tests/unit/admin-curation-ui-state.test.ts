import assert from "node:assert/strict";
import test from "node:test";

import {
  applyBulkPromotionResultToQueue,
  buildReviewImageUrl,
  createQueuePager,
  finishOptimisticQueuePromotion,
  getKeyboardReviewAction,
  getNextKeyboardImageIndex,
  formatCarouselPositionLabel,
  popLastRejectUndo,
  pushRejectUndo,
  startOptimisticQueuePromotion,
  resolveBestActiveItemAfterImageMutation,
  resolveQueueItemVisualState,
  resolvePrimaryQuickActions,
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

test("quick actions prioritize reject/restore and size-guide toggle", () => {
  const approvedActions = resolvePrimaryQuickActions({ reviewState: "approved", isSizeGuide: false });
  assert.deepEqual(approvedActions, {
    reviewAction: "reject",
    sizeGuideAction: "mark-size-guide",
  });

  const rejectedActions = resolvePrimaryQuickActions({ reviewState: "rejected", isSizeGuide: true });
  assert.deepEqual(rejectedActions, {
    reviewAction: "restore",
    sizeGuideAction: "unmark-size-guide",
  });
});

test("applyBulkPromotionResultToQueue removes promoted items and keeps active selection consistent", () => {
  const queue = {
    items: [
      { id: "item-1" },
      { id: "item-2" },
      { id: "item-3" },
    ],
    activeItemId: "item-2",
  };

  const result = applyBulkPromotionResultToQueue(queue, ["item-2", "item-3"]);
  assert.deepEqual(result.items.map((item) => item.id), ["item-1"]);
  assert.equal(result.activeItemId, "item-1");
});

test("applyBulkPromotionResultToQueue keeps active item when not promoted", () => {
  const queue = {
    items: [
      { id: "item-1" },
      { id: "item-2" },
    ],
    activeItemId: "item-1",
  };

  const result = applyBulkPromotionResultToQueue(queue, ["item-2"]);
  assert.deepEqual(result.items.map((item) => item.id), ["item-1"]);
  assert.equal(result.activeItemId, "item-1");
});

test("buildReviewImageUrl routes Yupoo assets through proxy to avoid 404 hotlink issues", () => {
  const url = buildReviewImageUrl({
    sourceUrl: "https://photo.yupoo.com/demo/albums/777/main.jpg",
    previewUrl: "https://photo.yupoo.com/demo/albums/777/main_small_real.jpg",
  });
  assert.match(url, /^\/api\/admin\/imports\/proxy\?url=/);
  assert.match(url, /previewUrl=/);
  assert.match(url, /main_small_real\.jpg/);
  assert.match(url, /photo\.yupoo\.com/);
});

test("buildReviewImageUrl omits previewUrl query when no preview is stored", () => {
  const url = buildReviewImageUrl({ sourceUrl: "https://photo.yupoo.com/demo/albums/777/main.jpg" });
  assert.match(url, /^\/api\/admin\/imports\/proxy\?url=/);
  assert.doesNotMatch(url, /previewUrl=/);
});

test("formatCarouselPositionLabel returns visible current/total indicator", () => {
  assert.equal(formatCarouselPositionLabel({ currentIndex: 2, total: 12 }), "3/12");
  assert.equal(formatCarouselPositionLabel({ currentIndex: 0, total: 0 }), "0/0");
});

test("resolveBestActiveItemAfterImageMutation keeps queue stable when current product runs out of active images", () => {
  const activeItemId = resolveBestActiveItemAfterImageMutation(
    [
      {
        id: "item-1",
        images: [
          { id: "img-1", reviewState: "rejected" },
        ],
      },
      {
        id: "item-2",
        images: [
          { id: "img-2", reviewState: "approved" },
        ],
      },
    ],
    "item-1",
  );

  assert.equal(activeItemId, "item-2");
});

test("getKeyboardReviewAction maps ArrowDown to reject current image", () => {
  assert.equal(getKeyboardReviewAction("ArrowDown"), "reject");
  assert.equal(getKeyboardReviewAction("ArrowRight"), null);
});

test("createQueuePager keeps sidebar compact and bounded by page size", () => {
  const items = Array.from({ length: 25 }, (_, index) => ({ id: `item-${index + 1}` }));

  const firstPage = createQueuePager({
    items,
    currentPage: 1,
    pageSize: 10,
  });

  assert.equal(firstPage.totalPages, 3);
  assert.equal(firstPage.currentPage, 1);
  assert.deepEqual(firstPage.visibleItems.map((item) => item.id), [
    "item-1",
    "item-2",
    "item-3",
    "item-4",
    "item-5",
    "item-6",
    "item-7",
    "item-8",
    "item-9",
    "item-10",
  ]);

  const lastPage = createQueuePager({
    items,
    currentPage: 3,
    pageSize: 10,
  });

  assert.equal(lastPage.currentPage, 3);
  assert.deepEqual(lastPage.visibleItems.map((item) => item.id), [
    "item-21",
    "item-22",
    "item-23",
    "item-24",
    "item-25",
  ]);
});

test("optimistic queue promotion removes immediately and restores failed items with operator-facing error", () => {
  type QueueItem = {
    id: string;
    status: "approved" | "media_failed";
    mediaStatus?: "pending" | "failed";
    promotionError?: string | null;
  };

  const queue = {
    items: [
      { id: "item-1", status: "approved" },
      { id: "item-2", status: "approved" },
      { id: "item-3", status: "approved" },
    ] as QueueItem[],
    activeItemId: "item-2",
  };

  const started = startOptimisticQueuePromotion(queue, ["item-1", "item-2"]);
  assert.deepEqual(started.queue.items.map((item) => item.id), ["item-3"]);
  assert.equal(started.queue.activeItemId, "item-3");
  assert.deepEqual(started.promotingItemIds, ["item-1", "item-2"]);

  const finished = finishOptimisticQueuePromotion(started, {
    promotedItemIds: ["item-1"],
    blocked: [{ itemId: "item-2", reason: "R2 upload failed: timeout" }],
  });

  assert.deepEqual(finished.queue.items.map((item) => item.id), ["item-2", "item-3"]);
  assert.equal(finished.restoredFailedItems.length, 1);
  assert.equal(finished.restoredFailedItems[0]?.id, "item-2");
  assert.equal(finished.restoredFailedItems[0]?.status, "media_failed");
  assert.equal(finished.restoredFailedItems[0]?.promotionError, "R2 upload failed: timeout");
});

test("resolveQueueItemVisualState differentiates queued, promoting, and failed clearly", () => {
  assert.deepEqual(resolveQueueItemVisualState({ itemStatus: "approved", isPromoting: false, promotionError: null }), {
    tone: "queued",
    label: "En cola",
  });

  assert.deepEqual(resolveQueueItemVisualState({ itemStatus: "approved", isPromoting: true, promotionError: null }), {
    tone: "promoting",
    label: "Promocionando...",
  });

  assert.deepEqual(resolveQueueItemVisualState({ itemStatus: "media_failed", isPromoting: false, promotionError: "R2 timeout" }), {
    tone: "failed",
    label: "Promoción fallida",
    error: "R2 timeout",
  });
});
