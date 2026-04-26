## Verification Report

**Change**: encargue-combo-products  
**Version**: N/A  
**Mode**: Strict TDD

---

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 18 |
| Tasks complete | 17 |
| Tasks incomplete | 1 |

Incomplete tasks:
- [ ] 6.1 E2E: Add Playwright test for cart → checkout showing combo discount persists

Apply evidence now matches the task file for 6.2 and 6.3, but 6.1 is still open because the authored Playwright proof is failing in execution.

---

### Build & Tests Execution

**Build**: ➖ Skipped
```text
Skipped intentionally. Repo rule in AGENTS.md says: "Never build after changes."
```

**Type Check**: ✅ Passed
```text
Command: npm run typecheck
Result: success
```

**Tests (strict unit runner)**: ❌ 170 passed / ❌ 1 failed / ⚠️ 0 skipped
```text
Command: node --import ./tests/node-test-register.mjs --test "tests/unit/**/*.test.ts"

Failing test:
- tests/unit/csrf-middleware.test.ts
  Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/home/gonzalo/projects/thewestrep/node_modules/next/server' imported from /home/gonzalo/projects/thewestrep/proxy.ts
  Did you mean to import "next/server.js"?
```

**Tests (combo-focused verification batch)**: ✅ 57 passed / ❌ 0 failed / ⚠️ 0 skipped
```text
Command: node --import ./tests/node-test-register.mjs --test tests/unit/encargue-combo-foundation.test.ts tests/unit/import-ingestion.test.ts tests/unit/import-promotion.test.ts tests/unit/lib/imports/combo-heuristics.test.ts tests/unit/lib/pricing/encargue-combos.test.ts tests/unit/order-checkout.test.ts tests/unit/order-combo-consistency.test.ts tests/unit/mercadopago-checkout.test.ts tests/unit/app/api/admin/imports.route.test.ts
```

**Tests (Playwright E2E)**: ❌ 0 passed / ❌ 1 failed / ⚠️ 0 skipped
```text
Command: npm run e2e -- tests/e2e/checkout-combo.spec.ts

Failure:
- tests/e2e/checkout-combo.spec.ts > keeps combo discount visible between checkout summary and cart drawer
  Expected heading /cerrá tu pedido sin salir del storefront/i was not found.
  Current checkout hero copy is "Revisá tu pedido y coordiná la entrega."

Runtime note:
- The Playwright web server fell back to demo catalog data because the runtime DB does not yet have products.combo_* columns.
```

**Coverage**: 65.01% total / threshold: 0% → ✅ Above configured threshold
```text
Command: node --experimental-test-coverage --import ./tests/node-test-register.mjs --test tests/unit/encargue-combo-foundation.test.ts tests/unit/import-ingestion.test.ts tests/unit/import-promotion.test.ts tests/unit/lib/imports/combo-heuristics.test.ts tests/unit/lib/pricing/encargue-combos.test.ts tests/unit/order-checkout.test.ts tests/unit/order-combo-consistency.test.ts tests/unit/mercadopago-checkout.test.ts tests/unit/app/api/admin/imports.route.test.ts
Measured changed-file average (implementation files only): 66.15%
```

---

### TDD Compliance
| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | `apply-progress.md` includes the required TDD Cycle Evidence table |
| All tasks have tests | ✅ | 5/5 rows in the evidence table map to real test files |
| RED confirmed (tests exist) | ✅ | 5/5 reported test files exist |
| GREEN confirmed (tests pass) | ❌ | 4/5 pass now; the Playwright combo flow still fails |
| Triangulation adequate | ⚠️ | Core pricing and persistence have multiple cases, but several product scenarios still have no distinct passing runtime proof |
| Safety Net for modified files | ✅ | Baselines were reported for modified files; the E2E spec is correctly marked as new |

**TDD Compliance**: 4/6 checks passed

---

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 55 | 8 | node:test + assert |
| Integration | 2 | 1 | node:test + assert |
| E2E | 1 | 1 | Playwright |
| **Total** | **58** | **10** | |

---

### Changed File Coverage
| File | Line % | Branch % | Uncovered Lines | Rating |
|------|--------|----------|-----------------|--------|
| `lib/imports/promotion.ts` | 83.01% | 72.41% | 224, 228-229, 243-270, 349-350, 382-383, 425-426, 465-486, 795-828, 921-939, 967-1268 | ⚠️ Acceptable |
| `lib/imports/curation.ts` | 26.90% | 100.00% | 52-65, 68-87, 98-146, 174-229, 232-368 | ⚠️ Low |
| `lib/imports/ingestion.ts` | 70.38% | 72.94% | 102-103, 127-134, 171-194, 203-204, 228-338, 345-346, 357-358, 379-380, 436-446, 468-469, 491-492, 531-537, 561-563 | ⚠️ Low |
| `hooks/use-checkout-controller.ts` | — | — | Not exercised by runtime coverage batch | ⚠️ Unverified |
| `lib/orders/repository.ts` | 39.58% | 70.00% | 72-80, 82-97, 100-148, 203-331 | ⚠️ Low |
| `lib/orders/checkout.shared.ts` | 77.03% | 78.79% | 106-107, 122-123, 179, 222-296 | ⚠️ Low |
| `lib/payments/mercadopago-preference.ts` | 100.00% | 73.33% | — | ✅ Excellent |
| `components/catalog/combo-rail.tsx` | — | — | Not exercised by runtime coverage batch | ⚠️ Unverified |
| `components/catalog/combo-badge.tsx` | — | — | Not exercised by runtime coverage batch | ⚠️ Unverified |
| `components/admin/imports-review-client.tsx` | — | — | Not exercised by runtime coverage batch | ⚠️ Unverified |

