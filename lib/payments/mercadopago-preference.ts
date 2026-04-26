import { getAppUrl, getMercadoPagoWebhookUrl } from "@/lib/env/shared";
import {
  buildOrderPricingSummary,
  getPriceAmount,
  type CheckoutOrderPayload,
} from "@/lib/orders/checkout.shared";
import type { CreatedOrderSummary } from "@/lib/orders/repository";

function splitCustomerName(name: string) {
  const [firstName = "", ...rest] = name.trim().split(/\s+/).filter(Boolean);

  return {
    name: firstName,
    surname: rest.join(" "),
  };
}

function buildPreferenceItemTitle(item: CheckoutOrderPayload["items"][number]) {
  return [item.productName, item.variantLabel, item.sizeLabel].filter(Boolean).join(" · ");
}

export function buildMercadoPagoPreferenceBody(order: CreatedOrderSummary, payload: CheckoutOrderPayload) {
  const pricing = buildOrderPricingSummary(payload);
  const appUrl = getAppUrl();
  const buyerName = splitCustomerName(payload.customer.name);
  const webhookUrl = getMercadoPagoWebhookUrl();

  return {
    auto_return: "approved",
    back_urls: {
      success: `${appUrl}/checkout?payment=success&reference=${encodeURIComponent(order.reference)}`,
      failure: `${appUrl}/checkout?payment=failure&reference=${encodeURIComponent(order.reference)}`,
      pending: `${appUrl}/checkout?payment=pending&reference=${encodeURIComponent(order.reference)}`,
    },
    external_reference: order.reference,
    items: [
      ...payload.items.map((item) => ({
        id: item.id,
        title: buildPreferenceItemTitle(item),
        quantity: item.quantity,
        unit_price: getPriceAmount(item.priceDisplay),
        currency_id: "ARS",
      })),
      ...(pricing.shippingAmountArs > 0
        ? [
            {
              id: `shipping-${payload.customer.fulfillment}`,
              title: payload.customer.fulfillment === "envio-caba-gba" ? "Entrega puerta a puerta CABA/GBA" : "Entrega puerta a puerta interior",
              quantity: 1,
              unit_price: pricing.shippingAmountArs,
              currency_id: "ARS",
            },
          ]
        : []),
      ...(pricing.assistedFeeAmountArs > 0
        ? [
            {
              id: "correo-argentino-assist",
              title: "Gestión Correo Argentino",
              quantity: 1,
              unit_price: pricing.assistedFeeAmountArs,
              currency_id: "ARS",
            },
          ]
        : []),
      ...(pricing.comboDiscountAmountArs > 0
        ? [
            {
              id: "combo-discount",
              title: "Descuento combo",
              quantity: 1,
              unit_price: -pricing.comboDiscountAmountArs,
              currency_id: "ARS",
            },
          ]
        : []),
    ],
    metadata: {
      checkoutMode: order.checkoutMode,
      orderId: order.id,
      orderReference: order.reference,
    },
    ...(webhookUrl ? { notification_url: webhookUrl } : {}),
    payer: {
      email: payload.customer.email,
      name: buyerName.name || undefined,
      surname: buyerName.surname || undefined,
    },
  };
}
