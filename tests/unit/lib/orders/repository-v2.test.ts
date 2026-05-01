import assert from "node:assert/strict";
import test from "node:test";

import { createOrderFromCheckoutV2 } from "../../../../lib/orders/repository";

function buildV2Payload() {
  return {
    customer: {
      name: "Gonzalo Pérez",
      phone: "+54 9 11 5555 5555",
      email: "gonza@correo.com",
      provinceId: "06",
      provinceName: "Buenos Aires",
      cityId: "06028",
      cityName: "La Matanza",
      address: "Av. Rivadavia 1234",
      recipient: "Gonzalo Pérez",
      notes: "Tocar timbre",
    },
    items: [
      {
        id: "sku-1",
        productId: "sku-1",
        productSlug: "zapatilla-1",
        productName: "Zapatilla 1",
        availability: "stock" as const,
        availabilityLabel: "Stock",
        priceDisplay: "$ 20.000",
        quantity: 1,
      },
    ],
    totalAmountArs: 20_000,
  };
}

test("createOrderFromCheckoutV2 creates order with pending_payment status", async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let insertedOrder: any = null;

  const mockDb = {
    insert: () => ({
      values: (values: Record<string, unknown> | unknown[]) => {
        if (!Array.isArray(values)) {
          insertedOrder = values;
        }
        return Promise.resolve();
      },
    }),
    query: {
      orders: {
        findFirst: async () => null,
      },
    },
  };

  // Override requireDb by passing a mock
  const result = await createOrderFromCheckoutV2(buildV2Payload(), {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db: mockDb as any,
    idFactory: () => "test-id",
    referenceFactory: () => "TWR-2026-TEST",
  });

  assert.equal(result.status, "pending_payment");
  assert.equal(result.reference, "TWR-2026-TEST");
  assert.equal(insertedOrder?.status, "pending_payment");
});

test("createOrderFromCheckoutV2 persists province and city fields", async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let insertedOrder: any = null;

  const mockDb = {
    insert: () => ({
      values: (values: Record<string, unknown> | unknown[]) => {
        if (!Array.isArray(values)) {
          insertedOrder = values;
        }
        return Promise.resolve();
      },
    }),
    query: {
      orders: {
        findFirst: async () => null,
      },
    },
  };

  await createOrderFromCheckoutV2(buildV2Payload(), {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db: mockDb as any,
    idFactory: () => "test-id",
    referenceFactory: () => "TWR-2026-TEST",
  });

  assert.equal(insertedOrder?.provinceId, "06");
  assert.equal(insertedOrder?.provinceName, "Buenos Aires");
  assert.equal(insertedOrder?.cityId, "06028");
  assert.equal(insertedOrder?.cityName, "La Matanza");
  assert.equal(insertedOrder?.contactName, "Gonzalo Pérez");
  assert.equal(insertedOrder?.contactEmail, "gonza@correo.com");
  assert.equal(insertedOrder?.contactPhone, "+54 9 11 5555 5555");
  assert.equal(insertedOrder?.location, "Av. Rivadavia 1234");
  assert.equal(insertedOrder?.deliveryRecipient, "Gonzalo Pérez");
  assert.equal(insertedOrder?.notes, "Tocar timbre");
});

test("createOrderFromCheckoutV2 calculates total from items without shipping", async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let insertedOrder: any = null;

  const mockDb = {
    insert: () => ({
      values: (values: Record<string, unknown> | unknown[]) => {
        if (!Array.isArray(values)) {
          insertedOrder = values;
        }
        return Promise.resolve();
      },
    }),
    query: {
      orders: {
        findFirst: async () => null,
      },
    },
  };

  const result = await createOrderFromCheckoutV2(buildV2Payload(), {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db: mockDb as any,
    idFactory: () => "test-id",
    referenceFactory: () => "TWR-2026-TEST",
  });

  assert.equal(result.totalAmountArs, 20_000);
  assert.equal(insertedOrder?.totalAmountArs, 20_000);
  assert.equal(insertedOrder?.shippingAmountArs, 0);
  assert.equal(insertedOrder?.subtotalAmountArs, 20_000);
});
