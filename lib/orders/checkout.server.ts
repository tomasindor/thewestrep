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