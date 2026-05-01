import assert from "node:assert/strict";
import test from "node:test";

import {
  createAdminOrdersRouteHandlers,
  isValidOrderStatusTransition,
  isValidPaymentStatusTransition,
} from "../../../../lib/orders/admin-route-handlers";

test("isValidOrderStatusTransition: submitted → confirmed is valid", () => {
  assert.equal(isValidOrderStatusTransition("submitted", "confirmed"), true);
});

test("isValidOrderStatusTransition: confirmed → processing is valid", () => {
  assert.equal(isValidOrderStatusTransition("confirmed", "processing"), true);
});

test("isValidOrderStatusTransition: processing → shipped is valid", () => {
  assert.equal(isValidOrderStatusTransition("processing", "shipped"), true);
});

test("isValidOrderStatusTransition: shipped → delivered is valid", () => {
  assert.equal(isValidOrderStatusTransition("shipped", "delivered"), true);
});

test("isValidOrderStatusTransition: any non-delivered → cancelled is valid", () => {
  assert.equal(isValidOrderStatusTransition("submitted", "cancelled"), true);
  assert.equal(isValidOrderStatusTransition("confirmed", "cancelled"), true);
  assert.equal(isValidOrderStatusTransition("processing", "cancelled"), true);
  assert.equal(isValidOrderStatusTransition("shipped", "cancelled"), true);
});

test("isValidOrderStatusTransition: delivered → cancelled is invalid", () => {
  assert.equal(isValidOrderStatusTransition("delivered", "cancelled"), false);
});

test("isValidOrderStatusTransition: submitted → delivered is invalid", () => {
  assert.equal(isValidOrderStatusTransition("submitted", "delivered"), false);
});

test("isValidPaymentStatusTransition: pending → approved is valid", () => {
  assert.equal(isValidPaymentStatusTransition("pending", "approved"), true);
});

test("isValidPaymentStatusTransition: awaiting_transfer → approved is valid", () => {
  assert.equal(isValidPaymentStatusTransition("awaiting_transfer", "approved"), true);
});

test("isValidPaymentStatusTransition: approved → pending is invalid", () => {
  assert.equal(isValidPaymentStatusTransition("approved", "pending"), false);
});

test("updateOrderStatus: valid transition succeeds", async () => {
  let updatedStatus: string | null = null;
  let auditAction: string | null = null;

  const handlers = createAdminOrdersRouteHandlers({
    requireAdminSession: async () => ({ user: { id: "admin-1" } }),
    getDbInstance: () =>
      ({
        query: {
          orders: {
            findFirst: async () => ({ id: "order-1", status: "submitted" }),
          },
        },
        transaction: async (fn: (tx: unknown) => Promise<void>) => {
          const mockTx = {
            update: () => ({
              set: (values: { status: string }) => ({
                where: () => {
                  updatedStatus = values.status;
                  return Promise.resolve();
                },
              }),
            }),
            insert: () => ({
              values: (values: { action: string }) => {
                auditAction = values.action;
                return Promise.resolve();
              },
            }),
          };
          await fn(mockTx);
        },
      }) as unknown as ReturnType<typeof import("@/lib/db/core").getDb>,
    logError: () => {},
  });

  const request = new Request("http://localhost/api/admin/orders/order-1/status", {
    method: "PATCH",
    body: JSON.stringify({ status: "confirmed" }),
  });

  const response = await handlers.updateOrderStatus(request, "order-1");
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(updatedStatus, "confirmed");
  assert.equal(auditAction, "status_change");
});

test("updateOrderStatus: invalid transition returns 400", async () => {
  const handlers = createAdminOrdersRouteHandlers({
    requireAdminSession: async () => ({ user: { id: "admin-1" } }),
    getDbInstance: () =>
      ({
        query: {
          orders: {
            findFirst: async () => ({ id: "order-1", status: "submitted" }),
          },
        },
      }) as unknown as ReturnType<typeof import("@/lib/db/core").getDb>,
    logError: () => {},
  });

  const request = new Request("http://localhost/api/admin/orders/order-1/status", {
    method: "PATCH",
    body: JSON.stringify({ status: "delivered" }),
  });

  const response = await handlers.updateOrderStatus(request, "order-1");
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.includes("Transición inválida"), true);
});

