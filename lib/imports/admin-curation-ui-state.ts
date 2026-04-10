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
