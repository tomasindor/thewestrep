import "server-only";

import { eq, desc, and, sql } from "drizzle-orm";

import { getDb } from "@/lib/db/core";
import { orders, orderAuditLogs } from "@/lib/db/schema";
import { orderStatusEnum, paymentStatusEnum } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

async function defaultRequireAdminSession() {
  const { requireAdminSession } = await import("@/lib/auth/session");
  return requireAdminSession();
}

const VALID_ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  submitted: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

const VALID_PAYMENT_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["approved", "rejected", "expired", "cancelled"],
  awaiting_transfer: ["approved", "expired", "cancelled"],
  approved: [],
  rejected: ["pending"],
  expired: ["pending"],
  cancelled: ["pending"],
};

export function isValidOrderStatusTransition(
  from: string,
  to: string,
): boolean {
  if (to === "cancelled" && from !== "delivered" && from !== "cancelled") {
    return true;
  }
  return VALID_ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isValidPaymentStatusTransition(
  from: string,
  to: string,
): boolean {
  return VALID_PAYMENT_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

interface AdminOrdersRouteDeps {
  requireAdminSession: () => Promise<{ user: { id: string; name?: string | null; email?: string | null } } | null>;
  getDbInstance: () => ReturnType<typeof getDb>;
  logError: (event: string, context: Record<string, unknown>) => void;
}

function createDefaultDeps(): AdminOrdersRouteDeps | null {
  const db = getDb();
  if (!db) {
    return null;
  }

  return {
    requireAdminSession: defaultRequireAdminSession,
    getDbInstance: () => db,
    logError: logger.error,
  };
}

export function createAdminOrdersRouteHandlers(overrides: Partial<AdminOrdersRouteDeps> = {}) {
  const defaults = createDefaultDeps();

  const deps: AdminOrdersRouteDeps = {
    requireAdminSession: defaultRequireAdminSession,
    getDbInstance: () => {
      if (!defaults) {
        throw new Error("Database not configured. Set DATABASE_URL in your environment.");
      }
      return defaults.getDbInstance();
    },
    logError: logger.error,
    ...overrides,
  };

  return {
    async listOrders(request: Request) {
      const session = await deps.requireAdminSession();
      if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");
        const limitCandidate = Number(searchParams.get("limit") ?? "50");
        const limit = Number.isFinite(limitCandidate) && limitCandidate > 0
          ? Math.min(100, Math.trunc(limitCandidate))
          : 50;
        const offsetCandidate = Number(searchParams.get("offset") ?? "0");
        const offset = Number.isFinite(offsetCandidate) && offsetCandidate >= 0
          ? Math.trunc(offsetCandidate)
          : 0;

        if (status && status !== "pending_payment" && status !== "paid") {
          return Response.json({ error: "Estado inválido. Usá pending_payment o paid." }, { status: 400 });
        }

        const db = deps.getDbInstance();
        if (!db) {
          return Response.json({ error: "Database not available." }, { status: 503 });
        }

        const conditions = [];
        if (status) {
          conditions.push(eq(orders.status, status as "pending_payment" | "paid"));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const rows = await db.query.orders.findMany({
          where: whereClause,
          orderBy: [desc(orders.createdAt)],
          limit,
          offset,
          columns: {
            reference: true,
            contactName: true,
            totalAmountArs: true,
            status: true,
          },
        });

        const items = rows.map((row) => ({
          reference: row.reference,
          customerName: row.contactName,
          total: row.totalAmountArs,
          status: row.status,
        }));

        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(orders)
          .where(whereClause ?? sql`true`);

        const total = countResult[0]?.count ?? 0;

        return Response.json({
          ok: true,
          data: {
            items,
            pagination: { limit, offset, total },
          },
        });
      } catch (error) {
        deps.logError("admin_orders_list_failed", { error: getErrorMessage(error) });
        return Response.json({ error: "No se pudo cargar la lista de pedidos." }, { status: 500 });
      }
    },

    async updateOrderStatus(request: Request, orderId: string) {
      const session = await deps.requireAdminSession();
      if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      try {
        const body = (await request.json()) as { status?: string };
        const newStatus = body.status;

        if (!newStatus) {
          return Response.json({ error: "Debés enviar el nuevo estado." }, { status: 400 });
        }

        const db = deps.getDbInstance();
        if (!db) {
          return Response.json({ error: "Database not available." }, { status: 503 });
        }

        const order = await db.query.orders.findFirst({
          where: eq(orders.id, orderId),
        });

        if (!order) {
          return Response.json({ error: "Pedido no encontrado." }, { status: 404 });
        }

        if (!isValidOrderStatusTransition(order.status, newStatus)) {
          return Response.json(
            { error: `Transición inválida: ${order.status} → ${newStatus}.` },
            { status: 400 },
          );
        }

        await db.transaction(async (tx) => {
          await tx
            .update(orders)
            // V2 schema only has pending_payment | paid, but old V1 orders may exist with legacy statuses in DB
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .set({ status: newStatus as unknown as any, updatedAt: new Date() })
            .where(eq(orders.id, orderId));

          await tx.insert(orderAuditLogs).values({
            id: crypto.randomUUID(),
            orderId,
            adminId: session.user.id,
            action: "status_change",
            previousValue: { status: order.status },
            newValue: { status: newStatus },
            createdAt: new Date(),
          });
        });

        return Response.json({ ok: true, data: { id: orderId, status: newStatus } });
      } catch (error) {
        deps.logError("admin_order_status_update_failed", { error: getErrorMessage(error), orderId });
        return Response.json({ error: "No se pudo actualizar el estado del pedido." }, { status: 500 });
      }
    },

    async approvePayment(request: Request, orderId: string) {
      const session = await deps.requireAdminSession();
      if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      try {
        const db = deps.getDbInstance();
        if (!db) {
          return Response.json({ error: "Database not available." }, { status: 503 });
        }

        const order = await db.query.orders.findFirst({
          where: eq(orders.id, orderId),
        });

        if (!order) {
          return Response.json({ error: "Pedido no encontrado." }, { status: 404 });
        }

        if (!isValidPaymentStatusTransition(order.paymentStatus, "approved")) {
          return Response.json(
            { error: `No se puede aprobar un pago con estado ${order.paymentStatus}.` },
            { status: 400 },
          );
        }

        // V2: order.status is already 'pending_payment' | 'paid', no V1 status transition needed
        const newOrderStatus = order.status;

        await db.transaction(async (tx) => {
          await tx
            .update(orders)
            .set({
              paymentStatus: "approved",
              status: newOrderStatus,
              updatedAt: new Date(),
            })
            .where(eq(orders.id, orderId));

          await tx.insert(orderAuditLogs).values({
            id: crypto.randomUUID(),
            orderId,
            adminId: session.user.id,
            action: "payment_approval",
            previousValue: { paymentStatus: order.paymentStatus, status: order.status },
            newValue: { paymentStatus: "approved", status: newOrderStatus },
            createdAt: new Date(),
          });
        });

        return Response.json({
          ok: true,
          data: { id: orderId, paymentStatus: "approved", status: newOrderStatus },
        });
      } catch (error) {
        deps.logError("admin_payment_approval_failed", { error: getErrorMessage(error), orderId });
        return Response.json({ error: "No se pudo aprobar el pago." }, { status: 500 });
      }
    },

    async updateContact(request: Request, orderId: string) {
      const session = await deps.requireAdminSession();
      if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      try {
        const body = (await request.json()) as Record<string, unknown>;

        const forbiddenKeys = ["items", "prices", "totals", "subtotalAmountArs", "shippingAmountArs", "assistedFeeAmountArs", "totalAmountArs", "lineItemCount"];
        const attemptedForbidden = forbiddenKeys.filter((key) => key in body);

        if (attemptedForbidden.length > 0) {
          return Response.json(
            { error: `No editable en V1: ${attemptedForbidden.join(", ")}.` },
            { status: 400 },
          );
        }

        const allowedFields = ["contactName", "contactEmail", "contactPhone", "deliveryRecipient", "location", "notes"];
        const updates: Record<string, unknown> = {};
        for (const key of allowedFields) {
          if (key in body) {
            updates[key] = body[key];
          }
        }

        if (Object.keys(updates).length === 0) {
          return Response.json({ error: "No hay campos válidos para actualizar." }, { status: 400 });
        }

        const db = deps.getDbInstance();
        if (!db) {
          return Response.json({ error: "Database not available." }, { status: 503 });
        }

        const order = await db.query.orders.findFirst({
          where: eq(orders.id, orderId),
        });

        if (!order) {
          return Response.json({ error: "Pedido no encontrado." }, { status: 404 });
        }

        const previousValues: Record<string, unknown> = {};
        for (const key of Object.keys(updates)) {
          previousValues[key] = (order as Record<string, unknown>)[key];
        }

        await db.transaction(async (tx) => {
          await tx
            .update(orders)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(orders.id, orderId));

          await tx.insert(orderAuditLogs).values({
            id: crypto.randomUUID(),
            orderId,
            adminId: session.user.id,
            action: "delivery_update",
            previousValue: previousValues,
            newValue: updates,
            createdAt: new Date(),
          });
        });

        return Response.json({ ok: true, data: { id: orderId, updates } });
      } catch (error) {
        deps.logError("admin_contact_update_failed", { error: getErrorMessage(error), orderId });
        return Response.json({ error: "No se pudo actualizar el contacto." }, { status: 500 });
      }
    },

    async addNote(request: Request, orderId: string) {
      const session = await deps.requireAdminSession();
      if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      try {
        const body = (await request.json()) as { note?: string };
        const note = typeof body.note === "string" ? body.note.trim() : "";

        if (!note) {
          return Response.json({ error: "Debés enviar una nota." }, { status: 400 });
        }

        const db = deps.getDbInstance();
        if (!db) {
          return Response.json({ error: "Database not available." }, { status: 503 });
        }

        const order = await db.query.orders.findFirst({
          where: eq(orders.id, orderId),
        });

        if (!order) {
          return Response.json({ error: "Pedido no encontrado." }, { status: 404 });
        }

        await db.insert(orderAuditLogs).values({
          id: crypto.randomUUID(),
          orderId,
          adminId: session.user.id,
          action: "note_added",
          previousValue: {},
          newValue: { note },
          createdAt: new Date(),
        });

        return Response.json({ ok: true, data: { id: orderId, note } });
      } catch (error) {
        deps.logError("admin_add_note_failed", { error: getErrorMessage(error), orderId });
        return Response.json({ error: "No se pudo agregar la nota." }, { status: 500 });
      }
    },
  };
}
