# Tasks: Encargue Combo Products

## Phase 1: Schema & Types (Foundation)

- [x] 1.1 Add combo columns to `lib/db/schema.ts`: `comboEligible`, `comboGroup`, `comboPriority`, `comboSourceKey` in `products` table
- [x] 1.2 Extend `lib/catalog/types.ts`: Add `comboEligible`, `comboGroup`, `comboPriority`, `comboSourceKey`, `comboScore` to `Product` interface
- [x] 1.3 Add `comboDiscount` to `orderItems.itemSnapshot` type in `lib/db/schema.ts` line 124-143

## Phase 2: Pricing Engine (Core)

- [x] 2.1 Create `lib/pricing/encargue-combos.ts` with pure `calculateComboPricing()` function per spec REQ-2.3-2.5
- [x] 2.2 RED: Write failing test `lib/pricing/encargue-combos.test.ts` for pairing algorithm (1 top + 1 bottom, 2 tops + 1 bottom, equal prices)
- [x] 2.3 GREEN: Implement pairing logic with TOP_CATEGORIES/BOTTOM_CATEGORIES heuristics and 30% discount on cheaper item
- [x] 2.4 GREEN: Add confidence scoring `calculateComboConfidence()` per spec REQ-3.3

## Phase 3: Importer Inference

- [x] 3.1 Modify `lib/imports/heuristics.ts`: Add `inferComboMetadata()` extracting combo group from album title + product data
- [x] 3.2 Add `comboScore` to `importItems.productData` in `lib/imports/ingestion.ts` during import
- [x] 3.3 RED: Write test for `inferComboMetadata()` with mock Yupoo album title patterns

## Phase 4: Checkout Integration

- [x] 4.1 Extend `lib/orders/checkout.shared.ts`: Add optional `comboDiscount` to `checkoutOrderItemSchema`
- [x] 4.2 Modify `buildOrderPricingSummary()` in `lib/orders/checkout.shared.ts` to consume `calculateComboPricing()`
- [x] 4.3 Modify `lib/payments/mercadopago-preference.ts`: Pass combo discount to MP preference body

## Phase 5: UI Components

- [x] 5.1 Create `components/catalog/combo-rail.tsx` (Server Component) per spec REQ-4.1-4.3
- [x] 5.2 Create `components/catalog/combo-badge.tsx` for listing cards per spec REQ-5.1
- [x] 5.3 Modify cart components to display combo discount line: "Descuento combo: -$X.XXX"
- [x] 5.4 Modify `components/admin/imports-review-client.tsx`: Show `comboScore` and allow manual override per spec REQ-7.1

## Phase 6: Verification

- [ ] 6.1 E2E: Add Playwright test for cart → checkout showing combo discount persists
- [x] 6.2 Integration: Verify order `itemSnapshot` contains `comboDiscount` metadata
- [x] 6.3 Verify all pricing consumers (cart, checkout, MP, orders) show identical totals via engine

## Phase 7: Verify-driven Spec Gaps (follow-up)

- [x] 7.1 Homepage combo hero support + `app/encargue/combos/page.tsx` landing with SEO metadata
- [x] 7.2 PDP/listing/cart combo merchandising details: paired tooltip, pair pricing copy, real "Agregar ambos" action, and cart trigger line
- [x] 7.3 Import inference fallback: brand+season grouping when explicit/album markers are missing
- [x] 7.4 Runtime DB compatibility fallback for missing `products.combo_*` columns
- [ ] 7.5 Admin order combo breakdown view (blocked: no admin order-detail surface exists yet in current architecture)
