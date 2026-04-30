import { ZodError } from "zod";

import type { CustomerSessionIdentity } from "@/lib/auth/customer-accounts";
import { CustomerAuthConfigurationError } from "@/lib/auth/customer-accounts";
import { buildOrderWhatsappMessage } from "@/lib/cart/whatsapp";
import { sendOrderConfirmationEmail } from "@/lib/email/resend";
import { logger } from "@/lib/logger";
import {
  checkoutOrderPayloadSchema,
  checkoutOrderPayloadV2Schema,
  type CheckoutOrderPayload,
  type CheckoutOrderPayloadV2,
} from "@/lib/orders/checkout.shared";
import { isEmailVerificationRequiredForAccountCheckout } from "@/lib/orders/checkout-verification-gate";
import { createOrderFromCheckout, createOrderFromCheckoutV2 } from "@/lib/orders/repository";
import type { createOrderFromCheckoutV2 as CreateOrderFromCheckoutV2Type } from "@/lib/orders/repository";
import { siteConfig } from "@/lib/site";
import { applyRateLimit } from "@/lib/security/with-rate-limit";

interface OrdersRouteDeps {
  consumeRateLimit: (request: Request) => Promise<Response | null>;
  getCustomerSession: () => Promise<CustomerSession | null>;
  parsePayload: (request: Request) => Promise<CheckoutOrderPayload | CheckoutOrderPayloadV2>;
  createOrderFromCheckout: typeof createOrderFromCheckout;
  createOrderFromCheckoutV2: typeof CreateOrderFromCheckoutV2Type;
  createMercadoPagoCheckoutLink: (order: Awaited<ReturnType<typeof createOrderFromCheckout>>, payload: CheckoutOrderPayload) => Promise<unknown>;
  buildWhatsappUrl: (order: Awaited<ReturnType<typeof createOrderFromCheckout>>, payload: CheckoutOrderPayload) => string;
  logError: (event: string, context: Record<string, unknown>) => void;
  sendConfirmationEmail: (
    order: Awaited<ReturnType<typeof createOrderFromCheckout>>,
    payload: CheckoutOrderPayload,
    payment: unknown,
  ) => Promise<void>;
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
    parsePayload: async (request) => {
      const body = await request.json();
      if (body.customer?.provinceId !== undefined) {
        return checkoutOrderPayloadV2Schema.parse(body);
      }
      return checkoutOrderPayloadSchema.parse(body);
    },
    createOrderFromCheckout,
    createOrderFromCheckoutV2,
    createMercadoPagoCheckoutLink: async (order, payload) => {
      const paymentsModule = await import("@/lib/payments/mercadopago");
      return paymentsModule.createMercadoPagoCheckoutLink(order, payload);
    },
    buildWhatsappUrl: (order, payload) => {
      const message = buildOrderWhatsappMessage(
        {
          reference: order.reference,
          totalAmountArs: order.totalAmountArs,
          items: payload.items as Parameters<typeof buildOrderWhatsappMessage>[0]["items"],
        },
        payload.customer as Parameters<typeof buildOrderWhatsappMessage>[1],
      );
      return `${siteConfig.whatsappUrl}${encodeURIComponent(message)}`;
    },
    sendConfirmationEmail: async (order, payload, payment) => {
      const mpCheckoutUrl =
        payment && typeof payment === "object" && "checkoutUrl" in payment
          ? (payment.checkoutUrl as string | null)
          : null;
      await sendOrderConfirmationEmail(
        {
          id: order.id,
          reference: order.reference,
          checkoutMode: order.checkoutMode,
          authProvider: order.authProvider,
          customerAccountId: order.customerAccountId,
          totalAmountArs: order.totalAmountArs,
          paymentMethod: order.paymentMethod ?? "mercadopago",
          paymentStatus: order.paymentStatus,
        },
        payload as unknown as Parameters<typeof sendOrderConfirmationEmail>[1],
        order.paymentMethod ?? "mercadopago",
        mpCheckoutUrl,
      );
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

      // V2 branch: guest-only simplified checkout with province/city
      if ("provinceId" in payload.customer) {
        const v2Payload = payload as import("@/lib/orders/checkout.shared").CheckoutOrderPayloadV2;
        const order = await deps.createOrderFromCheckoutV2(v2Payload);
        return Response.json({ orderId: order.id, reference: order.reference }, { status: 201 });
      }

      const v1Payload = payload as CheckoutOrderPayload;

      if (v1Payload.customer.checkoutMode === "account" && !session?.user?.id) {
        return Response.json(
          { error: "Necesitás iniciar sesión para crear un pedido." },
          { status: 401 },
        );
      }

      if (isEmailVerificationRequiredForAccountCheckout({
        checkoutMode: v1Payload.customer.checkoutMode,
        emailVerified: session?.user?.emailVerified,
      })) {
        return Response.json(
          { error: "Necesitás verificar tu email antes de confirmar la compra con cuenta." },
          { status: 403 },
        );
      }

      const order = await deps.createOrderFromCheckout(v1Payload, getSessionIdentity(session));
      let payment = null;
      let paymentError: string | null = null;
      let whatsappUrl: string | null = null;

      if (v1Payload.paymentMethod === "whatsapp") {
        whatsappUrl = deps.buildWhatsappUrl(order, v1Payload);
      } else {
        try {
          payment = await deps.createMercadoPagoCheckoutLink(order, v1Payload);
        } catch {
          paymentError = "Guardamos tu pedido, pero no pudimos iniciar Mercado Pago ahora.";
        }
        whatsappUrl = deps.buildWhatsappUrl(order, v1Payload);
      }

      // Send confirmation email (non-blocking — failures don't roll back the order)
      deps.sendConfirmationEmail(order, v1Payload, payment).catch((err) => {
        deps.logError("order_email_confirmation_failed", {
          orderId: order.id,
          error: err instanceof Error ? err.message : String(err),
        });
      });

      return Response.json({ order, payment, paymentError, whatsappUrl }, { status: 201 });
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
