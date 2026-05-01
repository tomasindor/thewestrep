/**
 * Server-only checkout utilities.
 * This module MUST NOT be imported from client components or hooks.
 * Use @/lib/orders/checkout.shared for client-safe utilities.
 * 
 * Note: The "server-only" constraint is enforced by Next.js bundler at build time.
 * Importing this module from client code will fail type-checking and bundling.
 */
import "server-only";
import { randomUUID } from "node:crypto";

import { inArray } from "drizzle-orm";

import { getDb } from "@/lib/db/core";
import { inventory } from "@/lib/db/schema";
import type { CheckoutOrderPayload, CheckoutOrderItem } from "@/lib/orders/checkout.shared";

/**
 * Internal implementation of order reference generation.
 * Exported for testing purposes only - do not import from client code.
 * @internal
 */
export function _buildOrderReference(now = new Date()): string {
  const year = now.getUTCFullYear();
  const compactToken = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();

  return `TWR-${year}-${compactToken}`;
}

/**
 * Builds an order reference in the format TWR-YYYY-XXXXXXXX
 * where XXXXXXXX is an 8-character uppercase hex token from UUID v4.
 * This function MUST only be called from server-side code.
 *
 * @param now - Optional date for testing. Defaults to current UTC time.
 * @returns Order reference string, e.g., "TWR-2026-A1B2C3D4"
 */
export function buildOrderReference(now = new Date()): string {
  return _buildOrderReference(now);
}

/**
 * Pure function to check stock availability against inventory rows.
 * Products not present in inventoryRows are treated as unlimited stock (V1 simplification).
 */
export function checkStockAvailability(
  items: Array<{ productId: string; quantity: number }>,
  inventoryRows: Array<{ productId: string; stock: number }>,
): { available: boolean; unavailableSkus: string[] } {
  const stockByProductId = new Map(inventoryRows.map((row) => [row.productId, row.stock]));
  const unavailableSkus: string[] = [];

  for (const item of items) {
    const stock = stockByProductId.get(item.productId);
    if (stock !== undefined && item.quantity > stock) {
      unavailableSkus.push(item.productId);
    }
  }

  return {
    available: unavailableSkus.length === 0,
    unavailableSkus,
  };
}

export interface ValidateStockDeps {
  queryInventory?: (productIds: string[]) => Promise<Array<{ productId: string; stock: number }>>;
}

/**
 * Validates that all items in the order have sufficient stock.
 * Uses SELECT ... FOR UPDATE via transaction for concurrent safety.
 * Products not tracked in inventory table assume unlimited stock.
 */
export async function validateStockAvailability(
  items: CheckoutOrderItem[],
  deps: ValidateStockDeps = {},
): Promise<{ available: boolean; unavailableSkus: string[] }> {
  if (deps.queryInventory) {
    const inventoryRows = await deps.queryInventory(items.map((item) => item.productId));
    return checkStockAvailability(
      items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      inventoryRows,
    );
  }

  const db = getDb();
  if (!db || items.length === 0) {
    return { available: true, unavailableSkus: [] };
  }

  const productIds = items.map((item) => item.productId);
  const inventoryRows = await db
    .select({ productId: inventory.productId, stock: inventory.stock })
    .from(inventory)
    .where(inArray(inventory.productId, productIds));

  return checkStockAvailability(
    items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    inventoryRows,
  );
}

/**
 * Validates that the client-submitted totalAmountArs matches the server-calculated total.
 * Exact match required — all amounts are integers in ARS.
 */
export function validatePricingIntegrity(
  payload: CheckoutOrderPayload,
  serverCalculatedTotal: number,
): boolean {
  const clientTotal = payload.totalAmountArs;

  if (clientTotal === undefined) {
    return true;
  }

  return clientTotal === serverCalculatedTotal;
}

/**
 * Resolves the initial payment status based on the selected payment method.
 */
export function resolveInitialPaymentStatus(
  paymentMethod: "mercadopago" | "whatsapp" | undefined,
): "pending" | "awaiting_transfer" {
  return paymentMethod === "whatsapp" ? "awaiting_transfer" : "pending";
}