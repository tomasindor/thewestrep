import assert from "node:assert/strict";
import test from "node:test";

import { computeAnchorScrollTop } from "../../lib/navigation/public-anchor-scroll";

test("computeAnchorScrollTop applies sticky-header offset", () => {
  const top = computeAnchorScrollTop({
    currentScrollYPx: 420,
    targetTopRelativeViewportPx: 280,
    stickyHeaderHeightPx: 96,
  });

  assert.equal(top, 592);
});

test("computeAnchorScrollTop clamps to page start", () => {
  const top = computeAnchorScrollTop({
    currentScrollYPx: 20,
    targetTopRelativeViewportPx: 10,
    stickyHeaderHeightPx: 80,
  });

  assert.equal(top, 0);
});
