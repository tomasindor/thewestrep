import assert from "node:assert/strict";
import test from "node:test";

import { inferComboMetadata } from "../../../../lib/imports/heuristics";

test("inferComboMetadata extracts group from lookbook-style album title", () => {
  const result = inferComboMetadata({
    albumTitle: "Nike Winter Look 2026",
    sourceUrl: "https://deateath.x.yupoo.com/albums/123?uid=1",
    productData: {
      brandName: "Nike",
      priceArs: 78_000,
    },
    productCount: 4,
  });

  assert.equal(result.comboEligible, true);
  assert.equal(result.comboGroup, "nike-winter-look-2026");
  assert.equal(result.comboSourceKey, "importer-album-title");
  assert.equal(result.comboPriority, 0);
  assert.equal(result.comboScore, 0.7);
});

test("inferComboMetadata prefers explicit combo_group from product data", () => {
  const result = inferComboMetadata({
    albumTitle: "Random album",
    sourceUrl: "https://deateath.x.yupoo.com/albums/456?uid=1",
    productData: {
      combo_group: "look-001",
      brandName: "Stussy",
      priceArs: 65_000,
    },
    productCount: 2,
  });

  assert.equal(result.comboGroup, "look-001");
  assert.equal(result.comboSourceKey, "importer-explicit-group");
  assert.equal(result.comboScore, 0.9);
});

test("inferComboMetadata keeps low confidence combos non-eligible for merchandising", () => {
  const result = inferComboMetadata({
    albumTitle: "Album variado",
    sourceUrl: "https://deateath.x.yupoo.com/albums/789?uid=1",
    productData: {
      brandName: "Unknown",
      priceArs: 42_000,
    },
    productCount: 1,
  });

  assert.equal(result.comboEligible, false);
  assert.equal(result.comboScore, 0.2);
  assert.equal(result.comboGroup, undefined);
});

test("inferComboMetadata falls back to brand+season grouping when album has no look markers", () => {
  const result = inferComboMetadata({
    albumTitle: "Nike Winter 2026 Drop",
    sourceUrl: "https://deateath.x.yupoo.com/albums/999?uid=1",
    productData: {
      brandName: "Nike",
      season: "winter-2026",
      priceArs: 58_000,
    },
    productCount: 3,
  });

  assert.equal(result.comboEligible, true);
  assert.equal(result.comboGroup, "nike-winter-2026");
  assert.equal(result.comboSourceKey, "importer-brand-season");
  assert.ok(result.comboScore >= 0.5);
});

test("inferComboMetadata forces combo grouping when exactly two prices are detected", () => {
  const result = inferComboMetadata({
    albumTitle: "Drop sin marcador explícito",
    sourceUrl: "https://deateath.x.yupoo.com/albums/777?uid=1",
    productData: {
      brandName: "Unknown",
      priceArs: 58_000,
    },
    detectedPrices: [120000, 89000],
    productCount: 2,
  });

  assert.equal(result.comboEligible, true);
  assert.equal(result.comboSourceKey, "importer-two-prices");
  assert.match(result.comboGroup ?? "", /deateath-x-yupoo-com-777/);
});
