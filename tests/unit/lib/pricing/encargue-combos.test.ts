import assert from "node:assert/strict";
import test from "node:test";

import { calculateComboConfidence, calculateComboPricing } from "../../../../lib/pricing/encargue-combos-core";

test("calculateComboPricing applies 30% discount to cheaper item for 1 top + 1 bottom", () => {
  const result = calculateComboPricing([
    {
      lineId: "line-top-1",
      productId: "top-1",
      productSlug: "buzo-nike-gris",
      productName: "Buzo Nike Gris",
      priceArs: 50_000,
      quantity: 1,
      comboGroup: "winter-2026",
      categorySlug: "buzos",
    },
    {
      lineId: "line-bottom-1",
      productId: "bottom-1",
      productSlug: "pantalon-nike-gris",
      productName: "Pantalón Nike Gris",
      priceArs: 40_000,
      quantity: 1,
      comboGroup: "winter-2026",
      categorySlug: "pantalones",
    },
  ]);

  assert.ok(result);
  assert.equal(result?.originalTotal, 90_000);
  assert.equal(result?.comboDiscount, 12_000);
  assert.equal(result?.finalTotal, 78_000);
  assert.equal(result?.appliedDiscounts.length, 1);
  assert.equal(result?.appliedDiscounts[0]?.productId, "bottom-1");
  assert.equal(result?.appliedDiscounts[0]?.amountArs, 12_000);
  assert.equal(result?.appliedDiscounts[0]?.lineId, "line-bottom-1");
});

test("calculateComboPricing pairs by rank for 2 tops + 1 bottom", () => {
  const result = calculateComboPricing([
    {
      lineId: "line-top-1",
      productId: "top-1",
      productSlug: "campera-a",
      productName: "Campera A",
      priceArs: 70_000,
      quantity: 1,
      comboGroup: "look-01",
      categorySlug: "camperas",
    },
    {
      lineId: "line-top-2",
      productId: "top-2",
      productSlug: "buzo-b",
      productName: "Buzo B",
      priceArs: 55_000,
      quantity: 1,
      comboGroup: "look-01",
      categorySlug: "buzos",
    },
    {
      lineId: "line-bottom-1",
      productId: "bottom-1",
      productSlug: "jean-c",
      productName: "Jean C",
      priceArs: 40_000,
      quantity: 1,
      comboGroup: "look-01",
      categorySlug: "jeans",
    },
  ]);

  assert.ok(result);
  assert.equal(result?.comboDiscount, 12_000);
  assert.equal(result?.appliedDiscounts.length, 1);
  assert.equal(result?.appliedDiscounts[0]?.productId, "bottom-1");
});

test("calculateComboPricing keeps deterministic discount target on equal prices", () => {
  const result = calculateComboPricing([
    {
      lineId: "line-top-1",
      productId: "top-1",
      productSlug: "top-equal",
      productName: "Top Equal",
      priceArs: 40_000,
      quantity: 1,
      comboGroup: "look-02",
      categorySlug: "tops",
    },
    {
      lineId: "line-bottom-1",
      productId: "bottom-1",
      productSlug: "bottom-equal",
      productName: "Bottom Equal",
      priceArs: 40_000,
      quantity: 1,
      comboGroup: "look-02",
      categorySlug: "pants",
    },
  ]);

  assert.ok(result);
  assert.equal(result?.comboDiscount, 12_000);
  assert.equal(result?.appliedDiscounts[0]?.productId, "top-1");
});

test("calculateComboConfidence scores explicit matches above auto-promote threshold", () => {
  const score = calculateComboConfidence({
    hasExplicitGroup: true,
    albumTitleMatch: true,
    brandConsistency: true,
    priceRangeConsistency: true,
    hasMultipleProducts: true,
  });

  assert.equal(score, 1);
});

test("calculateComboConfidence keeps weak signals below merchandising threshold", () => {
  const score = calculateComboConfidence({
    hasExplicitGroup: false,
    albumTitleMatch: false,
    brandConsistency: true,
    priceRangeConsistency: true,
    hasMultipleProducts: false,
  });

  assert.equal(score, 0.2);
});
