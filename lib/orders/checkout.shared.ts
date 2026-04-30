import { z } from "zod";

import { CORREO_ARGENTINO_FEE } from "@/lib/cart/assisted-orders";
import type { CustomerProfileSnapshot } from "@/lib/auth/customer-profile";
import { calculateComboPricing } from "@/lib/pricing/encargue-combos-core";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────────

const orderImageSchema = z
  .object({
    src: z.string().trim().min(1),
    alt: z.string().trim().default(""),
    provider: z.enum(["cloudinary", "local"]).optional(),
    assetKey: z.string().trim().optional(),
    cloudName: z.string().trim().optional(),
  })
  .optional();

/**
 * V2 Simplified Checkout Schema
 *
 * Removed: CUIL, checkoutMode, authProvider, customerStatus, fulfillment, location (old address)
 * Added: provinceId, provinceName, cityId, cityName (Georef), address (free text), recipient
 *
 * Two-step flow: Step 1 = create pending order. Step 2 = pay via MP or WhatsApp.
 */
export const checkoutOrderCustomerV2Schema = z.object({
  name: z.string().trim().min(2, "Nombre y apellido."),
  phone: z.string().trim().min(6, "Teléfono para coordinar."),
  email: z.string().trim().email("Email válido.").transform((v) => v.toLowerCase()),
  // Georef address fields
  provinceId: z.string().trim().min(1, "Seleccioná una provincia."),
  provinceName: z.string().trim().min(1),
  cityId: z.string().trim().min(1, "Seleccioná una ciudad."),
  cityName: z.string().trim().min(1),
  // Free text address (calle y número)
  address: z.string().trim().min(4, "Dirección de entrega."),
  // Who receives the package
  recipient: z.string().trim().min(2, "Quién recibe el pedido."),
  // Optional notes
  notes: z.string().trim().max(500).default(""),
});

export type CheckoutCustomerV2 = z.infer<typeof checkoutOrderCustomerV2Schema>;

export const checkoutOrderItemSchema = z.object({
  id: z.string().trim().min(1),
  productId: z.string().trim().min(1),
  productSlug: z.string().trim().min(1),
  productName: z.string().trim().min(1),
  productImage: orderImageSchema,
  availability: z.enum(["stock", "encargue"]),
  availabilityLabel: z.string().trim().min(1),
  categorySlug: z.string().trim().optional(),
  priceDisplay: z.string().trim().min(1),
  quantity: z.number().int().min(1).max(99),
  comboEligible: z.boolean().optional(),
  comboGroup: z.string().trim().optional(),
  comboPriority: z.number().int().optional(),
  comboSourceKey: z.string().trim().optional(),
  comboScore: z.number().min(0).max(1).optional(),
  comboDiscount: z
    .object({
      amountArs: z.number(),
      reason: z.string(),
      pairedWithProductId: z.string().trim().min(1),
      pairedWithProductName: z.string().optional(),
    })
    .optional(),
  variantLabel: z.string().trim().optional(),
  sizeLabel: z.string().trim().optional(),
});

export type CheckoutOrderItem = z.infer<typeof checkoutOrderItemSchema>;

export const checkoutOrderPayloadV2Schema = z.object({
  customer: checkoutOrderCustomerV2Schema,
  items: z.array(checkoutOrderItemSchema).min(1, "El pedido necesita al menos un producto."),
  totalAmountArs: z.number().int().min(0).optional(),
});

export type CheckoutOrderPayloadV2 = z.infer<typeof checkoutOrderPayloadV2Schema>;

// Legacy schema kept for backward compatibility during V1→V2 transition
export const checkoutOrderCustomerSchema = z.object({
  name: z.string().trim().min(2, "Decinos tu nombre y apellido."),
  phone: z.string().trim().min(6, "Sumá un teléfono para coordinar."),
  email: z.string().trim().email("Usá un email válido.").transform((value) => value.toLowerCase()),
  cuil: z.string().trim().max(40).default(""),
  checkoutMode: z.enum(["guest", "account"]),
  authProvider: z.enum(["", "credentials", "google"]),
  preferredChannel: z.enum(["", "whatsapp", "instagram", "email"]),
  customerStatus: z.enum(["", "new", "returning"]),
  deliveryRecipient: z.string().trim().max(160).default(""),
  fulfillment: z.enum(["envio-caba-gba", "envio-interior"]),
  location: z.string().trim().min(3, "Sumá una referencia de entrega."),
  notes: z.string().trim().max(500).default(""),
});

export const checkoutOrderPayloadSchema = z.object({
  customer: checkoutOrderCustomerSchema,
  items: z.array(checkoutOrderItemSchema).min(1, "El pedido necesita al menos un producto."),
  totalAmountArs: z.number().int().min(0).optional(),
  paymentMethod: z.enum(["mercadopago", "whatsapp"]).optional(),
});

