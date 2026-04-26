import assert from "node:assert/strict";
import test from "node:test";

import { resolveImportPrices, validateImportPrice } from "../../../../lib/imports/price-validator";

test("validateImportPrice accepts resolved positive price", () => {
  const result = validateImportPrice({ finalPrice: 120000, priceArs: 90000 });

  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.price, 120000);
  }
});

test("validateImportPrice rejects missing or invalid prices with explicit skip reason", () => {
  const missing = validateImportPrice({ name: "Remera" });
  assert.equal(missing.valid, false);
  if (!missing.valid) {
    assert.equal(missing.reason, "missing-price");
    assert.match(missing.message, /precio/i);
  }

  const invalid = validateImportPrice({ priceArs: 0 });
  assert.equal(invalid.valid, false);
  if (!invalid.valid) {
    assert.equal(invalid.reason, "missing-price");
  }
});

test("resolveImportPrices returns both detected prices when importer payload includes pair metadata", () => {
  const result = resolveImportPrices({
    finalPrice: 120000,
    detectedPrices: [120000, "95.000"],
  });

  assert.equal(result.valid, true);
  if (result.valid) {
    assert.deepEqual(result.prices.slice(0, 2), [120000, 95000]);
    assert.equal(result.primaryPrice, 120000);
  }
});
