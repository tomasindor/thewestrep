# Tasks: checkout-runtime-boundaries

## Phase 1: Boundary foundation

- [x] 1.1 RED — Update `tests/unit/order-checkout.test.ts` to import shared/server modules separately and add failing assertions for shared pricing/profile helpers plus `buildOrderReference()` format.
- [x] 1.2 GREEN — Create `lib/orders/checkout.shared.ts` by moving Zod schemas, types, fulfillment metadata, pricing helpers, labels, and profile patch utilities out of `lib/orders/checkout.ts` with no Node built-ins.
- [x] 1.3 GREEN — Create `lib/orders/checkout.server.ts` with `import "server-only"` and `buildOrderReference()` using `node:crypto`, preserving the `TWR-YYYY-XXXXXXXX` reference contract.
- [x] 1.4 REFACTOR — Delete `lib/orders/checkout.ts` and leave no client-safe export path that can re-expose server-only symbols.

## Phase 2: Client-safe consumer migration

- [x] 2.1 RED — Update imports in `hooks/use-checkout-controller.ts`, `components/cart/fulfillment-section.tsx`, and `components/cart/order-summary-sidebar.tsx` so the old `@/lib/orders/checkout` path breaks during migration.
- [x] 2.2 GREEN — Point those client files to `@/lib/orders/checkout.shared` and keep totals, fulfillment labels, checkout labels, and saved-shipping behavior unchanged.
- [x] 2.3 RED — Add `tests/unit/order-runtime-boundaries.test.ts` that fails until the shared module omits `buildOrderReference` and the server module exports it.
- [x] 2.4 GREEN — Make the new boundary test pass without importing `checkout.server.ts` from any client-marked file.

## Phase 3: Server consumer migration

- [x] 3.1 RED — Update imports in `app/api/orders/route.ts`, `lib/payments/mercadopago-preference.ts`, `lib/payments/mercadopago.ts`, and `lib/orders/repository.ts` so they fail until shared/server paths are explicit.
- [x] 3.2 GREEN — Route payload parsing and Mercado Pago preference builders must import only from `@/lib/orders/checkout.shared`.
- [x] 3.3 GREEN — `lib/orders/repository.ts` must import shared pricing/profile helpers from `checkout.shared` and `buildOrderReference()` from `checkout.server`, preserving unique-reference fallback behavior.
- [x] 3.4 REFACTOR — Run an import sweep and remove every remaining reference to `lib/orders/checkout.ts` across source and tests.

## Phase 4: Verification

- [x] 4.1 Verify `npx tsx tests/unit/order-checkout.test.ts tests/unit/order-runtime-boundaries.test.ts tests/unit/mercadopago-checkout.test.ts` passes after the split. ✅ 11 tests passing
- [x] 4.2 Verify no client file under `components/` or `hooks/` imports `@/lib/orders/checkout.server`. ✅ Verified via grep - no client imports
- [x] 4.3 Verify checkout payload parsing, pricing totals, profile patching, Mercado Pago itemization, and order reference format still match the spec scenarios. ✅ All tests pass
