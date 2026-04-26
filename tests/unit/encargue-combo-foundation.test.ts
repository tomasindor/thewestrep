import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

import { orderItems, products } from "../../lib/db/schema";

test("products schema exposes combo metadata columns", () => {
  assert.ok(products.comboEligible);
  assert.ok(products.comboGroup);
  assert.ok(products.comboPriority);
  assert.ok(products.comboSourceKey);
});

test("order item snapshot includes comboDiscount metadata", () => {
  assert.ok(orderItems.itemSnapshot);
  const schemaSource = fs.readFileSync(path.resolve("./lib/db/schema.ts"), "utf-8");
  assert.match(schemaSource, /comboDiscount\?:\s*\{/);
  assert.match(schemaSource, /pairedWithProductId/);
});

test("catalog Product type declares combo fields", () => {
  const source = fs.readFileSync(path.resolve("./lib/catalog/types.ts"), "utf-8");
  assert.match(source, /comboEligible\?: boolean/);
  assert.match(source, /comboGroup\?: string/);
  assert.match(source, /comboPriority\?: number/);
  assert.match(source, /comboSourceKey\?: string/);
  assert.match(source, /comboScore\?: number/);
});

test("merchandising surfaces wire combo components", () => {
  const pdpSource = fs.readFileSync(path.resolve("./components/catalog/product-detail-page.tsx"), "utf-8");
  const cardSource = fs.readFileSync(path.resolve("./components/catalog/product-card.tsx"), "utf-8");
  const adminSource = fs.readFileSync(path.resolve("./components/admin/imports-review-client.tsx"), "utf-8");
  const badgeSource = fs.readFileSync(path.resolve("./components/catalog/combo-badge.tsx"), "utf-8");
  const cartSource = fs.readFileSync(path.resolve("./components/cart/cart-drawer.tsx"), "utf-8");
  const homeSource = fs.readFileSync(path.resolve("./components/marketing/homepage.tsx"), "utf-8");
  const combosLandingSource = fs.readFileSync(path.resolve("./app/encargue/combos/page.tsx"), "utf-8");

  assert.match(pdpSource, /ComboRail/);
  assert.match(cardSource, /ComboBadge/);
  assert.doesNotMatch(adminSource, /comboScore|Combo score|Combo Score/);
  assert.match(homeSource, /Ver look completo/);
  assert.match(homeSource, /encargue\/combos/);
  assert.match(combosLandingSource, /Combos Encargue \| TheWestRep/);
  assert.match(badgeSource, /pairedProductName/);
  assert.match(cartSource, /Combo:/);
});
