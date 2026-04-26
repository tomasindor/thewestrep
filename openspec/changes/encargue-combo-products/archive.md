# Archive: encargue-combo-products

**Change ID**: encargue-combo-products  
**Status**: ✅ ARCHIVED  
**Archived**: 2026-04-18  
**Mode**: Strict TDD + Hybrid Persistence

---

## Executive Summary

Implemented automatic combo promotions for `encargue` garments where:
- Valid pair: 1 pantalón (bottom) + 1 campera/buzo (top)
- Benefit: 30% OFF cheapest item in each valid pair
- Scope: Only `encargue` catalog products
- No bundle SKU, no manual admin maintenance
- Eligibility derived automatically from scraper/importer inference

**Result**: Core pricing engine is pure, centralized, and verified (58/58 tests pass). E2E test exists but fails due to environment constraints (missing DB migration, Chromium deps), not code defects.

---

## Artifacts Archived

| Artifact | Location | Status |
|----------|----------|--------|
| Exploration | `openspec/changes/encargue-combo-products/exploration.md` | ✅ |
| Proposal | `openspec/changes/encargue-combo-products/proposal.md` | ✅ |
| Spec | `openspec/changes/encargue-combo-products/spec.md` | ✅ |
| Design | `openspec/changes/encargue-combo-products/design.md` | ✅ |
| Tasks | `openspec/changes/encargue-combo-products/tasks.md` | ✅ |
| Apply Progress | `openspec/changes/encargue-combo-products/apply-progress.md` | ✅ |
| Verify Report | `openspec/changes/encargue-combo-products/verify-report.md` | ✅ |
| Engram Context | `sdd/encargue-combo-products/*` | ✅ |

---

## Implementation Summary

### Completed (17/18 tasks)

**Phase 1: Schema & Types** ✅
- Added `combo_eligible`, `combo_group`, `combo_priority`, `combo_source_key` columns
- Extended `Product` type with combo metadata
- Added `comboDiscount` to `orderItems.itemSnapshot`

**Phase 2: Pricing Engine** ✅
- Created `lib/pricing/encargue-combos-core.ts` (pure function)
- Implemented pairing algorithm: group → separate tops/bottoms → sort by price → pair by rank → 30% off lower
- Added confidence scoring for importer inference
- All tests passing (5/5 test cases)

**Phase 3: Importer Inference** ✅
- Added `inferComboMetadata()` in `lib/imports/heuristics.ts`
- Implemented confidence scoring (0.0-1.0)
- High confidence (0.8+): auto-promote
- Medium confidence (0.5-0.79): flag for review
- Low confidence (<0.5): no merchandising
- Brand+season fallback implemented

**Phase 4: Checkout Integration** ✅
- Extended checkout schema with combo fields
- Wired `buildOrderPricingSummary()` to combo engine
- Mercado Pago preference includes combo discount line
- Order persistence includes `itemSnapshot.comboDiscount`

**Phase 5: UI Components** ✅
- Created `ComboRail` server component for PDP
- Created `ComboBadge` for listing cards
- Cart shows "Descuento combo" line
- Admin review shows combo score + manual override controls
- Homepage combo hero implemented
- `/encargue/combos` landing page created

**Phase 6: Verification** ⚠️
- 6.1 E2E test written but fails due to environment (missing DB columns, Chromium deps)
- 6.2 Order snapshot persistence ✅ proven
- 6.3 No-drift across consumers ✅ proven

**Phase 7: Follow-up (implemented after initial verify)** ✅
- Homepage combo hero
- `/encargue/combos` landing with SEO metadata
- PDP rail paired pricing breakdown
- Cart combo trigger lines
- Brand+season inference fallback
- Schema compatibility fallback for missing DB columns

### Incomplete / Follow-ups

| Task | Status | Reason |
|------|--------|--------|
| 6.1 E2E runtime proof | 🚫 Environmental block | Requires DB migration + Chromium |
| REQ-7.2 Admin order detail | ❌ Not implemented | Missing admin order detail architecture |
| REQ-7.3 Analytics events | ⚠️ Implemented, not tested | `lib/analytics/combo-events.ts` exists |

---

## Test Results

### Combo-Focused Verification Batch
```bash
node --import ./tests/node-test-register.mjs --test \
  tests/unit/encargue-combo-foundation.test.ts \
  tests/unit/import-ingestion.test.ts \
  tests/unit/import-promotion.test.ts \
  tests/unit/lib/imports/combo-heuristics.test.ts \
  tests/unit/lib/pricing/encargue-combos.test.ts \
  tests/unit/order-checkout.test.ts \
  tests/unit/order-combo-consistency.test.ts \
  tests/unit/mercadopago-checkout.test.ts \
  tests/unit/app/api/admin/imports.route.test.ts
```
**Result**: ✅ 58/58 passing

### Full Suite
- **170 passed / 1 failed** (pre-existing `csrf-middleware.test.ts` failure unrelated to combo change)
- **Typecheck**: ✅ Passed
- **Coverage**: 66.15% average on changed implementation files

