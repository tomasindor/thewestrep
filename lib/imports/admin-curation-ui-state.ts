import type { ImportReviewState } from "@/lib/imports/curation-state";

export interface RejectUndoEntry {
  imageId: string;
  previousState: ImportReviewState;
}

interface KeyboardImageInput {
  currentIndex: number;
  total: number;
  key: string;
}

interface ActiveImageCandidate {
  reviewState: ImportReviewState;
}

interface QueueItemWithImages {
  id: string;
  images: readonly ActiveImageCandidate[];
}

const MAX_UNDO_STACK_SIZE = 20;

export function getNextKeyboardImageIndex(input: KeyboardImageInput) {
  if (input.total <= 0) {
    return 0;
  }

  if (input.key === "ArrowRight") {
    return (input.currentIndex + 1 + input.total) % input.total;
  }

  if (input.key === "ArrowLeft") {
    return (input.currentIndex - 1 + input.total) % input.total;
  }

  return Math.max(0, Math.min(input.currentIndex, input.total - 1));
}

export function getKeyboardReviewAction(key: string): "reject" | null {
  if (key === "ArrowDown") {
    return "reject";
  }

  return null;
}

export function pushRejectUndo(current: readonly RejectUndoEntry[], entry: RejectUndoEntry) {
  return [entry, ...current].slice(0, MAX_UNDO_STACK_SIZE);
}

export function popLastRejectUndo(current: readonly RejectUndoEntry[]) {
  const [last, ...remaining] = current;

  return {
    last,
    remaining,
  };
}

export function resolvePrimaryQuickActions(input: { reviewState: ImportReviewState; isSizeGuide: boolean }) {
  return {
    reviewAction: input.reviewState === "rejected" ? "restore" as const : "reject" as const,
    sizeGuideAction: input.isSizeGuide ? "unmark-size-guide" as const : "mark-size-guide" as const,
  };
}

export function formatCarouselPositionLabel(input: { currentIndex: number; total: number }) {
  if (input.total <= 0) {
    return "0/0";
  }

  return `${Math.max(1, input.currentIndex + 1)}/${input.total}`;
}

export function applyBulkPromotionResultToQueue<T extends { id: string }>(
  current: { items: readonly T[]; activeItemId: string | null },
  promotedItemIds: readonly string[],
) {
  if (promotedItemIds.length === 0) {
    return {
      items: [...current.items],
      activeItemId: current.activeItemId,
    };
  }

  const promotedIds = new Set(promotedItemIds);
  const remainingItems = current.items.filter((item) => !promotedIds.has(item.id));

  if (remainingItems.length === 0) {
    return {
      items: [],
      activeItemId: null,
    };
  }

  const nextActiveItemId = current.activeItemId && remainingItems.some((item) => item.id === current.activeItemId)
    ? current.activeItemId
    : remainingItems[0].id;

  return {
    items: remainingItems,
    activeItemId: nextActiveItemId,
  };
}

export function buildReviewImageUrl(input: { sourceUrl: string; previewUrl?: string | null }) {
  const sourceUrl = input.sourceUrl.trim();
  const previewUrl = typeof input.previewUrl === "string" ? input.previewUrl.trim() : "";

  if (!previewUrl || previewUrl === sourceUrl) {
    return `/api/admin/imports/proxy?url=${encodeURIComponent(sourceUrl)}`;
  }

  return `/api/admin/imports/proxy?url=${encodeURIComponent(sourceUrl)}&previewUrl=${encodeURIComponent(previewUrl)}`;
}

export function resolveBestActiveItemAfterImageMutation<T extends QueueItemWithImages>(
  items: readonly T[],
  currentActiveItemId: string | null,
) {
  if (items.length === 0) {
    return null;
  }

  const hasActiveImages = (item: QueueItemWithImages) => item.images.some((image) => image.reviewState !== "rejected");
  const current = currentActiveItemId ? items.find((item) => item.id === currentActiveItemId) : null;

  if (current && hasActiveImages(current)) {
    return current.id;
  }

  const fallback = items.find((item) => hasActiveImages(item));
  return fallback?.id ?? current?.id ?? items[0]?.id ?? null;
}
