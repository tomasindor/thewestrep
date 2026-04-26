## Implementation Progress

**Change**: encargue-combo-products  
**Mode**: Strict TDD (Node test runner)

### Completed Tasks
- [x] 1.1–1.3 Schema/type foundations for combo metadata and order snapshot comboDiscount
- [x] 2.1–2.4 Centralized combo pricing engine + confidence scoring with RED/GREEN tests
- [x] 3.1–3.3 Importer combo inference + comboScore persistence + heuristic tests
- [x] 4.1–4.3 Checkout pricing integration + Mercado Pago combo discount line
- [x] 5.1–5.4 Combo rail, combo badge, cart discount line, admin combo review metadata/override plumbing
- [x] 6.2 Integration proof for persisted `order_items.item_snapshot.comboDiscount`
- [x] 6.3 Cross-consumer no-drift proof across engine/cart/checkout/MP/order persistence rows

### In Progress / Blocked
- [ ] 6.1 E2E cart → checkout combo persistence test execution in CI/runtime

### TDD Cycle Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| Promotion combo propagation | `tests/unit/import-promotion.test.ts` | Unit | ✅ 17/17 baseline | ✅ Added failing assertions for `combo*` fields | ✅ 19/19 after `promotion.ts` updates | ✅ Added incomplete-metadata conservative case | ✅ Extracted parsing defaults (`toIntegerOrNull`) and centralized copy-to-products mapping |
| Typecheck/lint combo scope fixes | `tests/unit/import-ingestion.test.ts`, `tests/unit/imports-e2e-fixtures.test.ts`, `tests/unit/hook-checkout-runtime.test.ts`, `tests/unit/app/api/admin/imports.route.test.ts` | Unit | ✅ 23/23 baseline | ✅ Added stricter checkout schema test | ✅ 23/23 + checkout tests passing after fixes | ✅ Covered both valid + invalid combo discount payload branches | ✅ Replaced `any` with typed unknown/casts and reduced unused-arg noise without behavior drift |
| 6.2 persisted snapshot proof | `tests/unit/order-combo-consistency.test.ts` | Unit/Integration-style | ✅ 8/8 checkout+MP baseline | ✅ New test failed on missing export | ✅ Passing after `buildOrderItemRowsForPersistence` extraction | ✅ Asserts combo + paired product metadata and discounted line total | ✅ Repository create flow now consumes extracted pure row-builder |
| 6.3 no-drift proof | `tests/unit/order-combo-consistency.test.ts` | Unit/Integration-style | ✅ Included in same baseline | ✅ New cross-consumer test authored before helper | ✅ Passing with shared fixture across consumers | ✅ Verifies engine subtotal/discount equals checkout and net product totals match MP + order rows | ✅ Kept helper pure + deterministic for reuse |
| 6.1 E2E combo persistence | `tests/e2e/checkout-combo.spec.ts` | E2E | N/A (new) | ✅ New Playwright spec added first | ⚠️ Execution blocked in environment (`libnspr4.so` missing for Chromium) | ✅ Covers checkout summary + cart drawer combo discount persistence from same cart state | ➖ No refactor needed |

### Test Summary
- **Total tests written/updated**: 5 new assertions/tests + 1 new unit file + 1 new e2e file
- **Total tests passing (focused strict unit batch)**: 53/53
- **Typecheck**: ✅ `npm run typecheck` passing
- **ESLint (changed combo-scope files)**: ✅ passing (`npx eslint` targeted run)
- **Full strict suite**: ⚠️ 170 passed / 1 failed (pre-existing `tests/unit/csrf-middleware.test.ts` importing `next/server`)
- **E2E execution**: ⚠️ blocked by missing system dependency in runtime (`libnspr4.so`)

### Files Changed (this apply batch)
- `lib/imports/promotion.ts`
- `tests/unit/import-promotion.test.ts`
- `lib/imports/curation.ts`
- `lib/imports/ingestion.ts`
- `hooks/use-checkout-controller.ts`
- `tests/unit/imports-e2e-fixtures.test.ts`
- `lib/orders/repository.ts`
- `tests/unit/order-combo-consistency.test.ts`
- `lib/orders/checkout.shared.ts`
- `tests/unit/order-checkout.test.ts`
- `tests/e2e/checkout-combo.spec.ts`
- `openspec/changes/encargue-combo-products/tasks.md`

