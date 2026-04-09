import { ZodError } from "zod";

import type { CustomerSessionIdentity } from "@/lib/auth/customer-accounts";
import { CustomerAuthConfigurationError } from "@/lib/auth/customer-accounts";
import { checkoutOrderPayloadSchema } from "@/lib/orders/checkout.shared";
import { getCustomerSession } from "@/lib/auth/session";
import { createOrderFromCheckout } from "@/lib/orders/repository";
import { createMercadoPagoCheckoutLink } from "@/lib/payments/mercadopago";
import { applyRateLimit } from "@/lib/security/with-rate-limit";
import { logger } from "@/lib/logger";

function getSessionIdentity(session: Awaited<ReturnType<typeof getCustomerSession>>): CustomerSessionIdentity | null {
  if (!session?.user?.id || !session.user.email) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? "",
    role: "customer",
    authProvider: session.user.authProvider === "google" ? "google" : "credentials",
  };
}

export async function POST(request: Request) {
  const rateLimit = applyRateLimit(request, "orders", { maxRequests: 5, windowMs: 10 * 60 * 1000 });
  if (rateLimit) return rateLimit;

  const session = await getCustomerSession();

  try {
    const payload = checkoutOrderPayloadSchema.parse(await request.json());

    if (payload.customer.checkoutMode === "account" && !session?.user?.id) {
      return Response.json(
        { error: "Necesitás iniciar sesión para crear un pedido." },
        { status: 401 },
      );
    }

    const order = await createOrderFromCheckout(payload, getSessionIdentity(session));
    let payment = null;
    let paymentError: string | null = null;

    try {
      payment = await createMercadoPagoCheckoutLink(order, payload);
    } catch {
      paymentError = "Guardamos tu pedido, pero no pudimos iniciar Mercado Pago ahora.";
    }

    return Response.json(
      {
        order,
        payment,
        paymentError,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof CustomerAuthConfigurationError) {
      return Response.json({ error: error.message }, { status: 503 });
    }

    if (error instanceof ZodError) {
      return Response.json({ error: error.issues[0]?.message ?? "Revisá los datos del pedido." }, { status: 400 });
    }

    logger.error("order_creation_failed", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });

    return Response.json({ error: "No pudimos guardar el pedido ahora." }, { status: 500 });
  }
}
