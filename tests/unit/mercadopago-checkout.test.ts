import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import { buildMercadoPagoPreferenceBody } from "../../lib/payments/mercadopago-preference";

const originalNextAuthUrl = process.env.NEXTAUTH_URL;
const originalMercadoPagoWebhookUrl = process.env.MERCADOPAGO_WEBHOOK_URL;

afterEach(() => {
  if (originalNextAuthUrl === undefined) {
    delete process.env.NEXTAUTH_URL;
  } else {
    process.env.NEXTAUTH_URL = originalNextAuthUrl;
  }

  if (originalMercadoPagoWebhookUrl === undefined) {
    delete process.env.MERCADOPAGO_WEBHOOK_URL;
  } else {
    process.env.MERCADOPAGO_WEBHOOK_URL = originalMercadoPagoWebhookUrl;
  }
});

test("builds Mercado Pago preference body with order items and fees", () => {
  process.env.NEXTAUTH_URL = "https://checkout.test";
  process.env.MERCADOPAGO_WEBHOOK_URL = "https://checkout.test/api/payments/mercadopago/webhook";

  const body = buildMercadoPagoPreferenceBody(
    {
      id: "order-1",
      reference: "TWR-2026-ABCD1234",
      checkoutMode: "guest",
      authProvider: "guest",
      customerAccountId: null,
      totalAmountArs: 69_100,
    },
    {
      customer: {
        name: "Gonzalo Pérez",
        phone: "+54 9 11 5555 5555",
        email: "gonza@correo.com",
        cuil: "20-12345678-3",
        checkoutMode: "guest",
        authProvider: "",
        preferredChannel: "whatsapp",
        customerStatus: "new",
        deliveryRecipient: "Gonzalo Pérez",
        fulfillment: "envio-caba-gba",
        location: "Palermo, CABA",
        notes: "Tocar timbre dos veces",
      },
      items: [
        {
          id: "sku-1::rojo::42",
          productId: "sku-1",
          productSlug: "zapatilla-1",
          productName: "Zapatilla 1",
          availability: "stock",
          availabilityLabel: "Stock",
          priceDisplay: "$ 20.000",
          quantity: 2,
          variantLabel: "Rojo",
          sizeLabel: "42",
        },
        {
          id: "sku-2::negro::m",
          productId: "sku-2",
          productSlug: "buzo-2",
          productName: "Buzo 2",
          availability: "encargue",
          availabilityLabel: "Encargue",
          priceDisplay: "$ 15.000",
          quantity: 1,
        },
      ],
    },
  );

  assert.equal(body.external_reference, "TWR-2026-ABCD1234");
  assert.equal(body.notification_url, "https://checkout.test/api/payments/mercadopago/webhook");
  assert.equal(body.payer?.email, "gonza@correo.com");
  assert.equal(body.payer?.name, "Gonzalo");
  assert.equal(body.payer?.surname, "Pérez");
  assert.equal(body.items.length, 4);
  assert.deepEqual(body.items.at(-2), {
    id: "shipping-envio-caba-gba",
    title: "Entrega puerta a puerta CABA/GBA",
    quantity: 1,
    unit_price: 6500,
    currency_id: "ARS",
  });
  assert.deepEqual(body.items.at(-1), {
    id: "correo-argentino-assist",
    title: "Gestión Correo Argentino",
    quantity: 1,
    unit_price: 7600,
    currency_id: "ARS",
  });
  assert.equal(
    body.back_urls.success,
    "https://checkout.test/checkout?payment=success&reference=TWR-2026-ABCD1234",
  );
});

test("omits optional Mercado Pago webhook when not configured", () => {
  process.env.NEXTAUTH_URL = "https://checkout.test";
  delete process.env.MERCADOPAGO_WEBHOOK_URL;

  const body = buildMercadoPagoPreferenceBody(
    {
      id: "order-2",
      reference: "TWR-2026-EFGH5678",
      checkoutMode: "account",
      authProvider: "credentials",
      customerAccountId: "customer-1",
      totalAmountArs: 26_500,
    },
    {
      customer: {
        name: "María López",
        phone: "+54 9 11 4444 4444",
        email: "maria@correo.com",
        cuil: "",
        checkoutMode: "account",
        authProvider: "credentials",
        preferredChannel: "email",
        customerStatus: "returning",
        deliveryRecipient: "María López",
        fulfillment: "envio-caba-gba",
        location: "Belgrano, CABA",
        notes: "",
      },
      items: [
        {
          id: "sku-3::blanco::m",
          productId: "sku-3",
          productSlug: "remera-3",
          productName: "Remera 3",
          availability: "stock",
          availabilityLabel: "Stock",
          priceDisplay: "$ 20.000",
          quantity: 1,
          variantLabel: "Blanco",
          sizeLabel: "M",
        },
      ],
    },
  );

  assert.equal(body.items.length, 2);
  assert.equal("notification_url" in body, false);
  assert.equal(body.metadata.orderReference, "TWR-2026-EFGH5678");
});