**Average changed file coverage**: 66.15% across measured implementation files

---

### Assertion Quality
**Assertion quality**: ✅ All reviewed combo-related assertions verify real behavior or meaningful structural boundaries

---

### Quality Metrics
**Linter**: ✅ No errors on targeted combo files  
**Type Checker**: ✅ No errors

---

### Spec Compliance Matrix

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| REQ-1.1 / REQ-1.4 | Products schema and `Product` type expose combo fields | `tests/unit/encargue-combo-foundation.test.ts > products schema exposes combo metadata columns`; `catalog Product type declares combo fields` | ✅ COMPLIANT |
| REQ-1.3 | Eligibility rules enforce published encargue-only combo participation | (none found) | ❌ UNTESTED |
| REQ-1.2 / REQ-3.2 | Import items persist inferred combo metadata and `comboScore` | `tests/unit/import-ingestion.test.ts > ingestYupooSource persists inferred combo metadata and comboScore in productData`; `tests/unit/import-promotion.test.ts > promoteImportItem propagates combo metadata from staging into created products` | ✅ COMPLIANT |
| REQ-2.2 | Engine applies 30% discount to the cheaper item for 1 top + 1 bottom | `tests/unit/lib/pricing/encargue-combos.test.ts > calculateComboPricing applies 30% discount to cheaper item for 1 top + 1 bottom` | ✅ COMPLIANT |
| REQ-2.2 | Engine pairs by rank and stays deterministic on equal prices | `tests/unit/lib/pricing/encargue-combos.test.ts > calculateComboPricing pairs by rank for 2 tops + 1 bottom`; `... keeps deterministic discount target on equal prices` | ✅ COMPLIANT |
| REQ-2.5 | Order item snapshots persist `comboDiscount` metadata | `tests/unit/order-combo-consistency.test.ts > order item snapshots persist comboDiscount metadata with pair reference` | ✅ COMPLIANT |
| REQ-3.1 | High-confidence inference from album titles and explicit markers | `tests/unit/lib/imports/combo-heuristics.test.ts > inferComboMetadata extracts group from lookbook-style album title`; `... prefers explicit combo_group from product data` | ✅ COMPLIANT |
| REQ-3.1 | Brand + season fallback inference exists when explicit/album signals are missing | (none found) | ❌ UNTESTED |
| REQ-3.4 / REQ-7.1 | Low-confidence combos stay non-eligible and remain visible with admin controls | `tests/unit/lib/imports/combo-heuristics.test.ts > ... keeps low confidence combos non-eligible for merchandising`; `tests/unit/app/api/admin/imports.route.test.ts > GET returns product-centric queue ...` | ⚠️ PARTIAL |
| REQ-4.1 / REQ-4.3 | PDP rail renders combo merchandising for eligible/high-confidence products | `tests/unit/encargue-combo-foundation.test.ts > merchandising surfaces wire combo components` | ⚠️ PARTIAL |
| REQ-4.1 / REQ-4.3 | Rail shows paired-product pricing and a real “Agregar ambos al carrito” action | (none found) | ❌ UNTESTED |
| REQ-4.4 / REQ-6.1 | Cart → checkout keeps combo discount visible at runtime | `tests/e2e/checkout-combo.spec.ts > keeps combo discount visible between checkout summary and cart drawer` | ❌ FAILING |
| REQ-6.1 | Cart shows which products triggered the combo discount | (none found) | ❌ UNTESTED |
| REQ-5.1 | Listing cards show combo badge with paired-product tooltip | `tests/unit/encargue-combo-foundation.test.ts > merchandising surfaces wire combo components` | ⚠️ PARTIAL |
| REQ-5.2 / REQ-5.3 / REQ-5.4 | Homepage hero, combos landing page, and landing SEO metadata exist | (none found) | ❌ UNTESTED |
| REQ-6.2 | Checkout schema and pricing summary consume combo engine output | `tests/unit/order-checkout.test.ts > applies combo pricing in checkout summary when top+bottom pair exists`; `... requires pairedWithProductId when comboDiscount metadata is provided` | ✅ COMPLIANT |
| REQ-6.3 | Mercado Pago preference carries combo discount as a separate concept | `tests/unit/mercadopago-checkout.test.ts > builds Mercado Pago preference body with order items and fees` | ⚠️ PARTIAL |
| REQ-6.4 | Persisted orders keep discounted line totals, item snapshot metadata, and order pricing snapshot | `tests/unit/order-combo-consistency.test.ts > order item snapshots persist comboDiscount metadata with pair reference` | ⚠️ PARTIAL |
| REQ-6.5 | Engine, checkout, Mercado Pago, and order rows keep identical totals | `tests/unit/order-combo-consistency.test.ts > cart/checkout/mercadopago/order consumers keep identical combo math` | ⚠️ PARTIAL |
| REQ-7.2 | Admin order detail shows combo discount breakdown and paired-product link | (none found) | ❌ UNTESTED |
| REQ-7.3 | Analytics events exist for combo view/add/apply | (none found) | ❌ UNTESTED |

