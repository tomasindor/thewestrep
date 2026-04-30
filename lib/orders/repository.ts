import "server-only";

import { randomUUID } from "node:crypto";

import { desc, eq } from "drizzle-orm";

import type { CustomerSessionIdentity } from "@/lib/auth/customer-accounts";
import { CustomerAuthConfigurationError } from "@/lib/auth/customer-accounts";
import { getDb } from "@/lib/db/core";
import { customerAccounts, orderItems, orders } from "@/lib/db/schema";
import type { OrderHistoryEntrySnapshot } from "@/lib/orders/history";
import {
  buildMissingCustomerProfilePatch,
  buildOrderPricingSummary,
  buildOrderPricingSummaryV2,
  getPriceAmount,
  normalizeOrderAuthProvider,
  type CheckoutOrderItem,
  type CheckoutOrderPayload,
  type CheckoutOrderPayloadV2,
} from "@/lib/orders/checkout.shared";
import { buildOrderReference, resolveInitialPaymentStatus } from "@/lib/orders/checkout.server";

export interface CreatedOrderSummary {
  authProvider: "guest" | "credentials" | "google";
  checkoutMode: "guest" | "account";
  customerAccountId: string | null;
  id: string;
  reference: string;
  totalAmountArs: number;
  paymentMethod: "mercadopago" | "whatsapp" | null;
  paymentStatus: "pending" | "awaiting_transfer" | "approved" | "rejected" | "expired" | "cancelled";
}

export interface CreatedOrderSummaryV2 {
  id: string;
  reference: string;
  totalAmountArs: number;
  status: "pending_payment" | "paid";
}

export interface PersistedOrderItemRow {
  id: string;
  orderId: string;
  productId: string;
  productSlug: string;
  productName: string;
  productImageUrl?: string;
  productImageAlt: string;
  availability: "stock" | "encargue";
  availabilityLabel: string;
  unitPriceAmountArs: number;
  quantity: number;
  variantLabel?: string;
  sizeLabel?: string;
  lineTotalAmountArs: number;
  itemSnapshot: {
    productId: string;
    productSlug: string;
    productName: string;
    availability: "stock" | "encargue";
    availabilityLabel: string;
    quantity: number;
    unitPriceAmountArs: number;
    lineTotalAmountArs: number;
    comboDiscount?: {
      amountArs: number;
      reason: string;
      pairedWithProductId?: string;
      pairedWithProductName?: string;
    };
    variantLabel?: string;
    sizeLabel?: string;
    productImage?: {
      src: string;
      alt: string;
      provider?: "cloudinary" | "local";
      assetKey?: string;
      cloudName?: string;
    };
  };
}

function requireDb() {
  const db = getDb();

  if (!db) {
    throw new CustomerAuthConfigurationError("La base de datos no está configurada para guardar pedidos.");
  }

  return db;
}

async function getUniqueOrderReference() {
  const db = requireDb();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const reference = buildOrderReference();
    const existingOrder = await db.query.orders.findFirst({
      where: eq(orders.reference, reference),
    });

    if (!existingOrder) {
      return reference;
    }
  }

  return `${buildOrderReference()}-${randomUUID().slice(0, 4).toUpperCase()}`;
}

export async function getOrderByReference(reference: string) {
  const db = requireDb();
  return db.query.orders.findFirst({
    where: eq(orders.reference, reference),
  });
}

export async function getCustomerOrderHistory(customerId: string): Promise<OrderHistoryEntrySnapshot[]> {
  const db = requireDb();
  const customerOrders = await db.query.orders.findMany({
    where: eq(orders.customerAccountId, customerId),
    orderBy: [desc(orders.createdAt)],
    with: {
      items: {
        columns: {
          id: true,
          productName: true,
          quantity: true,
          availabilityLabel: true,
          variantLabel: true,
          sizeLabel: true,
        },
      },
    },
  });

  return customerOrders.map((order) => ({
    id: order.id,
    reference: order.reference,
    createdAtIso: order.createdAt.toISOString(),
    status: order.status,
    totalAmountArs: order.totalAmountArs,
    currencyCode: order.currencyCode,
    lineItemCount: order.lineItemCount,
    unitCount: order.unitCount,
    containsEncargueItems: order.containsEncargueItems,
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      quantity: item.quantity,
      availabilityLabel: item.availabilityLabel,
      variantLabel: item.variantLabel,
      sizeLabel: item.sizeLabel,
    })),
  }));
}

function getCustomerAccountLink(
  payload: CheckoutOrderPayload,
  sessionIdentity: CustomerSessionIdentity | null,
): CreatedOrderSummary["customerAccountId"] {
  if (payload.customer.checkoutMode !== "account") {
    return null;
  }

  return sessionIdentity?.id ?? null;
}

