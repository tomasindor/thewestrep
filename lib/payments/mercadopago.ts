import "server-only";

import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

import { getMercadoPagoAccessToken, isMercadoPagoEnabled } from "@/lib/env";
import type { CheckoutOrderPayload } from "@/lib/orders/checkout.shared";
import { buildMercadoPagoPreferenceBody } from "@/lib/payments/mercadopago-preference";
import type { CreatedOrderSummary } from "@/lib/orders/repository";

export interface MercadoPagoCheckoutLink {
  checkoutUrl: string;
  externalReference: string;
  preferenceId: string;
  provider: "mercadopago";
  sandboxCheckoutUrl: string | null;
}

export async function createMercadoPagoCheckoutLink(
  order: CreatedOrderSummary,
  payload: CheckoutOrderPayload,
): Promise<MercadoPagoCheckoutLink | null> {
  if (!isMercadoPagoEnabled()) {
    return null;
  }

  const accessToken = getMercadoPagoAccessToken()!;

  const client = new MercadoPagoConfig({
    accessToken,
    options: { timeout: 5000 },
  });
  const preference = new Preference(client);
  const response = await preference.create({
    body: buildMercadoPagoPreferenceBody(order, payload),
  });

  if (!response.id || !response.init_point) {
    throw new Error("Mercado Pago no devolvió un checkout válido.");
  }

  return {
    provider: "mercadopago",
    preferenceId: response.id,
    externalReference: order.reference,
    checkoutUrl: response.init_point,
    sandboxCheckoutUrl: response.sandbox_init_point ?? null,
  };
}

export async function createMercadoPagoCheckoutLinkForOrder(order: {
  reference: string;
  totalAmountArs: number;
  contactName: string;
  contactEmail: string;
}): Promise<MercadoPagoCheckoutLink | null> {
  if (!isMercadoPagoEnabled()) {
    return null;
  }

  const accessToken = getMercadoPagoAccessToken()!;
  const client = new MercadoPagoConfig({
    accessToken,
    options: { timeout: 5000 },
  });
  const preference = new Preference(client);

  const nameParts = order.contactName.trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || undefined;
  const surname = nameParts.slice(1).join(" ") || undefined;

  const response = await preference.create({
    body: {
      external_reference: order.reference,
      items: [
        {
          id: `order-${order.reference}`,
          title: `Pedido ${order.reference}`,
          quantity: 1,
          unit_price: order.totalAmountArs,
          currency_id: "ARS",
        },
      ],
      payer: {
        email: order.contactEmail,
        name: firstName,
        surname,
      },
    },
  });

  if (!response.id || !response.init_point) {
    throw new Error("Mercado Pago no devolvió un checkout válido.");
  }

  return {
    provider: "mercadopago",
    preferenceId: response.id,
    externalReference: order.reference,
    checkoutUrl: response.init_point,
    sandboxCheckoutUrl: response.sandbox_init_point ?? null,
  };
}

export interface MercadoPagoPaymentLookup {
  externalReference: string | null;
  paymentId: string;
  status: string | null;
}

export async function getMercadoPagoPayment(paymentId: string): Promise<MercadoPagoPaymentLookup | null> {
  if (!isMercadoPagoEnabled()) {
    return null;
  }

  const accessToken = getMercadoPagoAccessToken()!;
  const client = new MercadoPagoConfig({
    accessToken,
    options: { timeout: 5000 },
  });

  const payment = new Payment(client);
  const response = await payment.get({
    id: paymentId,
  });

  const externalReference = (response as unknown as { external_reference?: string | null })
    .external_reference ?? null;
  const status = (response as unknown as { status?: string | null }).status ?? null;

  return { paymentId, externalReference, status };
}
