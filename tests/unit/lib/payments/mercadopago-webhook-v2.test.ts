import assert from "node:assert/strict";
import test from "node:test";

import {
  mapMercadoPagoPaymentStatus,
  processMercadoPagoWebhook,
  verifyMercadoPagoSignature,
} from "../../../../lib/payments/mercadopago-webhook";

test("webhook updates V2 order from pending_payment to paid", async () => {
  const mockOrder = {
    id: "order-v2",
    reference: "TWR-2026-V2",
    status: "pending_payment",
    paymentStatus: "pending",
  };

  let updatedOrder: Record<string, unknown> | null = null;
  let auditLog: Record<string, unknown> | null = null;

  const mockDb = {
    query: {
      orders: {
        findFirst: async () => mockOrder,
      },
    },
    transaction: async (fn: (tx: unknown) => Promise<void>) => {
      const mockTx = {
        update: () => ({
          set: (values: Record<string, unknown>) => ({
            where: () => {
              updatedOrder = values;
              return Promise.resolve();
            },
          }),
        }),
        insert: () => ({
          values: (values: Record<string, unknown>) => {
            auditLog = values;
            return Promise.resolve();
          },
        }),
      };
      await fn(mockTx);
    },
  };

  const result = await processMercadoPagoWebhook(
    { data: { id: "123" }, status: "approved", external_reference: "TWR-2026-V2" } as unknown as Parameters<typeof processMercadoPagoWebhook>[0],
    { signatureHeader: "valid-signature", requestIdHeader: "req", dataId: "123" },
    {
      verifySignature: () => true,
      getWebhookSecret: () => "secret",
      getDbInstance: () => mockDb as unknown as ReturnType<typeof import("@/lib/db/core").getDb>,
      mapStatus: mapMercadoPagoPaymentStatus,
      getPayment: async () => ({ paymentId: "123", externalReference: "TWR-2026-V2", status: "approved" }),
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.success, true);
  assert.equal((updatedOrder as unknown as Record<string, unknown>)?.status, "paid");
  assert.equal((auditLog as unknown as Record<string, unknown>)?.action, "payment_approval");
});

test("webhook is idempotent for already paid order", async () => {
  const mockOrder = {
    id: "order-paid",
    reference: "TWR-2026-PAID",
    status: "paid",
    paymentStatus: "approved",
  };

  let updatedOrder: Record<string, unknown> | null = null;

  const mockDb = {
    query: {
      orders: {
        findFirst: async () => mockOrder,
      },
    },
    transaction: async (fn: (tx: unknown) => Promise<void>) => {
      const mockTx = {
        update: () => ({
          set: (values: Record<string, unknown>) => ({
            where: () => {
              updatedOrder = values;
              return Promise.resolve();
            },
          }),
        }),
        insert: () => ({
          values: () => Promise.resolve(),
        }),
      };
      await fn(mockTx);
    },
  };

  const result = await processMercadoPagoWebhook(
    { data: { id: "123" }, status: "approved", external_reference: "TWR-2026-PAID" } as unknown as Parameters<typeof processMercadoPagoWebhook>[0],
    { signatureHeader: "valid-signature", requestIdHeader: "req", dataId: "123" },
    {
      verifySignature: () => true,
      getWebhookSecret: () => "secret",
      getDbInstance: () => mockDb as unknown as ReturnType<typeof import("@/lib/db/core").getDb>,
      mapStatus: mapMercadoPagoPaymentStatus,
      getPayment: async () => ({ paymentId: "123", externalReference: "TWR-2026-PAID", status: "approved" }),
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.success, true);
  assert.equal((updatedOrder as unknown as Record<string, unknown>)?.status, "paid");
});

test("webhook still updates V1 order from submitted to confirmed", async () => {
  const mockOrder = {
    id: "order-v1",
    reference: "TWR-2026-V1",
    status: "submitted",
    paymentStatus: "pending",
  };

  let updatedOrder: Record<string, unknown> | null = null;

  const mockDb = {
    query: {
      orders: {
        findFirst: async () => mockOrder,
      },
    },
    transaction: async (fn: (tx: unknown) => Promise<void>) => {
      const mockTx = {
        update: () => ({
          set: (values: Record<string, unknown>) => ({
            where: () => {
              updatedOrder = values;
              return Promise.resolve();
            },
          }),
        }),
        insert: () => ({
          values: () => Promise.resolve(),
        }),
      };
      await fn(mockTx);
    },
  };

  const result = await processMercadoPagoWebhook(
    { data: { id: "123" }, status: "approved", external_reference: "TWR-2026-V1" } as unknown as Parameters<typeof processMercadoPagoWebhook>[0],
    { signatureHeader: "valid-signature", requestIdHeader: "req", dataId: "123" },
    {
      verifySignature: () => true,
      getWebhookSecret: () => "secret",
      getDbInstance: () => mockDb as unknown as ReturnType<typeof import("@/lib/db/core").getDb>,
      mapStatus: mapMercadoPagoPaymentStatus,
      getPayment: async () => ({ paymentId: "123", externalReference: "TWR-2026-V1", status: "approved" }),
    },
  );

  assert.equal(result.status, 200);
  assert.equal((updatedOrder as unknown as Record<string, unknown>)?.status, "confirmed");
});
