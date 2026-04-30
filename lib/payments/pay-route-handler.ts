import { buildWhatsappPaymentUrl } from "@/lib/address/georef";
import { getDb } from "@/lib/db/core";
import { orders } from "@/lib/db/schema";
import { createMercadoPagoCheckoutLinkForOrder } from "@/lib/payments/mercadopago";
import { eq } from "drizzle-orm";

interface MinimalOrder {
  id: string;
  reference: string;
  status: string;
  totalAmountArs: number;
  contactName: string;
  contactEmail: string;
}

interface PayRouteDeps {
  getOrderById: (id: string) => Promise<MinimalOrder | null>;
  createMercadoPagoCheckoutLinkForOrder: (order: Pick<MinimalOrder, "reference" | "totalAmountArs" | "contactName" | "contactEmail">) => Promise<{ checkoutUrl: string; externalReference: string; preferenceId: string; provider: string; sandboxCheckoutUrl: string | null } | null>;
  buildWhatsappPaymentUrl: (order: Pick<MinimalOrder, "reference" | "totalAmountArs">) => string;
}

async function defaultGetOrderById(id: string): Promise<MinimalOrder | null> {
  const db = getDb();
  if (!db) return null;
  const order = await db.query.orders.findFirst({ where: eq(orders.id, id) });
  if (!order) return null;
  return {
    id: order.id,
    reference: order.reference,
    status: order.status,
    totalAmountArs: order.totalAmountArs,
    contactName: order.contactName ?? "",
    contactEmail: order.contactEmail ?? "",
  };
}

export function createPayRouteHandler(overrides: Partial<PayRouteDeps> = {}) {
  const deps: PayRouteDeps = {
    getOrderById: defaultGetOrderById,
    createMercadoPagoCheckoutLinkForOrder,
    buildWhatsappPaymentUrl,
    ...overrides,
  };

  return async function handlePayRoute(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) {
    const { id } = await params;

    let body: { method?: string };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const method = body.method;
    if (method !== "mercadopago" && method !== "whatsapp") {
      return Response.json({ error: "Invalid payment method." }, { status: 400 });
    }

    const order = await deps.getOrderById(id);
    if (!order) {
      return Response.json({ error: "Order not found." }, { status: 404 });
    }

    if (order.status === "paid") {
      return Response.json({ error: "already_paid" }, { status: 409 });
    }

    if (method === "mercadopago") {
      try {
        const link = await deps.createMercadoPagoCheckoutLinkForOrder({
          reference: order.reference,
          totalAmountArs: order.totalAmountArs,
          contactName: order.contactName ?? "",
          contactEmail: order.contactEmail ?? "",
        });

        if (!link) {
          return Response.json({ error: "Mercado Pago no está disponible." }, { status: 503 });
        }

        return Response.json({ checkoutUrl: link.checkoutUrl });
      } catch {
        return Response.json({ error: "No pudimos iniciar Mercado Pago." }, { status: 500 });
      }
    }

    // whatsapp
    const whatsappUrl = deps.buildWhatsappPaymentUrl({
      reference: order.reference,
      totalAmountArs: order.totalAmountArs,
    });

    return Response.json({ whatsappUrl });
  };
}