export function buildOrderItemRowsForPersistence(input: {
  payload: { items: CheckoutOrderItem[] };
  orderId: string;
  pricing: ReturnType<typeof buildOrderPricingSummary>;
  idFactory?: () => string;
}): PersistedOrderItemRow[] {
  return input.payload.items.map((item) => {
    const unitPriceAmountArs = getPriceAmount(item.priceDisplay);
    const lineSubtotalAmountArs = unitPriceAmountArs * item.quantity;
    const comboDiscount = input.pricing.comboDiscountByLineId[item.id];
    const lineDiscountAmountArs = comboDiscount?.amountArs ?? 0;
    const lineTotalAmountArs = Math.max(0, lineSubtotalAmountArs - lineDiscountAmountArs);

    return {
      id: input.idFactory ? input.idFactory() : randomUUID(),
      orderId: input.orderId,
      productId: item.productId,
      productSlug: item.productSlug,
      productName: item.productName,
      productImageUrl: item.productImage?.src,
      productImageAlt: item.productImage?.alt ?? "",
      availability: item.availability,
      availabilityLabel: item.availabilityLabel,
      unitPriceAmountArs,
      quantity: item.quantity,
      variantLabel: item.variantLabel,
      sizeLabel: item.sizeLabel,
      lineTotalAmountArs,
      itemSnapshot: {
        productId: item.productId,
        productSlug: item.productSlug,
        productName: item.productName,
        availability: item.availability,
        availabilityLabel: item.availabilityLabel,
        quantity: item.quantity,
        unitPriceAmountArs,
        lineTotalAmountArs,
        comboDiscount: comboDiscount
          ? {
              amountArs: comboDiscount.amountArs,
              reason: comboDiscount.reason,
              pairedWithProductId: comboDiscount.pairedWithProductId,
              pairedWithProductName: comboDiscount.pairedWithProductName,
            }
          : undefined,
        variantLabel: item.variantLabel,
        sizeLabel: item.sizeLabel,
        productImage: item.productImage,
      },
    };
  });
}

async function syncMissingCustomerProfileFieldsFromCheckout(
  txOrDb: {
    select: ReturnType<typeof requireDb>["select"];
    update: ReturnType<typeof requireDb>["update"];
  },
  payload: CheckoutOrderPayload,
  customerAccountId: string | null,
) {
  if (!customerAccountId) {
    return;
  }

  const [existingAccount] = await txOrDb.select().from(customerAccounts).where(eq(customerAccounts.id, customerAccountId)).limit(1);

  if (!existingAccount) {
    return;
  }

  const patch = buildMissingCustomerProfilePatch(existingAccount, payload.customer);

  const hasChanges =
    patch.name !== existingAccount.name ||
    patch.phone !== existingAccount.phone ||
    patch.preferredChannel !== existingAccount.preferredChannel ||
    patch.cuil !== existingAccount.cuil ||
    patch.shippingRecipient !== existingAccount.shippingRecipient ||
    patch.shippingAddressLine1 !== existingAccount.shippingAddressLine1 ||
    patch.shippingDeliveryNotes !== existingAccount.shippingDeliveryNotes;

  if (!hasChanges) {
    return;
  }

  await txOrDb
    .update(customerAccounts)
    .set({
      ...patch,
      updatedAt: new Date(),
    })
    .where(eq(customerAccounts.id, customerAccountId));
}

