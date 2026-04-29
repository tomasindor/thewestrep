import { ZodError } from "zod";

import type { CustomerSessionIdentity } from "@/lib/auth/customer-accounts";
import { CustomerAuthConfigurationError } from "@/lib/auth/customer-accounts";
import { logger } from "@/lib/logger";
import { checkoutOrderPayloadSchema, type CheckoutOrderPayload } from "@/lib/orders/checkout.shared";
import { isEmailVerificationRequiredForAccountCheckout } from "@/lib/orders/checkout-verification-gate";
import { createOrderFromCheckout } from "@/lib/orders/repository";
import { applyRateLimit } from "@/lib/security/with-rate-limit";

interface OrdersRouteDeps {
  consumeRateLimit: (request: Request) => Promise<Response | null>;
  getCustomerSession: () => Promise<CustomerSession | null>;
  parsePayload: (request: Request) => Promise<CheckoutOrderPayload>;
  createOrderFromCheckout: typeof createOrderFromCheckout;
  createMercadoPagoCheckoutLink: (order: Awaited<ReturnType<typeof createOrderFromCheckout>>, payload: CheckoutOrderPayload) => Promise<unknown>;
  logError: (event: string, context: Record<string, unknown>) => void;
}

interface CustomerSession {
  user?: {
    id?: string;
    email?: string;
    name?: string | null;
    authProvider?: string | null;
    emailVerified?: string | null;
  };
}

function getSessionIdentity(session: CustomerSession | null): CustomerSessionIdentity | null {
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

export function createOrdersRouteHandler(overrides: Partial<OrdersRouteDeps> = {}) {
  const deps: OrdersRouteDeps = {
    consumeRateLimit: (request) => applyRateLimit(request, "orders", { maxRequests: 5, windowMs: 10 * 60 * 1000 }),
    getCustomerSession: async () => {
      const authModule = await import("@/lib/auth/session");
      return authModule.getCustomerSession();
    },
    parsePayload: async (request) => checkoutOrderPayloadSchema.parse(await request.json()),
    createOrderFromCheckout,
    createMercadoPagoCheckoutLink: async (order, payload) => {
      const paymentsModule = await import("@/lib/payments/mercadopago");
      return paymentsModule.createMercadoPagoCheckoutLink(order, payload);
    },
    logError: logger.error,
    ...overrides,
  };

  return async function handleOrdersRoute(request: Request) {
    const rateLimit = await deps.consumeRateLimit(request);
    if (rateLimit) return rateLimit;

    const session = await deps.getCustomerSession();

    try {
      const payload = await deps.parsePayload(request);

      if (payload.customer.checkoutMode === "account" && !session?.user?.id) {
        return Response.json(
          { error: "Necesitás iniciar sesión para crear un pedido." },
          { status: 401 },
        );
      }

      if (isEmailVerificationRequiredForAccountCheckout({
        checkoutMode: payload.customer.checkoutMode,
        emailVerified: session?.user?.emailVerified,
      })) {
        return Response.json(
          { error: "Necesitás verificar tu email antes de confirmar la compra con cuenta." },
          { status: 403 },
        );
      }

      const order = await deps.createOrderFromCheckout(payload, getSessionIdentity(session));
      let payment = null;
      let paymentError: string | null = null;

      try {
        payment = await deps.createMercadoPagoCheckoutLink(order, payload);
      } catch {
        paymentError = "Guardamos tu pedido, pero no pudimos iniciar Mercado Pago ahora.";
      }

      return Response.json({ order, payment, paymentError }, { status: 201 });
    } catch (error) {
      if (error instanceof CustomerAuthConfigurationError) {
        return Response.json({ error: error.message }, { status: 503 });
      }

      if (error instanceof ZodError) {
        return Response.json({ error: error.issues[0]?.message ?? "Revisá los datos del pedido." }, { status: 400 });
      }

      deps.logError("order_creation_failed", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return Response.json({ error: "No pudimos guardar el pedido ahora." }, { status: 500 });
    }
  };
}
