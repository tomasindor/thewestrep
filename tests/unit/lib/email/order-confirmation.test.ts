import assert from "node:assert/strict";
import test from "node:test";

import {
  renderOrderConfirmationEmailTemplate,
  sendOrderConfirmationEmail,
} from "../../../../lib/email/resend";

test("renderOrderConfirmationEmailTemplate renders MP order with payment link", () => {
  const html = renderOrderConfirmationEmailTemplate({
    orderReference: "TWR-2026-TEST",
    items: [
      { name: "Zapatilla 1", quantity: 2, priceArs: 20_000 },
    ],
    totalArs: 46_500,
    paymentMethod: "mercadopago",
    nextSteps: "Completá el pago en Mercado Pago para confirmar tu pedido.",
    contactChannel: "whatsapp",
    mpCheckoutUrl: "https://mp.checkout/123",
  });

  assert.ok(html.includes("TWR-2026-TEST"), "should include order reference");
  assert.ok(html.includes("Zapatilla 1"), "should include item name");
  assert.ok(html.includes("46.500"), "should include total");
  assert.ok(html.includes("Mercado Pago"), "should mention payment method");
  assert.ok(html.includes("https://mp.checkout/123"), "should include MP link");
});

test("renderOrderConfirmationEmailTemplate renders WhatsApp order without link", () => {
  const html = renderOrderConfirmationEmailTemplate({
    orderReference: "TWR-2026-TEST",
    items: [
      { name: "Buzo 2", quantity: 1, priceArs: 15_000 },
    ],
    totalArs: 21_500,
    paymentMethod: "whatsapp",
    nextSteps: "Te contactaremos por WhatsApp para coordinar el pago.",
    contactChannel: "whatsapp",
  });

  assert.ok(html.includes("TWR-2026-TEST"), "should include order reference");
  assert.ok(html.includes("Buzo 2"), "should include item name");
  assert.ok(html.includes("WhatsApp"), "should mention payment method");
  assert.ok(html.includes("te contactaremos"), "should include next steps");
});

test("sendOrderConfirmationEmail does not throw when Resend is not configured", async () => {
  const originalKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;

  try {
    await assert.doesNotReject(async () => {
      await sendOrderConfirmationEmail(
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
        "mercadopago",
        null,
      );
    });
  } finally {
    if (originalKey !== undefined) {
      process.env.RESEND_API_KEY = originalKey;
    }
  }
});
