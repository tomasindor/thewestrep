export type ImportReviewState = "pending" | "approved" | "rejected";
export type ImportReviewAction = "reject" | "restore" | "toggle-size-guide";
export type ImportItemAggregateStatus = "pending" | "approved" | "rejected";

export const DEFAULT_IMPORT_REVIEW_STATE: ImportReviewState = "approved";

interface CoverCandidate {
  id: string;
  reviewState: ImportReviewState;
  isSizeGuide?: boolean;
  order?: number;
}

interface ItemStatusCandidate {
  id: string;
  reviewState: ImportReviewState;
}

interface ActiveImageCandidate {
  id: string;
  reviewState: ImportReviewState;
  isSizeGuide?: boolean;
}

export function applyReviewAction(action: Exclude<ImportReviewAction, "toggle-size-guide">, previousState?: ImportReviewState): ImportReviewState {
  if (action === "reject") {
    return "rejected";
  }

  return previousState ?? DEFAULT_IMPORT_REVIEW_STATE;
}

export function toggleSizeGuide(current: boolean): boolean {
  return !current;
}

export function isImageActive(reviewState: ImportReviewState): boolean {
  return reviewState !== "rejected";
}

export function countActiveImages(images: readonly Pick<ActiveImageCandidate, "reviewState">[]) {
  return images.filter((image) => isImageActive(image.reviewState)).length;
}

export function resolvePromotionEligibility(images: readonly ActiveImageCandidate[]) {
  const usefulImages = images.filter((image) => isImageActive(image.reviewState) && !image.isSizeGuide);
  const hasMinimumUsefulImages = usefulImages.length >= 2;

  if (hasMinimumUsefulImages) {
    return {
      eligible: true,
      reason: null as string | null,
    };
  }

  return {
    eligible: false,
    reason: "insufficient useful images",
  };
}

export function deriveAutomaticCoverImageId(images: readonly CoverCandidate[]): string | null {
  const active = images
    .filter((image) => isImageActive(image.reviewState))
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));

  if (active.length === 0) {
    return null;
  }

  const firstNonSizeGuide = active.find((image) => !image.isSizeGuide);
  return firstNonSizeGuide?.id ?? null;
}

export function deriveImportItemStatus(images: readonly ItemStatusCandidate[]): ImportItemAggregateStatus {
  if (images.length === 0) {
    return "pending";
  }

  if (images.every((image) => image.reviewState === "rejected")) {
    return "rejected";
  }

  return "approved";
}