export async function createOrderFromCheckout(
  payload: CheckoutOrderPayload,
  sessionIdentity: CustomerSessionIdentity | null,
): Promise<CreatedOrderSummary> {
  const db = requireDb();
  const pricing = buildOrderPricingSummary(payload);
  const orderId = randomUUID();
  const reference = await getUniqueOrderReference();
  const authProvider = normalizeOrderAuthProvider(payload);
  const customerAccountId = getCustomerAccountLink(payload, sessionIdentity);
  const paymentMethod = payload.paymentMethod ?? null;
  const paymentStatus = resolveInitialPaymentStatus(payload.paymentMethod);

  // Note: Neon HTTP driver doesn't support transactions.
  // Inserts run sequentially — order items and profile sync won't rollback if the other fails.
  await db.insert(orders).values({
    id: orderId,
    reference,
    customerAccountId,
    checkoutMode: payload.customer.checkoutMode,
    authProvider,
    status: "pending_payment",
    paymentStatus,
    paymentMethod,
    currencyCode: "ARS",
    subtotalAmountArs: pricing.subtotalAmountArs,
    shippingAmountArs: pricing.shippingAmountArs,
    assistedFeeAmountArs: pricing.assistedFeeAmountArs,
    totalAmountArs: pricing.totalAmountArs,
    lineItemCount: payload.items.length,
    unitCount: pricing.unitCount,
    containsEncargueItems: payload.items.some((item) => item.availability === "encargue"),
    contactName: payload.customer.name,
    contactEmail: payload.customer.email,
    contactPhone: payload.customer.phone,
    contactCuil: payload.customer.cuil,
    preferredChannel: payload.customer.preferredChannel,
    customerStatus: payload.customer.customerStatus,
    deliveryRecipient: payload.customer.deliveryRecipient,
    fulfillment: payload.customer.fulfillment,
    location: payload.customer.location,
    provinceId: "",
    provinceName: "",
    cityId: "",
    cityName: "",
    notes: payload.customer.notes,
    customerSnapshot: {
      account:
        customerAccountId && sessionIdentity
          ? {
              id: sessionIdentity.id,
              email: sessionIdentity.email,
              name: sessionIdentity.name,
              authProvider: sessionIdentity.authProvider,
            }
          : null,
      buyer: {
        name: payload.customer.name,
        email: payload.customer.email,
        phone: payload.customer.phone,
        cuil: payload.customer.cuil,
        preferredChannel: payload.customer.preferredChannel,
        customerStatus: payload.customer.customerStatus,
      },
      delivery: {
        recipient: payload.customer.deliveryRecipient,
        fulfillment: payload.customer.fulfillment,
        location: payload.customer.location,
        notes: payload.customer.notes,
      },
    },
    pricingSnapshot: {
      currencyCode: "ARS",
      subtotalAmountArs: pricing.subtotalAmountArs,
      comboDiscountAmountArs: pricing.comboDiscountAmountArs,
      shippingAmountArs: pricing.shippingAmountArs,
      assistedFeeAmountArs: pricing.assistedFeeAmountArs,
      totalAmountArs: pricing.totalAmountArs,
    },
    updatedAt: new Date(),
  });

  await db.insert(orderItems).values(buildOrderItemRowsForPersistence({ payload, orderId, pricing }));

  await syncMissingCustomerProfileFieldsFromCheckout(db, payload, customerAccountId);

  return {
    id: orderId,
    reference,
    checkoutMode: payload.customer.checkoutMode,
    authProvider,
    customerAccountId,
    totalAmountArs: pricing.totalAmountArs,
    paymentMethod,
    paymentStatus,
  };
}

export async function createOrderFromCheckoutV2(
  payload: CheckoutOrderPayloadV2,
  overrides?: {
    db?: ReturnType<typeof requireDb>;
    idFactory?: () => string;
    referenceFactory?: () => string;
  },
): Promise<CreatedOrderSummaryV2> {
  const db = overrides?.db ?? requireDb();
  const pricing = buildOrderPricingSummaryV2(payload);
  const orderId = overrides?.idFactory ? overrides.idFactory() : randomUUID();
  const reference = overrides?.referenceFactory ? overrides.referenceFactory() : await getUniqueOrderReference();

  await db.insert(orders).values({
    id: orderId,
    reference,
    customerAccountId: null,
    checkoutMode: "guest",
    authProvider: "guest",
    status: "pending_payment",
    paymentStatus: "pending",
    currencyCode: "ARS",
    subtotalAmountArs: pricing.subtotalAmountArs,
    shippingAmountArs: pricing.shippingAmountArs,
    assistedFeeAmountArs: pricing.assistedFeeAmountArs,
    totalAmountArs: pricing.totalAmountArs,
    lineItemCount: payload.items.length,
    unitCount: pricing.unitCount,
    containsEncargueItems: payload.items.some((item) => item.availability === "encargue"),
    contactName: payload.customer.name,
    contactEmail: payload.customer.email,
    contactPhone: payload.customer.phone,
    contactCuil: "",
    preferredChannel: "",
    customerStatus: "",
    deliveryRecipient: payload.customer.recipient,
    fulfillment: "envio-interior",
    location: payload.customer.address,
    provinceId: payload.customer.provinceId,
    provinceName: payload.customer.provinceName,
    cityId: payload.customer.cityId,
    cityName: payload.customer.cityName,
    notes: payload.customer.notes,
    customerSnapshot: {
      account: null,
      buyer: {
        name: payload.customer.name,
        email: payload.customer.email,
        phone: payload.customer.phone,
        cuil: "",
        preferredChannel: "",
        customerStatus: "",
      },
      delivery: {
        recipient: payload.customer.recipient,
        fulfillment: "envio-interior",
        location: payload.customer.address,
        notes: payload.customer.notes,
      },
    },
    pricingSnapshot: {
      currencyCode: "ARS",
      subtotalAmountArs: pricing.subtotalAmountArs,
      comboDiscountAmountArs: pricing.comboDiscountAmountArs,
      shippingAmountArs: pricing.shippingAmountArs,
      assistedFeeAmountArs: pricing.assistedFeeAmountArs,
      totalAmountArs: pricing.totalAmountArs,
    },
    updatedAt: new Date(),
  });

  await db.insert(orderItems).values(buildOrderItemRowsForPersistence({ payload, orderId, pricing }));

  return {
    id: orderId,
    reference,
    totalAmountArs: pricing.totalAmountArs,
    status: "pending_payment",
  };
}