test("approvePayment: approves awaiting_transfer and confirms order", async () => {
  let updatedOrder: Record<string, unknown> | null = null;

  const handlers = createAdminOrdersRouteHandlers({
    requireAdminSession: async () => ({ user: { id: "admin-1" } }),
    getDbInstance: () =>
      ({
        query: {
          orders: {
            findFirst: async () => ({
              id: "order-1",
              status: "submitted",
              paymentStatus: "awaiting_transfer",
            }),
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
      }) as unknown as ReturnType<typeof import("@/lib/db/core").getDb>,
    logError: () => {},
  });

  const request = new Request("http://localhost/api/admin/orders/order-1/payment/approve", {
    method: "POST",
  });

  const response = await handlers.approvePayment(request, "order-1");
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  // V2: approvePayment only updates paymentStatus to approved; order.status stays as-is
  assert.equal((updatedOrder as unknown as Record<string, unknown>)?.paymentStatus, "approved");
  assert.equal((updatedOrder as unknown as Record<string, unknown>)?.status, "submitted");
});

test("approvePayment: duplicate approval returns 400", async () => {
  const handlers = createAdminOrdersRouteHandlers({
    requireAdminSession: async () => ({ user: { id: "admin-1" } }),
    getDbInstance: () =>
      ({
        query: {
          orders: {
            findFirst: async () => ({
              id: "order-1",
              status: "confirmed",
              paymentStatus: "approved",
            }),
          },
        },
      }) as unknown as ReturnType<typeof import("@/lib/db/core").getDb>,
    logError: () => {},
  });

  const request = new Request("http://localhost/api/admin/orders/order-1/payment/approve", {
    method: "POST",
  });

  const response = await handlers.approvePayment(request, "order-1");
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.includes("No se puede aprobar"), true);
});

test("updateContact: rejects forbidden fields", async () => {
  const handlers = createAdminOrdersRouteHandlers({
    requireAdminSession: async () => ({ user: { id: "admin-1" } }),
    getDbInstance: () => null,
    logError: () => {},
  });

  const request = new Request("http://localhost/api/admin/orders/order-1/contact", {
    method: "PATCH",
    body: JSON.stringify({ totals: 100_000, contactName: "Nuevo" }),
  });

  const response = await handlers.updateContact(request, "order-1");
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.includes("No editable en V1"), true);
});

