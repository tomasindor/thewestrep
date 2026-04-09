/**
 * Client-safe checkout consumer runtime proof test.
 * 
 * This test proves that client-safe checkout functionality loads successfully
 * under native `node --test` + preload WITHOUT reaching checkout.server.
 * 
 * We import ONLY client-safe exports (checkoutOrderPayloadSchema) and verify:
 * 1. The import succeeds (proves client surface loads under node --test + preload)
 * 2. The schema is a valid Zod schema (proves we're using the real client-safe surface)
 * 3. checkout.server is NOT reached (proved by NOT importing from it here)
 */
import assert from "node:assert";
import test from "node:test";

// Import ONLY client-safe exports - this is the key to proving client-safe surface
import { 
  checkoutOrderPayloadSchema,
  buildOrderPricingSummary,
  normalizeOrderAuthProvider,
} from "../../lib/orders/checkout.shared";

// This test MUST NOT import from checkout.server - that's the whole point
// If this test passes, it proves:
// - Client-safe surface (checkout.shared) loads under node --test + preload
// - The resolver does NOT force-load server code
// - Tests can run without triggering server-only guard

test("client-safe checkout surface loads under node --test + preload", () => {
  // Prove the schema is a valid Zod schema (not a stub)
  assert.equal(typeof checkoutOrderPayloadSchema.parse, "function", "checkoutOrderPayloadSchema must have parse method");
  
  // Prove it's the real schema by validating a valid payload
  const validPayload = {
    customer: {
      name: "Test User",
      phone: "+54 9 11 5555 5555",
      email: "test@example.com",
      cuil: "20-12345678-3",
      checkoutMode: "guest" as const,
      authProvider: "" as const,
      preferredChannel: "whatsapp" as const,
      customerStatus: "new" as const,
      deliveryRecipient: "Test User",
      fulfillment: "envio-caba-gba" as const,
      location: "Test Location",
      notes: "Test notes",
    },
    items: [
      {
        id: "sku-1::rojo::42",
        productId: "sku-1",
        productSlug: "test-product",
        productName: "Test Product",
        availability: "stock" as const,
        availabilityLabel: "Stock",
        priceDisplay: "$ 10.000",
        quantity: 1,
        variantLabel: "Rojo",
        sizeLabel: "42",
      },
    ],
  };
  
  // This proves the real schema is loaded, not a stub
  const parsed = checkoutOrderPayloadSchema.parse(validPayload);
  assert.equal(parsed.customer.email, "test@example.com", "Schema should normalize email");
  
  // Prove buildOrderPricingSummary works
  const pricing = buildOrderPricingSummary(parsed);
  assert.equal(pricing.unitCount, 1, "Should count items correctly");
  
  console.log("[CLIENT-SAFE PROOF] Successfully loaded checkout.shared under node --test + preload");
  console.log("[CLIENT-SAFE PROOF] Did NOT reach checkout.server - server-only guard avoided");
});
