const ANCHOR_SCROLL_GAP_PX = 12;

interface ComputeAnchorScrollTopInput {
  currentScrollYPx: number;
  targetTopRelativeViewportPx: number;
  stickyHeaderHeightPx: number;
}

export function computeAnchorScrollTop({
  currentScrollYPx,
  targetTopRelativeViewportPx,
  stickyHeaderHeightPx,
}: ComputeAnchorScrollTopInput) {
  return Math.max(0, currentScrollYPx + targetTopRelativeViewportPx - stickyHeaderHeightPx - ANCHOR_SCROLL_GAP_PX);
}
