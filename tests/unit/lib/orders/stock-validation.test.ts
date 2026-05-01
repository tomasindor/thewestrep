import assert from "node:assert/strict";
import test from "node:test";

import {
  checkStockAvailability,
  validateStockAvailability,
} from "../../../../lib/orders/checkout.server";

test("checkStockAvailability: sufficient stock allows order to proceed", () => {
  const items = [
    { productId: "sku-1", quantity: 2 },
    { productId: "sku-2", quantity: 1 },
  ];
  const inventoryRows = [
    { productId: "sku-1", stock: 5 },
    { productId: "sku-2", stock: 3 },
  ];

  const result = checkStockAvailability(items, inventoryRows);

  assert.equal(result.available, true);
  assert.deepStrictEqual(result.unavailableSkus, []);
});

test("checkStockAvailability: insufficient stock rejects with unavailable SKUs", () => {
  const items = [
    { productId: "sku-1", quantity: 10 },
    { productId: "sku-2", quantity: 1 },
  ];
  const inventoryRows = [
    { productId: "sku-1", stock: 5 },
    { productId: "sku-2", stock: 3 },
  ];

  const result = checkStockAvailability(items, inventoryRows);

  assert.equal(result.available, false);
  assert.deepStrictEqual(result.unavailableSkus, ["sku-1"]);
});

test("checkStockAvailability: products not in inventory table assume unlimited stock", () => {
  const items = [
    { productId: "sku-1", quantity: 2 },
    { productId: "sku-new", quantity: 99 },
  ];
  const inventoryRows = [
    { productId: "sku-1", stock: 5 },
  ];

  const result = checkStockAvailability(items, inventoryRows);

  assert.equal(result.available, true);
  assert.deepStrictEqual(result.unavailableSkus, []);
});

test("checkStockAvailability: exact stock boundary is allowed", () => {
  const items = [{ productId: "sku-1", quantity: 5 }];
  const inventoryRows = [{ productId: "sku-1", stock: 5 }];

  const result = checkStockAvailability(items, inventoryRows);

  assert.equal(result.available, true);
  assert.deepStrictEqual(result.unavailableSkus, []);
});

test("checkStockAvailability: multiple insufficient items returns all unavailable SKUs", () => {
  const items = [
    { productId: "sku-1", quantity: 10 },
    { productId: "sku-2", quantity: 5 },
  ];
  const inventoryRows = [
    { productId: "sku-1", stock: 2 },
    { productId: "sku-2", stock: 1 },
  ];

  const result = checkStockAvailability(items, inventoryRows);

  assert.equal(result.available, false);
  assert.deepStrictEqual(result.unavailableSkus, ["sku-1", "sku-2"]);
});

test("validateStockAvailability delegates to checkStockAvailability with DB results", async () => {
  const mockInventory = [
    { productId: "sku-1", stock: 5 },
    { productId: "sku-2", stock: 1 },
  ];

  const result = await validateStockAvailability(
    [
      { productId: "sku-1", quantity: 2 } as unknown as import("../../../../lib/orders/checkout.shared").CheckoutOrderItem,
      { productId: "sku-2", quantity: 5 } as unknown as import("../../../../lib/orders/checkout.shared").CheckoutOrderItem,
    ],
    { queryInventory: async () => mockInventory }
  );

  assert.equal(result.available, false);
  assert.deepStrictEqual(result.unavailableSkus, ["sku-2"]);
});