export type CheckoutOrderPayload = z.infer<typeof checkoutOrderPayloadSchema>;

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface OrderPricingSummary {
  assistedFeeAmountArs: number;
  comboDiscountAmountArs: number;
  comboDiscountByLineId: Record<string, {
    amountArs: number;
    reason: string;
    pairedWithProductId?: string;
    pairedWithProductName?: string;
  }>;
  shippingAmountArs: number;
  subtotalAmountArs: number;
  totalAmountArs: number;
  unitCount: number;
}

export interface CheckoutProfileSnapshotLike {
  name: string;
  phone: string;
  preferredChannel: string;
  cuil: string;
  shippingRecipient: string;
  shippingAddressLine1: string;
  shippingAddressLine2: string;
  shippingCity: string;
  shippingProvince: string;
  shippingPostalCode: string;
  shippingDeliveryNotes: string;
}

// ─── Pure Helper Functions ─────────────────────────────────────────────────────

function normalizeCuil(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length !== 11) {
    return value.trim();
  }

  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

export function getPriceAmount(priceDisplay: string) {
  const normalizedValue = Number(priceDisplay.replace(/[^\d]/g, ""));

  return Number.isFinite(normalizedValue) ? normalizedValue : 0;
}

export function getFulfillmentFeeAmount(fulfillment: CheckoutOrderPayload["customer"]["fulfillment"]) {
  if (fulfillment === "envio-caba-gba") {
    return 6500;
  }

  return 12000;
}

export function buildOrderPricingSummary(payload: CheckoutOrderPayload): OrderPricingSummary {
  const subtotalAmountArs = payload.items.reduce(
    (total, item) => total + getPriceAmount(item.priceDisplay) * item.quantity,
    0,
  );
  const comboPricing = calculateComboPricing(
    payload.items.map((item) => ({
      lineId: item.id,
      productId: item.productId,
      productSlug: item.productSlug,
      productName: item.productName,
      priceArs: getPriceAmount(item.priceDisplay),
      quantity: item.quantity,
      comboGroup: item.comboGroup,
      comboPriority: item.comboPriority,
      categorySlug: item.categorySlug,
    })),
  );
  const comboDiscountAmountArs = comboPricing?.comboDiscount ?? 0;
  const comboDiscountByLineId = (comboPricing?.appliedDiscounts ?? []).reduce<OrderPricingSummary["comboDiscountByLineId"]>(
    (accumulator, entry) => {
      const current = accumulator[entry.lineId];
      accumulator[entry.lineId] = {
        amountArs: (current?.amountArs ?? 0) + entry.amountArs,
        reason: entry.reason,
        pairedWithProductId: entry.pairedWithProductId,
        pairedWithProductName: entry.pairedWithProductName,
      };
      return accumulator;
    },
    {},
  );
  const shippingAmountArs = getFulfillmentFeeAmount(payload.customer.fulfillment);
  const assistedFeeAmountArs = payload.items.some((item) => item.availability === "encargue")
    ? CORREO_ARGENTINO_FEE
    : 0;
  const unitCount = payload.items.reduce((total, item) => total + item.quantity, 0);

  return {
    subtotalAmountArs,
    comboDiscountAmountArs,
    comboDiscountByLineId,
    shippingAmountArs,
    assistedFeeAmountArs,
    totalAmountArs: subtotalAmountArs - comboDiscountAmountArs + shippingAmountArs + assistedFeeAmountArs,
    unitCount,
  };
}

export function buildOrderPricingSummaryV2(payload: CheckoutOrderPayloadV2): OrderPricingSummary {
  const subtotalAmountArs = payload.items.reduce(
    (total, item) => total + getPriceAmount(item.priceDisplay) * item.quantity,
    0,
  );
  const comboPricing = calculateComboPricing(
    payload.items.map((item) => ({
      lineId: item.id,
      productId: item.productId,
      productSlug: item.productSlug,
      productName: item.productName,
      priceArs: getPriceAmount(item.priceDisplay),
      quantity: item.quantity,
      comboGroup: item.comboGroup,
      comboPriority: item.comboPriority,
      categorySlug: item.categorySlug,
    })),
  );
  const comboDiscountAmountArs = comboPricing?.comboDiscount ?? 0;
  const comboDiscountByLineId = (comboPricing?.appliedDiscounts ?? []).reduce<OrderPricingSummary["comboDiscountByLineId"]>(
    (accumulator, entry) => {
      const current = accumulator[entry.lineId];
      accumulator[entry.lineId] = {
        amountArs: (current?.amountArs ?? 0) + entry.amountArs,
        reason: entry.reason,
        pairedWithProductId: entry.pairedWithProductId,
        pairedWithProductName: entry.pairedWithProductName,
      };
      return accumulator;
    },
    {},
  );
  const shippingAmountArs = 0;
  const assistedFeeAmountArs = payload.items.some((item) => item.availability === "encargue")
    ? CORREO_ARGENTINO_FEE
    : 0;
  const unitCount = payload.items.reduce((total, item) => total + item.quantity, 0);

  return {
    subtotalAmountArs,
    comboDiscountAmountArs,
    comboDiscountByLineId,
    shippingAmountArs,
    assistedFeeAmountArs,
    totalAmountArs: subtotalAmountArs - comboDiscountAmountArs + shippingAmountArs + assistedFeeAmountArs,
    unitCount,
  };
}

