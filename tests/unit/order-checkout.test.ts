import assert from "node:assert/strict";
import test from "node:test";

// Import from split modules - these will fail until we create checkout.shared.ts and checkout.server.ts
import {
  buildMissingCustomerProfilePatch,
  buildOrderPricingSummary,
  checkoutOrderPayloadSchema,
  normalizeOrderAuthProvider,
} from "../../lib/orders/checkout.shared";

import { buildOrderReference } from "../../lib/orders/checkout.server";

const validPayload = {
  customer: {
    name: "Gonzalo Pérez",
    phone: "+54 9 11 5555 5555",
    email: "Gonza@Correo.com",
    cuil: "20-12345678-3",
    checkoutMode: "guest" as const,
    authProvider: "" as const,
    preferredChannel: "whatsapp" as const,
    customerStatus: "new" as const,
    deliveryRecipient: "Gonzalo Pérez",
    fulfillment: "envio-caba-gba" as const,
    location: "Palermo, CABA",
    notes: "Tocar timbre dos veces",
  },
  items: [
    {
      id: "sku-1::rojo::42",
      productId: "sku-1",
      productSlug: "zapatilla-1",
      productName: "Zapatilla 1",
      availability: "stock" as const,
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
      availability: "encargue" as const,
      availabilityLabel: "Encargue",
      priceDisplay: "$ 15.000",
      quantity: 1,
    },
  ],
};

test("normalizes checkout payload and computes persisted pricing", () => {
  const payload = checkoutOrderPayloadSchema.parse(validPayload);
  const pricing = buildOrderPricingSummary(payload);

  assert.equal(payload.customer.email, "gonza@correo.com");
  assert.equal(pricing.subtotalAmountArs, 55_000);
  assert.equal(pricing.shippingAmountArs, 6_500);
  assert.equal(pricing.assistedFeeAmountArs, 7_600);
  assert.equal(pricing.totalAmountArs, 69_100);
  assert.equal(pricing.unitCount, 3);
});

test("uses guest auth provider for guest checkout even if authProvider is empty", () => {
  const payload = checkoutOrderPayloadSchema.parse(validPayload);

  assert.equal(normalizeOrderAuthProvider(payload), "guest");
});

test("builds order references with stable prefix", () => {
  const reference = buildOrderReference(new Date("2026-04-03T10:00:00.000Z"));

  assert.match(reference, /^TWR-2026-[A-F0-9]{8}$/);
});

test("fills only missing profile fields from authenticated checkout data", () => {
  const payload = checkoutOrderPayloadSchema.parse({
    ...validPayload,
    customer: {
      ...validPayload.customer,
      checkoutMode: "account",
      authProvider: "credentials",
      location: "Nicaragua 5400, Palermo, CABA",
    },
  });

  const patch = buildMissingCustomerProfilePatch(
    {
      name: "",
      phone: "",
      preferredChannel: "",
      cuil: "",
      shippingRecipient: "",
      shippingAddressLine1: "",
      shippingAddressLine2: "Piso 4 B",
      shippingCity: "",
      shippingProvince: "",
      shippingPostalCode: "",
      shippingDeliveryNotes: "",
    },
    payload.customer,
  );

  assert.equal(patch.name, payload.customer.name);
  assert.equal(patch.phone, payload.customer.phone);
  assert.equal(patch.preferredChannel, payload.customer.preferredChannel);
  assert.equal(patch.cuil, "20-12345678-3");
  assert.equal(patch.shippingRecipient, payload.customer.deliveryRecipient);
  assert.equal(patch.shippingAddressLine1, payload.customer.location);
  assert.equal(patch.shippingAddressLine2, "Piso 4 B");
  assert.equal(patch.shippingDeliveryNotes, payload.customer.notes);
});

test("preserves existing profile fields when checkout already has richer profile data", () => {
  const payload = checkoutOrderPayloadSchema.parse({
    ...validPayload,
    customer: {
      ...validPayload.customer,
      checkoutMode: "account",
      authProvider: "google",
      deliveryRecipient: "Nombre del checkout",
      location: "Referencia del checkout",
      notes: "Notas del checkout",
    },
  });

  const patch = buildMissingCustomerProfilePatch(
    {
      name: "Perfil Guardado",
      phone: "+54 9 11 4444 4444",
      preferredChannel: "instagram",
      cuil: "27-87654321-9",
      shippingRecipient: "Destinatario Guardado",
      shippingAddressLine1: "Dirección Guardada",
      shippingAddressLine2: "Depto Guardado",
      shippingCity: "CABA",
      shippingProvince: "Buenos Aires",
      shippingPostalCode: "C1414",
      shippingDeliveryNotes: "Notas guardadas",
    },
    payload.customer,
  );

  assert.equal(patch.name, "Perfil Guardado");
  assert.equal(patch.phone, "+54 9 11 4444 4444");
  assert.equal(patch.preferredChannel, "instagram");
  assert.equal(patch.cuil, "27-87654321-9");
  assert.equal(patch.shippingRecipient, "Destinatario Guardado");
  assert.equal(patch.shippingAddressLine1, "Dirección Guardada");
  assert.equal(patch.shippingDeliveryNotes, "Notas guardadas");
});
