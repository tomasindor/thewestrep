import assert from "node:assert/strict";
import test from "node:test";

import { validateImportPrice } from "../../../../lib/imports/price-validator";

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