export function normalizeOrderAuthProvider(payload: CheckoutOrderPayload) {
  if (payload.customer.checkoutMode === "guest") {
    return "guest" as const;
  }

  return payload.customer.authProvider === "google" ? "google" : "credentials";
}

export function buildMissingCustomerProfilePatch(
  existingProfile: CheckoutProfileSnapshotLike,
  customer: CheckoutOrderPayload["customer"],
) {
  return {
    name: existingProfile.name.trim() || customer.name,
    phone: existingProfile.phone.trim() || customer.phone,
    preferredChannel: existingProfile.preferredChannel || customer.preferredChannel,
    cuil: existingProfile.cuil.trim() || normalizeCuil(customer.cuil),
    shippingRecipient: existingProfile.shippingRecipient.trim() || customer.deliveryRecipient.trim() || customer.name,
    shippingAddressLine1: existingProfile.shippingAddressLine1.trim() || customer.location,
    shippingAddressLine2: existingProfile.shippingAddressLine2,
    shippingCity: existingProfile.shippingCity,
    shippingProvince: existingProfile.shippingProvince,
    shippingPostalCode: existingProfile.shippingPostalCode,
    shippingDeliveryNotes: existingProfile.shippingDeliveryNotes.trim() || customer.notes,
  };
}

// ─── Fulfillment options (single source of truth for shipping fees) ───────────

export const fulfillmentOptions = [
  {
    value: "envio-caba-gba",
    label: "Entrega puerta a puerta en CABA/GBA",
    description: "Coordinamos entrega directa en tu zona.",
    fee: 6500,
  },
  {
    value: "envio-interior",
    label: "Entrega puerta a puerta al interior",
    description: "Despacho nacional con entrega en domicilio.",
    fee: 12000,
  },
] as const;

// ─── Utility functions migrated from checkout-experience.tsx ───────────────────

export function getSelectionCopy(variantLabel?: string, sizeLabel?: string) {
  return [variantLabel, sizeLabel].filter(Boolean).join(" · ");
}

export function getProductHref(availability: "stock" | "encargue", productSlug: string) {
  return `/${availability}/${productSlug}`;
}

export function getFulfillmentCopy(value: "" | "envio-caba-gba" | "envio-interior") {
  return fulfillmentOptions.find((option) => option.value === value);
}

export function getSavedShippingSummary(profile: CustomerProfileSnapshot | null) {
  if (!profile) {
    return "";
  }

  return [
    profile.shippingRecipient,
    profile.shippingAddressLine1,
    profile.shippingAddressLine2,
    [profile.shippingCity, profile.shippingProvince].filter(Boolean).join(", "),
    profile.shippingPostalCode,
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" · ");
}

export function getLocationLabel(value: "" | "envio-caba-gba" | "envio-interior") {
  if (value === "envio-caba-gba") {
    return "Dirección o barrio de entrega";
  }

  if (value === "envio-interior") {
    return "Ciudad, provincia y referencia de envío";
  }

  return "Zona, dirección o punto de entrega";
}

export function getCheckoutModeLabel(mode: "" | "guest" | "account", authProvider: "" | "credentials" | "google") {
  if (!mode) {
    return "Pendiente";
  }

  if (authProvider === "google") {
    return "Cuenta con Google";
  }

  if (authProvider === "credentials") {
    return "Cuenta con email";
  }

  return mode === "account" ? "Cuenta con email" : "Invitado";
}

export function getCheckoutModeConfirmation(mode: "" | "guest" | "account", authProvider: "" | "credentials" | "google") {
  if (!mode) {
    return "Primero resolvé el acceso desde /login para continuar con el checkout.";
  }

  if (authProvider === "google") {
    return "Seguís con Google conectado y los datos principales quedan precargados en este dispositivo para próximas compras.";
  }

  if (authProvider === "credentials") {
    return "Seguís con tu cuenta customer de email/password y el checkout queda listo para enlazarse con pedidos reales en el próximo slice.";
  }

  if (mode === "account") {
    return "Seguiste por email y dejamos el checkout preparado para enlazar la compra con una cuenta customer cuando el pedido persista en backend.";
  }

  return "Seguís por el camino guest-first, con el checkout abierto y sin bloquear la compra.";
}
