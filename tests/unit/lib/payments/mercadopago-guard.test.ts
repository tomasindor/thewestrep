import assert from "node:assert/strict";
import test, { afterEach, mock } from "node:test";

import { createMercadoPagoCheckoutLink } from "../../../../lib/payments/mercadopago";

const originalEnv = process.env.MERCADOPAGO_ACCESS_TOKEN;

afterEach(() => {
  if (originalEnv === undefined) {
    delete process.env.MERCADOPAGO_ACCESS_TOKEN;
  } else {
    process.env.MERCADOPAGO_ACCESS_TOKEN = originalEnv;
  }
  mock.restoreAll();
});

test("createMercadoPagoCheckoutLink returns null when MP is not enabled", async () => {
  delete process.env.MERCADOPAGO_ACCESS_TOKEN;

  const result = await createMercadoPagoCheckoutLink(
    {
      id: "order-1",
      reference: "TWR-2026-TEST",
      checkoutMode: "guest",
      authProvider: "guest",
      customerAccountId: null,
      totalAmountArs: 26_500,
      paymentMethod: "mercadopago",
      paymentStatus: "pending",
    },
    {
      customer: {
        name: "Gonzalo Pérez",
        phone: "+54 9 11 5555 5555",
        email: "gonza@correo.com",
        cuil: "",
        checkoutMode: "guest",
        authProvider: "",
        preferredChannel: "whatsapp",
        customerStatus: "new",
        deliveryRecipient: "Gonzalo Pérez",
        fulfillment: "envio-caba-gba",
        location: "Palermo, CABA",
        notes: "",
      },
      items: [
        {
          id: "sku-1",
          productId: "sku-1",
          productSlug: "zapatilla-1",
          productName: "Zapatilla 1",
          availability: "stock",
          availabilityLabel: "Stock",
          priceDisplay: "$ 20.000",
          quantity: 1,
        },
      ],
    },
  );

  assert.equal(result, null);
});

test("createMercadoPagoCheckoutLink does not throw when MP is not enabled", async () => {
  delete process.env.MERCADOPAGO_ACCESS_TOKEN;

  await assert.doesNotReject(async () => {
    await createMercadoPagoCheckoutLink(
      {
        id: "order-1",
        reference: "TWR-2026-TEST",
        checkoutMode: "guest",
        authProvider: "guest",
        customerAccountId: null,
        totalAmountArs: 26_500,
        paymentMethod: "mercadopago",
        paymentStatus: "pending",
      },
      {
        customer: {
          name: "Gonzalo Pérez",
          phone: "+54 9 11 5555 5555",
          email: "gonza@correo.com",
          cuil: "",
          checkoutMode: "guest",
          authProvider: "",
          preferredChannel: "whatsapp",
          customerStatus: "new",
          deliveryRecipient: "Gonzalo Pérez",
          fulfillment: "envio-caba-gba",
          location: "Palermo, CABA",
          notes: "",
        },
        items: [
          {
            id: "sku-1",
            productId: "sku-1",
            productSlug: "zapatilla-1",
            productName: "Zapatilla 1",
            availability: "stock",
            availabilityLabel: "Stock",
            priceDisplay: "$ 20.000",
            quantity: 1,
          },
        ],
      },
    );
  });
});
