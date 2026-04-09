import assert from "node:assert/strict";
import test from "node:test";

import { formatOrderHistoryDate, formatOrderHistoryItemLabel, formatOrderHistoryStatus } from "../../lib/orders/history";

test("formats order status labels for profile history", () => {
  assert.equal(formatOrderHistoryStatus("submitted"), "Recibido");
  assert.equal(formatOrderHistoryStatus("cancelled"), "Cancelado");
});

test("builds compact order item labels without leaking empty separators", () => {
  assert.equal(
    formatOrderHistoryItemLabel({
      productName: "Jordan 4 Retro",
      variantLabel: "Black Cat",
      sizeLabel: "42",
    }),
    "Jordan 4 Retro · Black Cat · 42",
  );

  assert.equal(
    formatOrderHistoryItemLabel({
      productName: "Nike Tee",
      variantLabel: null,
      sizeLabel: "M",
    }),
    "Nike Tee · M",
  );
});

test("formats persisted order dates for es-AR profile cards", () => {
  const formattedDate = formatOrderHistoryDate("2026-04-03T10:00:00.000Z");

  assert.match(formattedDate.toLowerCase(), /03.*abr.*2026|3.*abr.*2026/);
});