### Deviations from Design
- None for implemented scope. We preserved the centralized pricing engine contract and server-only boundaries.

### Issues Found
- Playwright cannot launch Chromium in this environment due missing shared library (`libnspr4.so`), so task 6.1 execution proof is blocked despite spec implementation.
- Full strict unit suite still has pre-existing failure in `tests/unit/csrf-middleware.test.ts` from `next/server` import resolution (`next/server.js` hint).

---

## Continued Progress (verify-gap follow-up)

### Completed Tasks
- [x] 7.1 Homepage combo hero + `/encargue/combos` landing + SEO metadata (`Combos Encargue | TheWestRep`)
- [x] 7.2 Merchandising details: PDP pair pricing + real add-both button, listing paired tooltip, cart combo trigger line
- [x] 7.3 Inference fallback: brand+season fallback combo grouping in importer heuristics
- [x] 7.4 Runtime compatibility for missing `products.combo_*` columns (non-destructive, code-level fallback)

### Still Blocked
- [ ] 6.1 E2E execution proof in this environment (Playwright runtime dependency/runtime data constraints)
- [ ] 7.5 Admin order combo breakdown (no admin order detail UI/module exists in current codebase)

### TDD Cycle Evidence (this batch)
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 7.3 brand+season fallback inference | `tests/unit/lib/imports/combo-heuristics.test.ts` | Unit | ✅ 3/3 baseline | ✅ Added failing fallback scenario first | ✅ 4/4 after `inferComboMetadata` fallback implementation | ✅ Explicit group + album group + low-confidence + brand-season paths covered | ✅ Extracted season token parsing helpers to keep function readable |
| 7.1 + 7.2 merchandising/landing proof | `tests/unit/encargue-combo-foundation.test.ts` | Unit (static runtime proof) | ✅ 4/4 baseline | ✅ Added failing assertions for homepage combo hero, landing route metadata, tooltip/cart combo copy | ✅ 4/4 after landing/hero/badge/cart implementation | ✅ Multiple assertions across homepage + landing + badge + cart + PDP wiring | ✅ Added reusable pair-name derivation in `ProductGrid` |
| 7.4 products combo column compatibility | `tests/unit/import-schema-foundation.test.ts` | Unit | ✅ 4/4 baseline | ✅ Added failing tests requiring products schema-compat warning API | ✅ 6/6 after adding `products-schema-compat` + repository fallback query path | ✅ Covered missing-columns warning + all-columns-present no-warning | ✅ Kept compatibility as isolated module mirroring existing schema-compat pattern |

### Test Summary (this batch)
- **Focused strict suite**: ✅ 30/30 passing (`encargue-combo-foundation`, `combo-heuristics`, `encargue-combos`, `order-checkout`, `order-combo-consistency`, `mercadopago-checkout`, `import-schema-foundation`)
- **Typecheck**: ✅ `npm run typecheck`
- **Targeted ESLint on changed files**: ✅ passing

### Files Changed (this batch)
- `app/encargue/combos/page.tsx`
- `components/marketing/homepage.tsx`
- `components/catalog/combo-add-to-cart-button.tsx`
- `components/catalog/combo-rail.tsx`
- `components/catalog/combo-badge.tsx`
- `components/catalog/product-grid.tsx`
- `components/catalog/product-card.tsx`
- `components/cart/cart-drawer.tsx`
- `lib/analytics/combo-events.ts`
- `lib/catalog/models.ts`
- `lib/catalog/selectors.ts`
- `lib/imports/heuristics.ts`
- `lib/db/products-schema-compat.ts`
- `lib/catalog/repository.ts`
- `tests/unit/lib/imports/combo-heuristics.test.ts`
- `tests/unit/encargue-combo-foundation.test.ts`
- `tests/unit/import-schema-foundation.test.ts`
- `openspec/changes/encargue-combo-products/tasks.md`
