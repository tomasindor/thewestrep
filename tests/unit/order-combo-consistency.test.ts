import assert from "node:assert/strict";
import test from "node:test";

import { buildMercadoPagoPreferenceBody } from "../../lib/payments/mercadopago-preference";
import { checkoutOrderPayloadSchema, buildOrderPricingSummary } from "../../lib/orders/checkout.shared";
import { buildOrderItemRowsForPersistence } from "../../lib/orders/repository";
import { calculateComboPricing } from "../../lib/pricing/encargue-combos-core";

const comboPayload = checkoutOrderPayloadSchema.parse({
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
      id: "combo-top",
      productId: "product-top",
      productSlug: "buzo-combo",
      productName: "Buzo Combo",
      availability: "encargue",
      availabilityLabel: "Encargue",
      priceDisplay: "$ 50.000",
      quantity: 1,
      categorySlug: "buzos",
      comboGroup: "winter-2026",
    },
    {
      id: "combo-bottom",
      productId: "product-bottom",
      productSlug: "pantalon-combo",
      productName: "Pantalón Combo",
      availability: "encargue",
      availabilityLabel: "Encargue",
      priceDisplay: "$ 40.000",
      quantity: 1,
      categorySlug: "pantalones",
      comboGroup: "winter-2026",
    },
  ],
});

test("order item snapshots persist comboDiscount metadata with pair reference", () => {
  const pricing = buildOrderPricingSummary(comboPayload);
  const rows = buildOrderItemRowsForPersistence({
    payload: comboPayload,
    orderId: "order-1",
    pricing,
  });

  const discounted = rows.find((row) => row.productId === "product-bottom");
  assert.ok(discounted, "Expected discounted row for combo bottom item");
  assert.equal(discounted.itemSnapshot.comboDiscount?.amountArs, 12_000);
  assert.equal(discounted.itemSnapshot.comboDiscount?.pairedWithProductId, "product-top");
  assert.equal(discounted.itemSnapshot.comboDiscount?.pairedWithProductName, "Buzo Combo");
  assert.equal(discounted.lineTotalAmountArs, 28_000);
});

test("cart/checkout/mercadopago/order consumers keep identical combo math", () => {
  process.env.NEXTAUTH_URL = "https://checkout.test";
  delete process.env.MERCADOPAGO_WEBHOOK_URL;

  const engine = calculateComboPricing(comboPayload.items.map((item) => ({
    lineId: item.id,
    productId: item.productId,
    productSlug: item.productSlug,
    productName: item.productName,
    priceArs: Number(item.priceDisplay.replace(/[^\d]/g, "")),
    quantity: item.quantity,
    categorySlug: item.categorySlug,
    comboGroup: item.comboGroup,
  })));

  const checkoutPricing = buildOrderPricingSummary(comboPayload);
  const persistedRows = buildOrderItemRowsForPersistence({
    payload: comboPayload,
    orderId: "order-2",
    pricing: checkoutPricing,
  });
  const mpBody = buildMercadoPagoPreferenceBody(
    {
      id: "order-2",
      reference: "TWR-2026-COMBO999",
      checkoutMode: "guest",
      authProvider: "guest",
      customerAccountId: null,
      totalAmountArs: checkoutPricing.totalAmountArs,
    },
    comboPayload,
  );

  const expectedNetProducts = checkoutPricing.subtotalAmountArs - checkoutPricing.comboDiscountAmountArs;
  const orderNetProducts = persistedRows.reduce((sum, row) => sum + row.lineTotalAmountArs, 0);
  const mpNetProducts = mpBody.items
    .filter((row) => row.id !== "shipping-envio-caba-gba" && row.id !== "correo-argentino-assist")
    .reduce((sum, row) => sum + row.unit_price * row.quantity, 0);

  assert.equal(engine?.originalTotal, checkoutPricing.subtotalAmountArs);
  assert.equal(engine?.comboDiscount, checkoutPricing.comboDiscountAmountArs);
  assert.equal(orderNetProducts, expectedNetProducts);
  assert.equal(mpNetProducts, expectedNetProducts);
});
