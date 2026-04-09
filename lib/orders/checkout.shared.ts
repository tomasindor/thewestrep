import { z } from "zod";

import { CORREO_ARGENTINO_FEE } from "@/lib/cart/assisted-orders";
import type { CustomerProfileSnapshot } from "@/lib/auth/customer-profile";

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

export const checkoutOrderItemSchema = z.object({
  id: z.string().trim().min(1),
  productId: z.string().trim().min(1),
  productSlug: z.string().trim().min(1),
  productName: z.string().trim().min(1),
  productImage: orderImageSchema,
  availability: z.enum(["stock", "encargue"]),
  availabilityLabel: z.string().trim().min(1),
  priceDisplay: z.string().trim().min(1),
  quantity: z.number().int().min(1).max(99),
  variantLabel: z.string().trim().optional(),
  sizeLabel: z.string().trim().optional(),
});

export const checkoutOrderPayloadSchema = z.object({
  customer: checkoutOrderCustomerSchema,
  items: z.array(checkoutOrderItemSchema).min(1, "El pedido necesita al menos un producto."),
});

export type CheckoutOrderPayload = z.infer<typeof checkoutOrderPayloadSchema>;

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface OrderPricingSummary {
  assistedFeeAmountArs: number;
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
  const shippingAmountArs = getFulfillmentFeeAmount(payload.customer.fulfillment);
  const assistedFeeAmountArs = payload.items.some((item) => item.availability === "encargue")
    ? CORREO_ARGENTINO_FEE
    : 0;
  const unitCount = payload.items.reduce((total, item) => total + item.quantity, 0);

  return {
    subtotalAmountArs,
    shippingAmountArs,
    assistedFeeAmountArs,
    totalAmountArs: subtotalAmountArs + shippingAmountArs + assistedFeeAmountArs,
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