**Compliance summary**: 7/21 scenarios compliant

---

### Correctness (Static — Structural Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| REQ-1 Product metadata & eligibility | ⚠️ Partial | Schema/types and promotion propagation exist, but published/type gating is not directly verified and migration rollout evidence is still missing |
| REQ-2 Centralized pricing engine | ✅ Implemented | Pure pricing logic lives in `lib/pricing/encargue-combos-core.ts`; server-only boundary remains in `lib/pricing/encargue-combos.ts` |
| REQ-3 Importer/scraper inference | ⚠️ Partial | Explicit group + album-title inference + confidence scoring exist, but brand+season fallback and confidence-breakdown visibility are missing |
| REQ-4 PDP/cart merchandising | ⚠️ Partial | Rail wiring and combo discount display exist, but paired-price presentation, real add-both action, and in-cart combo trigger copy are incomplete/unproven |
| REQ-5 Listing/home/landing merchandising | ⚠️ Partial | Listing badge exists, but homepage hero, combos landing page, and SEO metadata are absent |
| REQ-6 Cart/checkout/MP/order consistency | ⚠️ Partial | Checkout, MP, repository helpers, and no-drift unit proof exist, but E2E proof still fails and MP shape deviates from the written spec |
| REQ-7 Auditing/internal visibility | ⚠️ Partial | Imports review exposes score/override plumbing, but confidence breakdown, admin order combo breakdown, and analytics events are absent |

---

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| Centralized pure pricing engine | ✅ Yes | Pure pricing engine is reused by checkout and cross-consumer tests |
| Combo metadata storage on products/imports | ✅ Yes | Metadata now persists in staging and promotion copies it into product creation input |
| Auditable order snapshots | ✅ Yes | Repository rows keep line totals and `itemSnapshot.comboDiscount`; order `pricingSnapshot.comboDiscountAmountArs` is written statically |
| File changes align with design intent | ⚠️ Deviated | Core pricing/import/checkout/admin files changed as planned, but homepage/landing/order-admin artifacts from the design are still missing |

---

### Issues Found

**CRITICAL** (must fix before archive):
- Task 6.1 is still open: the authored Playwright proof fails, so cart → checkout combo persistence is not behaviorally proven.
- REQ-3.1 is still incomplete: brand+season fallback inference is not implemented/proven.
- REQ-4 / REQ-6.1 are still incomplete: the rail does not prove paired-price presentation or a real “Agregar ambos al carrito” flow, and the cart does not prove the required combo trigger line (`Combo: [Top] + [Bottom]`).
- REQ-5.2 / REQ-5.3 / REQ-5.4 remain missing: homepage combo hero, combos landing page, and landing SEO metadata were not found.
- REQ-7.2 / REQ-7.3 remain missing: admin order combo breakdown and analytics events were not found.
- Runtime rollout evidence is incomplete: the Playwright server reported that the DB backing the runtime does not yet have `products.combo_*` columns.

**WARNING** (should fix):
- REQ-7.1 is only partially satisfied: admin review shows `comboScore` and manual overrides, but no confidence breakdown explaining why the score is X.
- Mercado Pago uses a negative `items[]` row (`combo-discount`) instead of the spec’s explicit `discounts` shape.
- Listing badge tooltip remains generic (`"su par del look"`) instead of naming the paired product.
- Changed-file runtime coverage is low or unverified in `lib/imports/curation.ts`, `lib/imports/ingestion.ts`, `lib/orders/repository.ts`, `lib/orders/checkout.shared.ts`, `hooks/use-checkout-controller.ts`, `components/catalog/combo-rail.tsx`, `components/catalog/combo-badge.tsx`, and `components/admin/imports-review-client.tsx`.

**SUGGESTION** (nice to have):
- Update the Playwright spec to assert current checkout copy and then keep the combo assertions; right now it fails before reaching the business checks.
- Add focused UI/integration tests for the PDP rail, listing tooltip copy, and cart combo-trigger messaging.
- Add persistence-level verification for `orders.pricing_snapshot` after the DB migration is applied.

**Environment / Pre-existing issues**:
- The full strict unit command still fails on unrelated repo-wide test `tests/unit/csrf-middleware.test.ts` because `proxy.ts` imports `next/server` instead of `next/server.js`. This is outside the combo change scope but still keeps the global suite red.

---

### Verdict
FAIL

The change is NOT ready to archive. Core combo pricing/persistence fixes are in much better shape and 6.2/6.3 now verify cleanly, but archive is still blocked by the failing E2E proof plus several spec-required product surfaces and auditing requirements that remain missing.
