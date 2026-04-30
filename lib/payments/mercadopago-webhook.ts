import "server-only";

import { createHmac } from "node:crypto";

import { getDb } from "@/lib/db/core";
import { orders, orderAuditLogs } from "@/lib/db/schema";
import { getMercadoPagoPayment } from "@/lib/payments/mercadopago";
import { eq } from "drizzle-orm";

export function mapMercadoPagoPaymentStatus(
  mpStatus: string,
): "pending" | "awaiting_transfer" | "approved" | "rejected" | "expired" | "cancelled" {
  switch (mpStatus) {
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "cancelled":
      return "cancelled";
    case "expired":
      return "expired";
    case "pending":
    case "in_process":
    case "in_mediation":
    default:
      return "pending";
  }
}

export function verifyMercadoPagoSignature(
  params: {
    signatureHeader: string;
    requestIdHeader: string;
    dataId: string;
  },
  secret: string,
): boolean {
  if (!secret || !params.signatureHeader || !params.requestIdHeader || !params.dataId) {
    return false;
  }

  const parts = params.signatureHeader.split(",");
  const tsPart = parts.find((p) => p.startsWith("ts="));
  const v1Part = parts.find((p) => p.startsWith("v1="));

  if (!tsPart || !v1Part) {
    return false;
  }

  const ts = tsPart.slice(3).trim();
  const expectedHash = v1Part.slice(3).trim();
  const dataIdLower = params.dataId.trim().toLowerCase();
  const requestId = params.requestIdHeader.trim();

  const hash = createHmac("sha256", secret)
    .update(`id:${dataIdLower};request-id:${requestId};ts:${ts};`)
    .digest("hex");

  return hash === expectedHash;
}

export interface MercadoPagoWebhookPayload {
  action?: string;
  data?: {
    id?: string;
  };
  type?: string;
}

export interface ProcessWebhookDeps {
  verifySignature: (
    params: {
      signatureHeader: string;
      requestIdHeader: string;
      dataId: string;
    },
    secret: string,
  ) => boolean;
  getWebhookSecret: () => string | null;
  getDbInstance: () => ReturnType<typeof getDb>;
  mapStatus: (status: string) => ReturnType<typeof mapMercadoPagoPaymentStatus>;
  getPayment: (paymentId: string) => Promise<{ externalReference: string | null; status: string | null; paymentId: string } | null>;
}

export async function processMercadoPagoWebhook(
  payload: MercadoPagoWebhookPayload,
  request: {
    signatureHeader: string;
    requestIdHeader: string;
    dataId: string;
  },
  deps: ProcessWebhookDeps,
): Promise<{ success: boolean; status: number; message: string }> {
  const secret = deps.getWebhookSecret();

  if (!secret) {
    return { success: false, status: 500, message: "Webhook secret not configured." };
  }

  if (!deps.verifySignature(request, secret)) {
    return { success: false, status: 401, message: "Invalid signature." };
  }

  const paymentId = payload.data?.id ?? request.dataId;
  if (!paymentId) {
    return { success: false, status: 400, message: "Missing payment id." };
  }

  const payment = await deps.getPayment(paymentId);
  if (!payment) {
    return { success: false, status: 503, message: "Mercado Pago payment lookup unavailable." };
  }

  const externalReference = payment.externalReference;
  const paymentStatus = payment.status;

  if (!externalReference) {
    return { success: false, status: 400, message: "Missing external reference." };
  }

  const db = deps.getDbInstance();
  if (!db) {
    return { success: false, status: 503, message: "Database not available." };
  }

  const order = await db.query.orders.findFirst({
    where: eq(orders.reference, externalReference),
  });

  if (!order) {
    return { success: false, status: 404, message: "Order not found." };
  }

  const mappedStatus = paymentStatus
    ? deps.mapStatus(paymentStatus)
    : "pending";

  const previousPaymentStatus = order.paymentStatus;
  const previousOrderStatus = order.status;

  let newOrderStatus = previousOrderStatus;
  if (mappedStatus === "approved") {
    // V2 path: pending_payment → paid
    if (previousOrderStatus === "pending_payment") {
      newOrderStatus = "paid";
    }
    // V1 legacy path (runtime DB may contain old statuses not in collapsed type)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((previousOrderStatus as any) === "submitted") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      newOrderStatus = "confirmed" as any;
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({
        paymentStatus: mappedStatus,
        status: newOrderStatus,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    await tx.insert(orderAuditLogs).values({
      id: crypto.randomUUID(),
      orderId: order.id,
      adminId: "mercadopago_webhook",
      action: mappedStatus === "approved" ? "payment_approval" : "status_change",
      previousValue: {
        paymentStatus: previousPaymentStatus,
        orderStatus: previousOrderStatus,
      },
      newValue: {
        paymentStatus: mappedStatus,
        orderStatus: newOrderStatus,
      },
      createdAt: new Date(),
    });
  });

  return {
    success: true,
    status: 200,
    message: `Payment ${paymentId} processed. Order ${externalReference} updated to ${mappedStatus}.`,
  };
}

export const defaultProcessWebhookDeps: Pick<ProcessWebhookDeps, "getPayment"> = {
  getPayment: getMercadoPagoPayment,
};