test("updateContact: allows allowed fields", async () => {
  let updatedFields: Record<string, unknown> | null = null;

  const handlers = createAdminOrdersRouteHandlers({
    requireAdminSession: async () => ({ user: { id: "admin-1" } }),
    getDbInstance: () =>
      ({
        query: {
          orders: {
            findFirst: async () => ({
              id: "order-1",
              contactName: "Viejo",
              contactEmail: "viejo@correo.com",
            }),
          },
        },
        transaction: async (fn: (tx: unknown) => Promise<void>) => {
          const mockTx = {
            update: () => ({
              set: (values: Record<string, unknown>) => ({
                where: () => {
                  updatedFields = values;
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
      }) as unknown as ReturnType<typeof import("@/lib/db/core").getDb>,
    logError: () => {},
  });

  const request = new Request("http://localhost/api/admin/orders/order-1/contact", {
    method: "PATCH",
    body: JSON.stringify({ contactName: "Nuevo", contactEmail: "nuevo@correo.com" }),
  });

  const response = await handlers.updateContact(request, "order-1");
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal((updatedFields as unknown as Record<string, unknown>)?.contactName, "Nuevo");
  assert.equal((updatedFields as unknown as Record<string, unknown>)?.contactEmail, "nuevo@correo.com");
});

test("addNote: creates audit log with note", async () => {
  let auditValues: Record<string, unknown> | null = null;

  const handlers = createAdminOrdersRouteHandlers({
    requireAdminSession: async () => ({ user: { id: "admin-1" } }),
    getDbInstance: () =>
      ({
        query: {
          orders: {
            findFirst: async () => ({ id: "order-1" }),
          },
        },
        insert: () => ({
          values: (values: Record<string, unknown>) => {
            auditValues = values;
            return Promise.resolve();
          },
        }),
      }) as unknown as ReturnType<typeof import("@/lib/db/core").getDb>,
    logError: () => {},
  });

  const request = new Request("http://localhost/api/admin/orders/order-1/notes", {
    method: "POST",
    body: JSON.stringify({ note: "Cliente pidió cambio de dirección" }),
  });

  const response = await handlers.addNote(request, "order-1");
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal((((auditValues as unknown) as Record<string, unknown>)?.newValue as Record<string, unknown>)?.note, "Cliente pidió cambio de dirección");
  assert.equal((auditValues as unknown as Record<string, unknown>)?.action, "note_added");
});

test("listOrders: returns simplified fields without status filter", async () => {
  const mockOrders = [
    { id: "order-1", reference: "REF-001", contactName: "Juan Pérez", totalAmountArs: 15000, status: "pending_payment" },
    { id: "order-2", reference: "REF-002", contactName: "Ana López", totalAmountArs: 23000, status: "paid" },
  ];

  const handlers = createAdminOrdersRouteHandlers({
    requireAdminSession: async () => ({ user: { id: "admin-1" } }),
    getDbInstance: () =>
      ({
        query: {
          orders: {
            findMany: async () => mockOrders,
          },
        },
        select: () => ({
          from: () => ({
            where: async () => [{ count: 2 }],
          }),
        }),
      }) as unknown as ReturnType<typeof import("@/lib/db/core").getDb>,
    logError: () => {},
  });

  const request = new Request("http://localhost/api/admin/orders");
  const response = await handlers.listOrders(request);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.data.items.length, 2);
  assert.deepEqual(body.data.items[0], { reference: "REF-001", customerName: "Juan Pérez", total: 15000, status: "pending_payment" });
  assert.deepEqual(body.data.items[1], { reference: "REF-002", customerName: "Ana López", total: 23000, status: "paid" });
  assert.equal(body.data.pagination.total, 2);
});

test("listOrders: filters by ?status=pending_payment", async () => {
  let capturedWhere: unknown;

  const handlers = createAdminOrdersRouteHandlers({
    requireAdminSession: async () => ({ user: { id: "admin-1" } }),
    getDbInstance: () =>
      ({
        query: {
          orders: {
            findMany: async ({ where }: { where?: unknown }) => {
              capturedWhere = where;
              return [{ id: "order-1", reference: "REF-001", contactName: "Juan Pérez", totalAmountArs: 15000, status: "pending_payment" }];
            },
          },
        },
        select: () => ({
          from: () => ({
            where: async () => [{ count: 1 }],
          }),
        }),
      }) as unknown as ReturnType<typeof import("@/lib/db/core").getDb>,
    logError: () => {},
  });

  const request = new Request("http://localhost/api/admin/orders?status=pending_payment");
  const response = await handlers.listOrders(request);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.data.items.length, 1);
  assert.equal(body.data.items[0].status, "pending_payment");
  assert.ok(capturedWhere);
});

test("listOrders: pagination with limit and offset", async () => {
  const handlers = createAdminOrdersRouteHandlers({
    requireAdminSession: async () => ({ user: { id: "admin-1" } }),
    getDbInstance: () =>
      ({
        query: {
          orders: {
            findMany: async ({ limit, offset }: { limit: number; offset: number }) => {
              return Array.from({ length: limit }, (_, i) => ({
                id: `order-${offset + i + 1}`,
                reference: `REF-${String(offset + i + 1).padStart(3, "0")}`,
                contactName: `Cliente ${offset + i + 1}`,
                totalAmountArs: 10000 + (offset + i) * 1000,
                status: "pending_payment" as const,
              }));
            },
          },
        },
        select: () => ({
          from: () => ({
            where: async () => [{ count: 25 }],
          }),
        }),
      }) as unknown as ReturnType<typeof import("@/lib/db/core").getDb>,
    logError: () => {},
  });

  const request = new Request("http://localhost/api/admin/orders?limit=10&offset=5");
  const response = await handlers.listOrders(request);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.data.items.length, 10);
  assert.equal(body.data.pagination.limit, 10);
  assert.equal(body.data.pagination.offset, 5);
  assert.equal(body.data.pagination.total, 25);
  assert.equal(body.data.items[0].reference, "REF-006");
});

test("listOrders: rejects invalid status values", async () => {
  const handlers = createAdminOrdersRouteHandlers({
    requireAdminSession: async () => ({ user: { id: "admin-1" } }),
    getDbInstance: () => null,
    logError: () => {},
  });

  const request = new Request("http://localhost/api/admin/orders?status=shipped");
  const response = await handlers.listOrders(request);
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.includes("Estado inválido"), true);
});
