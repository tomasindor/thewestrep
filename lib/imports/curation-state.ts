export type ImportReviewState = "pending" | "approved" | "rejected";
export type ImportReviewAction = "approve" | "reject" | "restore";
export type ImportItemAggregateStatus = "pending" | "approved" | "rejected";

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

export function applyReviewAction(action: ImportReviewAction, previousState?: ImportReviewState): ImportReviewState {
  if (action === "approve") {
    return "approved";
  }

  if (action === "reject") {
    return "rejected";
  }

  return previousState ?? "pending";
}

export function deriveAutomaticCoverImageId(images: readonly CoverCandidate[]): string | null {
  const approved = images
    .filter((image) => image.reviewState === "approved")
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));

  if (approved.length === 0) {
    return null;
  }

  const firstNonSizeGuide = approved.find((image) => !image.isSizeGuide);
  return firstNonSizeGuide?.id ?? approved[0]?.id ?? null;
}

export function deriveImportItemStatus(images: readonly ItemStatusCandidate[]): ImportItemAggregateStatus {
  if (images.length === 0) {
    return "pending";
  }

  if (images.some((image) => image.reviewState === "approved")) {
    return "approved";
  }

  if (images.every((image) => image.reviewState === "rejected")) {
    return "rejected";
  }

  return "pending";
}
