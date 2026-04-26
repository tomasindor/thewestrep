import test from "node:test";
import assert from "node:assert/strict";

import { brands } from "../../lib/catalog/data/brands";
import { editableEncargueProducts } from "../../lib/catalog/data/inventory-editable-encargue";
import { editableStockProducts } from "../../lib/catalog/data/inventory-editable-stock";
import type { EditableInventoryProduct } from "../../lib/catalog/types";

test("editable inventory brand references resolve and inventory validation stays clean", async () => {
  const brandIds = new Set(brands.map((brand) => brand.id));
  const products: readonly EditableInventoryProduct[] = [
    ...editableStockProducts,
    ...editableEncargueProducts,
  ];

  for (const product of products) {
    assert.equal(
      brandIds.has(product.brand),
      true,
      `Expected brand '${product.brand}' to exist for product '${product.slug}'.`,
    );
  }

  const inventoryModule = await import("../../lib/catalog/data/inventory");

  assert.deepEqual(inventoryModule.inventoryValidationIssues, []);
});
