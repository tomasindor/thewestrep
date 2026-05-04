import assert from "node:assert/strict";
import test from "node:test";

import {
  mapMercadoPagoPaymentStatus,
  processMercadoPagoWebhook,
  verifyMercadoPagoSignature,
} from "../../../../lib/payments/mercadopago-webhook";

test("processMercadoPagoWebhook: rejects invalid signature", async () => {
  const result = await processMercadoPagoWebhook(
    { data: { id: "123" } },
    { signatureHeader: "invalid-signature", requestIdHeader: "req", dataId: "123" },
    {
      verifySignature: () => false,
      getWebhookSecret: () => "secret",
      getDbInstance: () => null,
      mapStatus: mapMercadoPagoPaymentStatus,
      getPayment: async () => null,
    },
  );

  assert.equal(result.status, 401);
  assert.equal(result.success, false);
});

test("processMercadoPagoWebhook: rejects when secret not configured", async () => {
  const result = await processMercadoPagoWebhook(
    { data: { id: "123" } },
    { signatureHeader: "ts=1,v1=abc", requestIdHeader: "req", dataId: "123" },
    {
      verifySignature: () => true,
      getWebhookSecret: () => null,
      getDbInstance: () => null,
      mapStatus: mapMercadoPagoPaymentStatus,
      getPayment: async () => null,
    },
  );

  assert.equal(result.status, 500);
  assert.equal(result.success, false);
});

test("processMercadoPagoWebhook: approves payment and confirms order", async () => {
  const mockOrder = {
    id: "order-1",
    reference: "TWR-2026-TEST",
    status: "submitted",
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
    { data: { id: "123" }, status: "approved", external_reference: "TWR-2026-TEST" } as unknown as Parameters<typeof processMercadoPagoWebhook>[0],
    { signatureHeader: "valid-signature", requestIdHeader: "req", dataId: "123" },
    {
      verifySignature: () => true,
      getWebhookSecret: () => "secret",
      getDbInstance: () => mockDb as unknown as ReturnType<typeof import("@/lib/db/core").getDb>,
      mapStatus: mapMercadoPagoPaymentStatus,
      getPayment: async () => ({ paymentId: "123", externalReference: "TWR-2026-TEST", status: "approved" }),
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.success, true);
  assert.equal((updatedOrder as unknown as Record<string, unknown>)?.paymentStatus, "approved");
  assert.equal((updatedOrder as unknown as Record<string, unknown>)?.status, "confirmed");
  assert.equal((auditLog as unknown as Record<string, unknown>)?.action, "payment_approval");
});

test("processMercadoPagoWebhook: returns 404 when order not found", async () => {
  const mockDb = {
    query: {
      orders: {
        findFirst: async () => null,
      },
    },
  };

  const result = await processMercadoPagoWebhook(
    { data: { id: "123" }, status: "approved", external_reference: "TWR-2026-MISSING" } as unknown as Parameters<typeof processMercadoPagoWebhook>[0],
    { signatureHeader: "valid-signature", requestIdHeader: "req", dataId: "123" },
    {
      verifySignature: () => true,
      getWebhookSecret: () => "secret",
      getDbInstance: () => mockDb as unknown as ReturnType<typeof import("@/lib/db/core").getDb>,
      mapStatus: mapMercadoPagoPaymentStatus,
      getPayment: async () => ({ paymentId: "123", externalReference: "TWR-2026-MISSING", status: "approved" }),
    },
  );

  assert.equal(result.status, 404);
  assert.equal(result.success, false);
});
