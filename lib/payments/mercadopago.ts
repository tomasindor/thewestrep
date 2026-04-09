import "server-only";

import { MercadoPagoConfig, Preference } from "mercadopago";

import { getMercadoPagoAccessToken } from "@/lib/env";
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
  const accessToken = getMercadoPagoAccessToken();

  if (!accessToken) {
    return null;
  }

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