---

## Files Changed

### New Files
- `lib/pricing/encargue-combos-core.ts` (pure pricing engine)
- `lib/pricing/encargue-combos.ts` (server-only wrapper)
- `lib/analytics/combo-events.ts`
- `lib/db/products-schema-compat.ts`
- `components/catalog/combo-rail.tsx`
- `components/catalog/combo-badge.tsx`
- `components/catalog/combo-add-to-cart-button.tsx`
- `app/encargue/combos/page.tsx`
- `tests/unit/lib/pricing/encargue-combos.test.ts`
- `tests/unit/lib/imports/combo-heuristics.test.ts`
- `tests/unit/order-combo-consistency.test.ts`
- `tests/e2e/checkout-combo.spec.ts`

### Modified Files
- `lib/db/schema.ts`
- `lib/catalog/types.ts`
- `lib/catalog/repository.ts`
- `lib/catalog/selectors.ts`
- `lib/catalog/models.ts`
- `lib/imports/heuristics.ts`
- `lib/imports/promotion.ts`
- `lib/imports/curation.ts`
- `lib/imports/ingestion.ts`
- `lib/imports/curation.ts`
- `lib/imports/admin-imports-route-handlers.ts`
- `lib/orders/checkout.shared.ts`
- `lib/orders/repository.ts`
- `lib/payments/mercadopago-preference.ts`
- `lib/cart/types.ts`
- `components/cart/cart-drawer.tsx`
- `components/cart/order-summary-sidebar.tsx`
- `components/catalog/product-detail-page.tsx`
- `components/catalog/product-card.tsx`
- `components/catalog/product-grid.tsx`
- `components/marketing/homepage.tsx`
- `hooks/use-checkout-controller.ts`
- `components/cart/checkout-experience.tsx`

---

## Deployment Notes

### Prerequisites
1. **DB Migration Required**: Before deploying to production, run:
   ```sql
   ALTER TABLE products ADD COLUMN IF NOT EXISTS combo_eligible BOOLEAN DEFAULT false;
   ALTER TABLE products ADD COLUMN IF NOT EXISTS combo_group TEXT;
   ALTER TABLE products ADD COLUMN IF NOT EXISTS combo_priority INTEGER;
   ALTER TABLE products ADD COLUMN IF NOT EXISTS combo_source_key TEXT;
   ```

2. **Environment Variables**: No new env vars required.

3. **Post-Deploy Verification**:
   - Import a Yupoo album with lookbook-style title (e.g., "Look 1 + 2")
   - Promote to catalog
   - Verify both products have `combo_eligible = true` and correct `combo_group`
   - Add one top + one bottom to cart
   - Verify 30% discount applied to cheaper item

### Known Limitations
1. **E2E Test**: The Playwright test (`tests/e2e/checkout-combo.spec.ts`) will fail until:
   - DB migration is applied to runtime environment
   - Chromium dependencies are installed (`libnspr4.so`)

2. **Admin Order Detail**: REQ-7.2 (admin order combo breakdown) cannot be implemented until an admin order detail surface exists in the codebase.

3. **Analytics Events**: Combo events are implemented in `lib/analytics/combo-events.ts` but not yet wired to production analytics pipeline.

---

## Spec Compliance Summary

| Requirement | Status | Notes |
|-------------|--------|-------|
| REQ-1: Product metadata | ✅ Complete | Schema, types, repository all updated |
| REQ-2: Centralized pricing | ✅ Complete | Pure engine, tested, no drift |
| REQ-3: Importer inference | ✅ Complete | Confidence scoring + admin override |
| REQ-4: PDP merchandising | ✅ Complete | Rail, badge, paired pricing |
| REQ-5: Listing/home/landing | ✅ Complete | Badge, hero, landing page |
| REQ-6: Cart/checkout/MP/order | ✅ Complete | All consumers use same engine |
| REQ-7: Auditing/internal | ⚠️ Partial | Admin review exists; order detail missing |

**Overall Compliance**: 20/21 scenarios compliant (95%)

---

## Next Steps / Follow-ups

1. **Apply DB migration** to runtime environment
2. **Document** the combo system for ops team
3. **Implement admin order detail** surface (separate change)
4. **Wire analytics events** to production pipeline
5. **Add runtime E2E tests** once environment is ready

---

## Archive Decision

**Decision**: ✅ **ARCHIVED WITH CAVEATS**

**Justification**:
- Core functionality (pricing engine, inference, persistence chain) is fully implemented and verified
- E2E failure is environmental, not a code defect
- Missing items (admin order detail) are blocked by architecture gaps, not bugs
- No critical security or correctness issues found
- Follow-ups are documented and can be addressed in separate changes

**Archived by**: SDD Archive (Automated)  
**Date**: 2026-04-18  
**Engram Topic**: `sdd/encargue-combo-products/archive`
